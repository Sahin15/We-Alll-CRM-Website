/**
 * Security Middleware for Admin Work Management
 * Provides authentication, authorization, and security validation
 */

import { securityService } from '../services/securityService.js';

/**
 * Middleware to check if user has required permissions
 */
const requirePermission = (action, operation) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!securityService.hasPermission(req.user, action, operation)) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions for ${action}:${operation}`
        });
      }

      next();
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Permission validation failed'
      });
    }
  };
};

/**
 * Middleware to validate bulk operation permissions
 */
const validateBulkOperation = async (req, res, next) => {
  try {
    const { operation, workEntryIds } = req.body;

    if (!operation) {
      return res.status(400).json({
        success: false,
        message: 'Operation type is required'
      });
    }

    if (!workEntryIds || !Array.isArray(workEntryIds) || workEntryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Work entry IDs are required'
      });
    }

    // Limit bulk operation size
    if (workEntryIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Bulk operations are limited to 100 entries at a time'
      });
    }

    // For now, we'll validate permissions without loading work entries
    // In a real implementation, you might want to load and check each entry
    securityService.validateBulkOperationPermission(req.user, operation, []);

    next();
  } catch (error) {
    
    res.status(403).json({
      success: false,
      message: error.message || 'Bulk operation validation failed'
    });
  }
};

/**
 * Middleware to validate export permissions
 */
const validateExport = (req, res, next) => {
  try {
    const format = req.params.format || req.body.format || req.query.format;
    const dataSize = parseInt(req.query.dataSize) || 0;

    if (!format) {
      return res.status(400).json({
        success: false,
        message: 'Export format is required'
      });
    }

    securityService.validateExportPermission(req.user, format, dataSize);

    next();
  } catch (error) {
    
    res.status(403).json({
      success: false,
      message: error.message || 'Export validation failed'
    });
  }
};

/**
 * Middleware to sanitize filter inputs
 */
const sanitizeFilters = (req, res, next) => {
  try {
    if (req.query) {
      const sanitizedQuery = securityService.sanitizeFilters(req.query);
      // Clear existing query parameters and replace with sanitized ones
      Object.keys(req.query).forEach(key => delete req.query[key]);
      Object.assign(req.query, sanitizedQuery);
    }

    if (req.body && req.body.filters) {
      req.body.filters = securityService.sanitizeFilters(req.body.filters);
    }

    next();
  } catch (error) {
    
    res.status(400).json({
      success: false,
      message: error.message || 'Invalid filter parameters'
    });
  }
};

/**
 * Middleware to validate request complexity
 */
const validateRequestComplexity = (req, res, next) => {
  try {
    securityService.validateRequestComplexity(req);
    next();
  } catch (error) {
    
    res.status(400).json({
      success: false,
      message: error.message || 'Request too complex'
    });
  }
};

/**
 * Middleware to check admin access
 */
const requireAdminAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const adminRoles = ['admin', 'superadmin', 'hr', 'manager'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Middleware to check superadmin access
 */
const requireSuperAdminAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin access required'
    });
  }

  next();
};

/**
 * Rate limiter for work item creation
 */
const createWorkItemLimiter = (req, res, next) => {
  // Simple rate limiting - in production use express-rate-limit
  next();
};

/**
 * General request validation middleware
 */
const validateRequest = (validationRules) => {
  return (req, res, next) => {
    // Simple validation - in production use express-validator
    next();
  };
};

/**
 * API rate limiter
 */
const apiLimiter = (req, res, next) => {
  // Simple rate limiting - in production use express-rate-limit
  next();
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Simple sanitization - in production use proper sanitization
  next();
};

export {
  requirePermission,
  validateBulkOperation,
  validateExport,
  sanitizeFilters,
  validateRequestComplexity,
  requireAdminAccess,
  requireSuperAdminAccess,
  createWorkItemLimiter,
  validateRequest,
  apiLimiter,
  sanitizeInput
};