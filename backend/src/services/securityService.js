/**
 * Security Service for Admin Work Management
 * Provides role-based access control, audit logging, and security validation
 * Features:
 * - Role-based permissions for bulk operations
 * - Comprehensive audit logging
 * - Input validation and sanitization
 * - Rate limiting support
 * - Security event monitoring
 */

import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import xss from 'xss';

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
  success: { type: Boolean, default: true },
  errorMessage: { type: String },
  sessionId: { type: String },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  }
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

class SecurityService {
  constructor() {
    this.permissions = {
      // Role-based permissions for different actions
      admin: {
        bulkOperations: ['create', 'update', 'delete', 'reassign', 'updateStatus', 'updateDates'],
        export: ['csv', 'excel', 'pdf'],
        analytics: ['view', 'export'],
        userManagement: ['view', 'create', 'update', 'delete'],
        systemSettings: ['view', 'update']
      },
      superadmin: {
        bulkOperations: ['create', 'update', 'delete', 'reassign', 'updateStatus', 'updateDates'],
        export: ['csv', 'excel', 'pdf'],
        analytics: ['view', 'export'],
        userManagement: ['view', 'create', 'update', 'delete'],
        systemSettings: ['view', 'update'],
        auditLogs: ['view', 'export']
      },
      hr: {
        bulkOperations: ['update', 'reassign', 'updateStatus'],
        export: ['csv', 'excel'],
        analytics: ['view'],
        userManagement: ['view', 'update']
      },
      manager: {
        bulkOperations: ['update', 'updateStatus'],
        export: ['csv'],
        analytics: ['view']
      },
      employee: {
        export: [],
        analytics: []
      }
    };

    this.rateLimits = {
      bulkOperations: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // Limit each IP to 10 bulk operations per windowMs
        message: 'Too many bulk operations, please try again later',
        standardHeaders: true,
        legacyHeaders: false
      }),
      export: rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 5, // Limit each IP to 5 exports per windowMs
        message: 'Too many export requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false
      }),
      analytics: rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30, // Limit each IP to 30 analytics requests per minute
        message: 'Too many analytics requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false
      })
    };
  }

  /**
   * Check if user has permission for specific action
   */
  hasPermission(user, action, operation) {
    if (!user || !user.role) {
      return false;
    }

    const rolePermissions = this.permissions[user.role];
    if (!rolePermissions) {
      return false;
    }

    const actionPermissions = rolePermissions[action];
    if (!actionPermissions) {
      return false;
    }

    return actionPermissions.includes(operation);
  }

  /**
   * Validate bulk operation permissions
   */
  validateBulkOperationPermission(user, operation, workEntries = []) {
    // Check basic permission
    if (!this.hasPermission(user, 'bulkOperations', operation)) {
      throw new Error(`Insufficient permissions for bulk operation: ${operation}`);
    }

    // Additional validation for specific operations
    switch (operation) {
      case 'delete':
        // Only admin and superadmin can delete
        if (!['admin', 'superadmin'].includes(user.role)) {
          throw new Error('Only administrators can perform bulk delete operations');
        }
        break;

      case 'reassign':
        // Check if user can reassign work entries
        if (user.role === 'employee') {
          throw new Error('Employees cannot reassign work entries');
        }
        
        // Managers can only reassign within their department
        if (user.role === 'manager' && workEntries.length > 0) {
          const invalidEntries = workEntries.filter(entry => 
            entry.department && entry.department._id !== user.department
          );
          if (invalidEntries.length > 0) {
            throw new Error('Managers can only reassign work within their department');
          }
        }
        break;

      case 'updateStatus':
        // All roles with bulk permissions can update status
        break;

      case 'updateDates':
        // HR and above can update dates
        if (!['hr', 'manager', 'admin', 'superadmin'].includes(user.role)) {
          throw new Error('Insufficient permissions to update dates');
        }
        break;

      default:
        throw new Error(`Unknown bulk operation: ${operation}`);
    }

    return true;
  }

  /**
   * Validate export permissions
   */
  validateExportPermission(user, format, dataSize = 0) {
    if (!this.hasPermission(user, 'export', format)) {
      throw new Error(`Insufficient permissions for ${format} export`);
    }

    // Additional restrictions based on role and data size
    if (user.role === 'manager' && dataSize > 1000) {
      throw new Error('Managers are limited to exports of 1000 entries or less');
    }

    if (user.role === 'hr' && format === 'pdf' && dataSize > 500) {
      throw new Error('HR users are limited to PDF exports of 500 entries or less');
    }

    return true;
  }

  /**
   * Sanitize and validate filter inputs
   */
  sanitizeFilters(filters) {
    const sanitized = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) {
        continue;
      }

      switch (key) {
        case 'search':
          // Sanitize search terms
          sanitized[key] = this.sanitizeSearchTerm(value);
          break;

        case 'startDate':
        case 'endDate':
          // Validate dates
          if (validator.isISO8601(value)) {
            sanitized[key] = value;
          } else {
            throw new Error(`Invalid date format for ${key}: ${value}`);
          }
          break;

        case 'client':
        case 'project':
        case 'employee':
        case 'department':
          // Validate ObjectIds or 'all'
          if (value === 'all' || mongoose.Types.ObjectId.isValid(value)) {
            sanitized[key] = value;
          } else {
            throw new Error(`Invalid ID format for ${key}: ${value}`);
          }
          break;

        case 'status':
        case 'priority':
        case 'workType':
          // Validate enum values
          sanitized[key] = this.sanitizeEnumValue(key, value);
          break;

        case 'page':
        case 'limit':
          // Validate numeric values
          const numValue = parseInt(value);
          if (isNaN(numValue) || numValue < 1) {
            throw new Error(`Invalid numeric value for ${key}: ${value}`);
          }
          sanitized[key] = Math.min(numValue, key === 'limit' ? 1000 : 10000); // Limit max values
          break;

        case 'sortBy':
          // Validate sort field
          sanitized[key] = this.sanitizeSortField(value);
          break;

        case 'sortOrder':
          // Validate sort order
          if (['asc', 'desc'].includes(value)) {
            sanitized[key] = value;
          } else {
            throw new Error(`Invalid sort order: ${value}`);
          }
          break;

        default:
          // For unknown fields, apply basic sanitization
          if (typeof value === 'string') {
            sanitized[key] = xss(value.trim());
          } else {
            sanitized[key] = value;
          }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize search terms to prevent injection attacks
   */
  sanitizeSearchTerm(searchTerm) {
    if (typeof searchTerm !== 'string') {
      throw new Error('Search term must be a string');
    }

    // Light sanitization - remove dangerous patterns but keep normal punctuation
    let sanitized = searchTerm;

    // Remove potential MongoDB injection patterns
    sanitized = sanitized.replace(/[\$\{\}]/g, '');

    // Remove script tags and dangerous HTML
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Limit length
    sanitized = sanitized.substring(0, 200);

    // Remove excessive whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    return sanitized;
  }

  /**
   * Light sanitization for client data (names, addresses, etc.)
   * Removes dangerous content but preserves normal punctuation
   */
  sanitizeClientData(value) {
    if (typeof value !== 'string') return value;

    let sanitized = value;

    // Remove script tags and dangerous HTML
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove potential MongoDB injection patterns
    sanitized = sanitized.replace(/[\$\{\}]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Sanitize enum values
   */
  sanitizeEnumValue(field, value) {
    const allowedValues = {
      status: ['all', 'scheduled', 'in-progress', 'completed', 'overdue', 'cancelled'],
      priority: ['all', 'low', 'medium', 'high', 'urgent'],
      workType: ['all', 'development', 'design', 'testing', 'documentation', 'meeting', 'research']
    };

    const allowed = allowedValues[field];
    if (!allowed || !allowed.includes(value)) {
      throw new Error(`Invalid value for ${field}: ${value}`);
    }

    return value;
  }

  /**
   * Sanitize sort field to prevent injection
   */
  sanitizeSortField(field) {
    const allowedSortFields = [
      'title', 'status', 'priority', 'startDate', 'dueDate', 'completionPercentage',
      'client.name', 'project.name', 'assignedTo.name', 'department.name',
      'timeTracking.estimatedHours', 'timeTracking.actualHours', 'workloadImpact'
    ];

    if (!allowedSortFields.includes(field)) {
      throw new Error(`Invalid sort field: ${field}`);
    }

    return field;
  }

  /**
   * Log audit event
   */
  async logAuditEvent(eventData) {
    try {
      const auditLog = new AuditLog({
        userId: eventData.userId,
        action: eventData.action,
        resource: eventData.resource,
        resourceId: eventData.resourceId,
        details: eventData.details,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        success: eventData.success !== false,
        errorMessage: eventData.errorMessage,
        sessionId: eventData.sessionId,
        severity: eventData.severity || 'medium'
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters = {}, user) {
    // Only superadmin can view audit logs
    if (user.role !== 'superadmin') {
      throw new Error('Insufficient permissions to view audit logs');
    }

    const query = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.resource) {
      query.resource = filters.resource;
    }

    if (filters.severity) {
      query.severity = filters.severity;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Create audit middleware for Express routes
   */
  createAuditMiddleware(action, resource) {
    return async (req, res, next) => {
      const originalSend = res.send;
      const startTime = Date.now();

      res.send = function(data) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Log the audit event
        setImmediate(async () => {
          try {
            await securityService.logAuditEvent({
              userId: req.user?._id,
              action,
              resource,
              resourceId: req.params.id || req.body?.id,
              details: {
                method: req.method,
                url: req.originalUrl,
                body: req.method !== 'GET' ? req.body : undefined,
                query: req.query,
                duration,
                statusCode: res.statusCode
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              sessionId: req.sessionID,
              success,
              errorMessage: success ? undefined : (typeof data === 'string' ? data : 'Operation failed'),
              severity: success ? 'low' : (res.statusCode >= 500 ? 'high' : 'medium')
            });
          } catch (error) {
            
          }
        });

        originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Get rate limiter for specific action
   */
  getRateLimiter(action) {
    return this.rateLimits[action] || this.rateLimits.analytics;
  }

  /**
   * Validate request size and complexity
   */
  validateRequestComplexity(req) {
    // Check request body size
    const bodySize = JSON.stringify(req.body || {}).length;
    if (bodySize > 1024 * 1024) { // 1MB limit
      throw new Error('Request body too large');
    }

    // Check query complexity
    const queryParams = Object.keys(req.query || {}).length;
    if (queryParams > 50) {
      throw new Error('Too many query parameters');
    }

    // Check for potential DoS patterns
    if (req.body && typeof req.body === 'object') {
      const checkDepth = (obj, depth = 0) => {
        if (depth > 10) {
          throw new Error('Request object too deeply nested');
        }
        
        for (const value of Object.values(obj)) {
          if (typeof value === 'object' && value !== null) {
            checkDepth(value, depth + 1);
          }
        }
      };

      checkDepth(req.body);
    }

    return true;
  }
}

// Create singleton instance
const securityService = new SecurityService();

export { securityService, AuditLog };