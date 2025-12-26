import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { securityService, AuditLog } from '../src/services/securityService.js';
import User from '../src/models/User.js';

/**
 * Security Tests for Access Control
 * 
 * **Feature: admin-work-management-enhancement, Task 11.1: Security Tests**
 * 
 * Tests role-based permissions for bulk operations, verifies audit logging captures all actions,
 * and tests input validation and sanitization.
 */

describe('Security and Access Control Tests', () => {
  let adminUser, hrUser, managerUser, employeeUser, superAdminUser;
  let adminToken, hrToken, managerToken, employeeToken, superAdminToken;

  beforeAll(async () => {
    // Create test users with different roles
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      department: new mongoose.Types.ObjectId()
    });

    hrUser = await User.create({
      name: 'HR User',
      email: 'hr@test.com',
      password: 'password123',
      role: 'hr',
      department: new mongoose.Types.ObjectId()
    });

    managerUser = await User.create({
      name: 'Manager User',
      email: 'manager@test.com',
      password: 'password123',
      role: 'manager',
      department: new mongoose.Types.ObjectId()
    });

    employeeUser = await User.create({
      name: 'Employee User',
      email: 'employee@test.com',
      password: 'password123',
      role: 'employee',
      department: new mongoose.Types.ObjectId()
    });

    superAdminUser = await User.create({
      name: 'SuperAdmin User',
      email: 'superadmin@test.com',
      password: 'password123',
      role: 'superadmin',
      department: new mongoose.Types.ObjectId()
    });

    // Generate tokens (mock implementation)
    adminToken = 'admin-token';
    hrToken = 'hr-token';
    managerToken = 'manager-token';
    employeeToken = 'employee-token';
    superAdminToken = 'superadmin-token';
  });

  afterAll(async () => {
    await User.deleteMany({});
    await AuditLog.deleteMany({});
  });

  beforeEach(async () => {
    await AuditLog.deleteMany({});
  });

  /**
   * Test role-based permissions for bulk operations
   */
  describe('Role-Based Permissions for Bulk Operations', () => {
    const mockWorkEntryIds = [
      new mongoose.Types.ObjectId().toString(),
      new mongoose.Types.ObjectId().toString()
    ];

    test('admin can perform all bulk operations', async () => {
      const operations = ['update', 'updateStatus', 'reassign', 'updateDates', 'delete'];
      
      for (const operation of operations) {
        const hasPermission = securityService.hasPermission(adminUser, 'bulkOperations', operation);
        expect(hasPermission).toBe(true);
        
        // Test validation doesn't throw
        expect(() => {
          securityService.validateBulkOperationPermission(adminUser, operation, []);
        }).not.toThrow();
      }
    });

    test('hr user has limited bulk operation permissions', async () => {
      // HR can do these operations
      const allowedOperations = ['update', 'reassign', 'updateStatus'];
      for (const operation of allowedOperations) {
        const hasPermission = securityService.hasPermission(hrUser, 'bulkOperations', operation);
        expect(hasPermission).toBe(true);
      }

      // HR cannot delete
      const hasDeletePermission = securityService.hasPermission(hrUser, 'bulkOperations', 'delete');
      expect(hasDeletePermission).toBe(false);
      
      expect(() => {
        securityService.validateBulkOperationPermission(hrUser, 'delete', []);
      }).toThrow('Only administrators can perform bulk delete operations');
    });

    test('manager has restricted bulk operation permissions', async () => {
      // Manager can do these operations
      const allowedOperations = ['update', 'updateStatus'];
      for (const operation of allowedOperations) {
        const hasPermission = securityService.hasPermission(managerUser, 'bulkOperations', operation);
        expect(hasPermission).toBe(true);
      }

      // Manager cannot delete or update dates
      expect(securityService.hasPermission(managerUser, 'bulkOperations', 'delete')).toBe(false);
      expect(() => {
        securityService.validateBulkOperationPermission(managerUser, 'updateDates', []);
      }).toThrow('Insufficient permissions to update dates');
    });

    test('employee has no bulk operation permissions', async () => {
      const operations = ['update', 'updateStatus', 'reassign', 'updateDates', 'delete'];
      
      for (const operation of operations) {
        const hasPermission = securityService.hasPermission(employeeUser, 'bulkOperations', operation);
        expect(hasPermission).toBe(false);
      }
    });

    test('manager can only reassign within their department', async () => {
      const workEntriesInDepartment = [{
        department: { _id: managerUser.department }
      }];
      
      const workEntriesOutsideDepartment = [{
        department: { _id: new mongoose.Types.ObjectId() }
      }];

      // Should work for entries in same department
      expect(() => {
        securityService.validateBulkOperationPermission(managerUser, 'reassign', workEntriesInDepartment);
      }).not.toThrow();

      // Should fail for entries outside department
      expect(() => {
        securityService.validateBulkOperationPermission(managerUser, 'reassign', workEntriesOutsideDepartment);
      }).toThrow('Managers can only reassign work within their department');
    });
  });

  /**
   * Test export permissions
   */
  describe('Export Permissions', () => {
    test('admin can export all formats', async () => {
      const formats = ['csv', 'excel', 'pdf'];
      
      for (const format of formats) {
        const hasPermission = securityService.hasPermission(adminUser, 'export', format);
        expect(hasPermission).toBe(true);
        
        expect(() => {
          securityService.validateExportPermission(adminUser, format, 5000);
        }).not.toThrow();
      }
    });

    test('hr user has limited export permissions', async () => {
      // HR can export CSV and Excel
      expect(securityService.hasPermission(hrUser, 'export', 'csv')).toBe(true);
      expect(securityService.hasPermission(hrUser, 'export', 'excel')).toBe(true);
      
      // HR cannot export PDF
      expect(securityService.hasPermission(hrUser, 'export', 'pdf')).toBe(false);
      
      // HR has size limits for PDF
      expect(() => {
        securityService.validateExportPermission(hrUser, 'pdf', 1000);
      }).toThrow('Insufficient permissions for pdf export');
    });

    test('manager has size restrictions', async () => {
      // Manager can export CSV
      expect(securityService.hasPermission(managerUser, 'export', 'csv')).toBe(true);
      
      // But has size limits
      expect(() => {
        securityService.validateExportPermission(managerUser, 'csv', 2000);
      }).toThrow('Managers are limited to exports of 1000 entries or less');
    });

    test('employee cannot export', async () => {
      const formats = ['csv', 'excel', 'pdf'];
      
      for (const format of formats) {
        const hasPermission = securityService.hasPermission(employeeUser, 'export', format);
        expect(hasPermission).toBe(false);
      }
    });
  });

  /**
   * Test audit logging captures all actions
   */
  describe('Audit Logging', () => {
    test('audit log is created for successful operations', async () => {
      const auditData = {
        userId: adminUser._id,
        action: 'bulk-operation',
        resource: 'work-entries',
        resourceId: 'bulk-123',
        details: {
          operation: 'updateStatus',
          workEntryIds: ['id1', 'id2'],
          newStatus: 'completed'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        sessionId: 'session-123',
        success: true
      };

      const auditLog = await securityService.logAuditEvent(auditData);
      
      expect(auditLog).toBeTruthy();
      expect(auditLog.userId.toString()).toBe(adminUser._id.toString());
      expect(auditLog.action).toBe('bulk-operation');
      expect(auditLog.resource).toBe('work-entries');
      expect(auditLog.success).toBe(true);
      expect(auditLog.severity).toBe('medium');
    });

    test('audit log is created for failed operations', async () => {
      const auditData = {
        userId: employeeUser._id,
        action: 'bulk-operation',
        resource: 'work-entries',
        details: {
          operation: 'delete',
          workEntryIds: ['id1', 'id2']
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        success: false,
        errorMessage: 'Insufficient permissions',
        severity: 'high'
      };

      const auditLog = await securityService.logAuditEvent(auditData);
      
      expect(auditLog).toBeTruthy();
      expect(auditLog.success).toBe(false);
      expect(auditLog.errorMessage).toBe('Insufficient permissions');
      expect(auditLog.severity).toBe('high');
    });

    test('audit logs can be retrieved by superadmin', async () => {
      // Create some audit logs
      await securityService.logAuditEvent({
        userId: adminUser._id,
        action: 'view',
        resource: 'admin-overview',
        success: true
      });

      await securityService.logAuditEvent({
        userId: hrUser._id,
        action: 'export',
        resource: 'work-data',
        success: true
      });

      const result = await securityService.getAuditLogs({}, superAdminUser);
      
      expect(result.logs).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
    });

    test('non-superadmin cannot retrieve audit logs', async () => {
      await expect(
        securityService.getAuditLogs({}, adminUser)
      ).rejects.toThrow('Insufficient permissions to view audit logs');
    });

    test('audit logs can be filtered', async () => {
      // Create audit logs with different actions
      await securityService.logAuditEvent({
        userId: adminUser._id,
        action: 'view',
        resource: 'admin-overview',
        success: true
      });

      await securityService.logAuditEvent({
        userId: adminUser._id,
        action: 'export',
        resource: 'work-data',
        success: true
      });

      // Filter by action
      const result = await securityService.getAuditLogs(
        { action: 'export' }, 
        superAdminUser
      );
      
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('export');
    });
  });

  /**
   * Test input validation and sanitization
   */
  describe('Input Validation and Sanitization', () => {
    test('sanitizes search terms to prevent XSS', () => {
      const maliciousSearch = '<script>alert("xss")</script>test';
      const sanitized = securityService.sanitizeSearchTerm(maliciousSearch);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('test');
    });

    test('removes MongoDB injection patterns from search', () => {
      const maliciousSearch = '{"$ne": null}';
      const sanitized = securityService.sanitizeSearchTerm(maliciousSearch);
      
      expect(sanitized).not.toContain('$ne');
      expect(sanitized).not.toContain('{');
      expect(sanitized).not.toContain('}');
    });

    test('validates date formats', () => {
      const validFilters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const sanitized = securityService.sanitizeFilters(validFilters);
      expect(sanitized.startDate).toBe('2024-01-01');
      expect(sanitized.endDate).toBe('2024-01-31');

      const invalidFilters = {
        startDate: 'invalid-date'
      };

      expect(() => {
        securityService.sanitizeFilters(invalidFilters);
      }).toThrow('Invalid date format for startDate');
    });

    test('validates ObjectId formats', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const validFilters = {
        client: validId,
        project: 'all'
      };

      const sanitized = securityService.sanitizeFilters(validFilters);
      expect(sanitized.client).toBe(validId);
      expect(sanitized.project).toBe('all');

      const invalidFilters = {
        client: 'invalid-id'
      };

      expect(() => {
        securityService.sanitizeFilters(invalidFilters);
      }).toThrow('Invalid ID format for client');
    });

    test('validates enum values', () => {
      const validFilters = {
        status: 'in-progress',
        priority: 'high'
      };

      const sanitized = securityService.sanitizeFilters(validFilters);
      expect(sanitized.status).toBe('in-progress');
      expect(sanitized.priority).toBe('high');

      const invalidFilters = {
        status: 'invalid-status'
      };

      expect(() => {
        securityService.sanitizeFilters(invalidFilters);
      }).toThrow('Invalid value for status');
    });

    test('limits numeric values', () => {
      const filters = {
        page: '999999',
        limit: '999999'
      };

      const sanitized = securityService.sanitizeFilters(filters);
      expect(sanitized.page).toBeLessThanOrEqual(10000);
      expect(sanitized.limit).toBeLessThanOrEqual(1000);
    });

    test('validates sort fields to prevent injection', () => {
      const validSortField = 'title';
      const sanitized = securityService.sanitizeSortField(validSortField);
      expect(sanitized).toBe('title');

      const invalidSortField = 'malicious.field';
      expect(() => {
        securityService.sanitizeSortField(invalidSortField);
      }).toThrow('Invalid sort field');
    });

    test('validates request complexity', () => {
      const validRequest = {
        body: { simple: 'data' },
        query: { page: '1', limit: '10' }
      };

      expect(() => {
        securityService.validateRequestComplexity(validRequest);
      }).not.toThrow();

      // Test deeply nested object
      const deeplyNestedRequest = {
        body: { level1: { level2: { level3: { level4: { level5: { level6: { level7: { level8: { level9: { level10: { level11: 'too deep' } } } } } } } } } } }
      };

      expect(() => {
        securityService.validateRequestComplexity(deeplyNestedRequest);
      }).toThrow('Request object too deeply nested');

      // Test too many query parameters
      const tooManyParamsRequest = {
        query: Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`param${i}`, `value${i}`]))
      };

      expect(() => {
        securityService.validateRequestComplexity(tooManyParamsRequest);
      }).toThrow('Too many query parameters');
    });
  });

  /**
   * Test API endpoint security
   */
  describe('API Endpoint Security', () => {
    test('admin overview requires authentication', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/enhanced-overview')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication');
    });

    test('admin overview requires admin role', async () => {
      // Mock authentication middleware to set employee user
      const response = await request(app)
        .get('/api/work-calendar/admin/enhanced-overview')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });

    test('bulk operations require proper permissions', async () => {
      const bulkOperationData = {
        workEntryIds: [new mongoose.Types.ObjectId().toString()],
        operation: 'delete'
      };

      // Employee cannot perform bulk operations
      const employeeResponse = await request(app)
        .post('/api/work-calendar/admin/bulk-operations')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(bulkOperationData)
        .expect(403);

      expect(employeeResponse.body.success).toBe(false);
    });

    test('export endpoints validate format permissions', async () => {
      const exportData = {
        format: 'pdf',
        filters: {}
      };

      // Manager cannot export PDF
      const managerResponse = await request(app)
        .post('/api/work-calendar/admin/export')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(exportData)
        .expect(403);

      expect(managerResponse.body.success).toBe(false);
    });

    test('audit logs endpoint requires superadmin', async () => {
      // Admin cannot access audit logs
      const adminResponse = await request(app)
        .get('/api/work-calendar/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(adminResponse.body.success).toBe(false);
    });

    test('malicious input is sanitized', async () => {
      const maliciousQuery = {
        search: '<script>alert("xss")</script>',
        client: '{"$ne": null}',
        status: 'invalid-status'
      };

      const response = await request(app)
        .get('/api/work-calendar/admin/enhanced-overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .query(maliciousQuery)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });
  });

  /**
   * Test rate limiting
   */
  describe('Rate Limiting', () => {
    test('bulk operations are rate limited', async () => {
      const bulkOperationData = {
        workEntryIds: [new mongoose.Types.ObjectId().toString()],
        operation: 'updateStatus',
        data: { status: 'completed' }
      };

      // Make multiple requests quickly
      const requests = Array.from({ length: 15 }, () =>
        request(app)
          .post('/api/work-calendar/admin/bulk-operations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkOperationData)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('export operations are rate limited', async () => {
      const exportData = {
        format: 'csv',
        filters: {}
      };

      // Make multiple export requests quickly
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/work-calendar/admin/export')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(exportData)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});