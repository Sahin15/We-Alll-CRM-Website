import express from 'express';
import * as workCalendarController from '../controllers/workCalendarController.js';
import { protect } from '../middleware/authMiddleware.js';
import { securityService } from '../services/securityService.js';
import {
  requirePermission,
  validateBulkOperation,
  validateExport,
  sanitizeFilters,
  validateRequestComplexity,
  requireAdminAccess,
  requireSuperAdminAccess
} from '../middleware/securityMiddleware.js';

const router = express.Router();

// ============================================
// EMPLOYEE WORK CALENDAR ROUTES
// ============================================

/**
 * GET /api/work-calendar/employee/:employeeId?
 * Get employee's personal work calendar
 * Query params: startDate, endDate, status, workType, project, priority, view
 */
router.get('/employee/:employeeId', protect, workCalendarController.getEmployeeWorkCalendar);

/**
 * GET /api/work-calendar/employee (current user)
 * Get current user's work calendar
 */
router.get('/employee', protect, workCalendarController.getEmployeeWorkCalendar);

// ============================================
// ADMIN OVERVIEW ROUTES
// ============================================

/**
 * GET /api/work-calendar/admin/overview
 * Get comprehensive admin overview with advanced filtering
 * Query params: startDate, endDate, department, project, client, employee, 
 *               status, workType, priority, view, groupBy, sortBy, sortOrder
 */
router.get('/admin/overview', 
  protect, 
  requireAdminAccess,
  sanitizeFilters,
  validateRequestComplexity,
  securityService.createAuditMiddleware('view', 'admin-overview'),
  securityService.getRateLimiter('analytics'),
  workCalendarController.getAdminWorkOverview
);

/**
 * GET /api/work-calendar/admin/enhanced-overview
 * Get enhanced admin overview with spreadsheet functionality and client focus
 * Query params: All filters plus pagination, advanced search, custom filters
 */
router.get('/admin/enhanced-overview', 
  protect, 
  requireAdminAccess,
  sanitizeFilters,
  validateRequestComplexity,
  securityService.createAuditMiddleware('view', 'enhanced-admin-overview'),
  securityService.getRateLimiter('analytics'),
  workCalendarController.getEnhancedAdminOverview
);

/**
 * POST /api/work-calendar/admin/advanced-filter
 * Advanced filtering with custom criteria and logical operators
 * Body: filters, logicalOperator, customCriteria
 */
router.post('/admin/advanced-filter', protect, workCalendarController.advancedFilter);

/**
 * POST /api/work-calendar/admin/bulk-operations
 * Bulk operations on work entries (update status, reassign, etc.)
 * Body: workEntryIds, operation, data
 */
router.post('/admin/bulk-operations', 
  protect, 
  requireAdminAccess,
  validateRequestComplexity,
  validateBulkOperation,
  securityService.createAuditMiddleware('bulk-operation', 'work-entries'),
  securityService.getRateLimiter('bulkOperations'),
  workCalendarController.bulkOperations
);

// ============================================
// PDF EXPORT ROUTES
// ============================================

/**
 * POST /api/work-calendar/admin/export/pdf
 * Generate and download PDF report
 * Body: reportType, filters, groupBy, includeAnalytics, includeCharts
 */
router.post('/admin/export/pdf', 
  protect, 
  requireAdminAccess,
  validateExport,
  sanitizeFilters,
  validateRequestComplexity,
  securityService.createAuditMiddleware('export', 'pdf-report'),
  securityService.getRateLimiter('export'),
  workCalendarController.generateWorkReportPDF
);

/**
 * POST /api/work-calendar/admin/export
 * Export work data in multiple formats (CSV, Excel, PDF)
 * Body: filters, format, columns, includeAnalytics
 */
router.post('/admin/export', 
  protect, 
  requireAdminAccess,
  validateExport,
  sanitizeFilters,
  validateRequestComplexity,
  securityService.createAuditMiddleware('export', 'work-data'),
  securityService.getRateLimiter('export'),
  workCalendarController.exportWorkData
);

/**
 * GET /api/work-calendar/admin/export/:jobId
 * Get export job status and download link
 */
router.get('/admin/export/:jobId', protect, workCalendarController.getExportStatus);

/**
 * GET /api/work-calendar/admin/export-jobs
 * Get all export jobs (monitoring)
 */
router.get('/admin/export-jobs', protect, workCalendarController.getAllExportJobs);

/**
 * DELETE /api/work-calendar/admin/export/:jobId
 * Cancel export job
 */
router.delete('/admin/export/:jobId', protect, workCalendarController.cancelExportJob);

/**
 * GET /api/exports/download/:filename
 * Download export file
 */
router.get('/exports/download/:filename', 
  protect, 
  requireAdminAccess,
  securityService.createAuditMiddleware('download', 'export-file'),
  workCalendarController.downloadExportFile
);

// ============================================
// AUDIT LOGS ROUTES (SUPERADMIN ONLY)
// ============================================

/**
 * GET /api/work-calendar/admin/audit-logs
 * Get audit logs with filtering (superadmin only)
 * Query params: userId, action, resource, severity, startDate, endDate, page, limit
 */
router.get('/admin/audit-logs', 
  protect, 
  requireSuperAdminAccess,
  sanitizeFilters,
  validateRequestComplexity,
  securityService.createAuditMiddleware('view', 'audit-logs'),
  async (req, res) => {
    try {
      const result = await securityService.getAuditLogs(req.query, req.user);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(403).json({
        success: false,
        message: error.message || 'Failed to retrieve audit logs'
      });
    }
  }
);

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * GET /api/work-calendar/admin/analytics
 * Get comprehensive work calendar analytics with client focus
 * Query params: startDate, endDate, client, project, employee, department, status, priority, workType, search
 */
router.get('/admin/analytics', protect, workCalendarController.getWorkCalendarAnalytics);

/**
 * POST /api/work-calendar/admin/analytics/subscribe
 * Subscribe to real-time analytics updates
 * Body: filters
 */
router.post('/admin/analytics/subscribe', protect, workCalendarController.subscribeToAnalyticsUpdates);

/**
 * POST /api/work-calendar/admin/analytics/invalidate-cache
 * Invalidate analytics cache
 * Body: pattern (optional)
 */
router.post('/admin/analytics/invalidate-cache', protect, workCalendarController.invalidateAnalyticsCache);

/**
 * GET /api/work-calendar/admin/analytics/cache-stats
 * Get analytics cache statistics
 */
router.get('/admin/analytics/cache-stats', protect, workCalendarController.getAnalyticsCacheStats);

/**
 * GET /api/work-calendar/admin/slot-analytics
 * Get comprehensive slot analytics for admin dashboard
 * Query params: startDate, endDate, client, project, employee, department, status, priority, workType, search
 */
router.get('/admin/slot-analytics', 
  protect, 
  requireAdminAccess,
  sanitizeFilters,
  validateRequestComplexity,
  securityService.createAuditMiddleware('view', 'slot-analytics'),
  securityService.getRateLimiter('analytics'),
  workCalendarController.getSlotAnalytics
);

// ============================================
// SYNC AND MAINTENANCE ROUTES
// ============================================

/**
 * POST /api/work-calendar/admin/sync
 * Sync work items to work calendar
 * Query params: projectId, employeeId, departmentId (optional filters)
 */
router.post('/admin/sync', protect, workCalendarController.syncWorkItemsToCalendar);

/**
 * POST /api/work-calendar/sync-my-work
 * Sync current user's work items to calendar
 */
router.post('/sync-my-work', protect, workCalendarController.syncMyWorkItemsToCalendar);

/**
 * GET /api/work-calendar/test
 * Test endpoint to verify work calendar API is working
 */
router.get('/test', protect, async (req, res) => {
  try {
    console.log('[TEST] Work calendar API test endpoint hit by user:', req.user.email, 'Role:', req.user.role);
    
    // Import WorkItem model to test database query
    const WorkItem = (await import('../models/workItemModel.js')).default;
    
    // Check if user has work items
    const userWorkItems = await WorkItem.find({ assignedTo: req.user.id });
    console.log(`[TEST] Found ${userWorkItems.length} work items assigned to user ${req.user.email}`);
    
    // Check all work items if user is admin
    let allWorkItems = [];
    if (['admin', 'superadmin', 'hod', 'hr', 'manager'].includes(req.user.role)) {
      allWorkItems = await WorkItem.find({});
      console.log(`[TEST] Found ${allWorkItems.length} total work items in database`);
    }
    
    if (userWorkItems.length > 0) {
      console.log('[TEST] User work items:', userWorkItems.map(item => ({
        id: item._id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        createdAt: item.createdAt
      })));
    }
    
    if (allWorkItems.length > 0) {
      console.log('[TEST] Recent work items:', allWorkItems.slice(-3).map(item => ({
        id: item._id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        assignedTo: item.assignedTo,
        createdAt: item.createdAt
      })));
    }
    
    res.json({
      success: true,
      message: 'Work calendar API is working',
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      },
      workItemsCount: {
        userItems: userWorkItems.length,
        totalItems: allWorkItems.length
      },
      userWorkItems: userWorkItems.map(item => ({
        id: item._id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        createdAt: item.createdAt
      })),
      recentWorkItems: allWorkItems.slice(-3).map(item => ({
        id: item._id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        assignedTo: item.assignedTo,
        createdAt: item.createdAt
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[TEST] Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * POST /api/work-calendar/entry
 * Create manual work calendar entry
 */
router.post('/entry', protect, workCalendarController.createWorkCalendarEntryAPI);

/**
 * PUT /api/work-calendar/entry/:id
 * Update work calendar entry
 */
router.put('/entry/:id', protect, workCalendarController.updateWorkCalendarEntry);

/**
 * DELETE /api/work-calendar/entry/:id
 * Delete work calendar entry
 */
router.delete('/entry/:id', protect, workCalendarController.deleteWorkCalendarEntry);

// ============================================
// SLOT MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/work-calendar/projects/:projectId/slots/available
 * Get available slots for a project
 */
router.get('/projects/:projectId/slots/available', 
  protect, 
  workCalendarController.getAvailableSlots
);

/**
 * POST /api/work-calendar/slots/:slotId/assign
 * Assign work item to slot
 */
router.post('/slots/:slotId/assign', 
  protect, 
  securityService.createAuditMiddleware('assign', 'slot-assignment'),
  workCalendarController.assignWorkItemToSlot
);

/**
 * POST /api/work-calendar/work-items/:workItemId/release-slot
 * Release work item from slot
 */
router.post('/work-items/:workItemId/release-slot', 
  protect, 
  securityService.createAuditMiddleware('release', 'slot-assignment'),
  workCalendarController.releaseSlotFromWorkItem
);

/**
 * POST /api/work-calendar/slots/:slotId/complete
 * Complete a slot
 */
router.post('/slots/:slotId/complete', 
  protect, 
  securityService.createAuditMiddleware('complete', 'slot-completion'),
  workCalendarController.completeSlot
);

/**
 * GET /api/work-calendar/projects/:projectId/slots/statistics
 * Get project slot statistics
 */
router.get('/projects/:projectId/slots/statistics', 
  protect, 
  workCalendarController.getProjectSlotStatistics
);

/**
 * POST /api/work-calendar/projects/:projectId/slots/create
 * Create slots for a project
 */
router.post('/projects/:projectId/slots/create', 
  protect, 
  securityService.createAuditMiddleware('create', 'project-slots'),
  workCalendarController.createSlotsForProject
);

/**
 * GET /api/work-calendar/projects/:projectId/slots/conflicts
 * Detect slot conflicts for a project
 */
router.get('/projects/:projectId/slots/conflicts', 
  protect, 
  workCalendarController.detectSlotConflicts
);

/**
 * POST /api/work-calendar/projects/:projectId/slots/resolve-conflicts
 * Resolve slot conflicts for a project
 */
router.post('/projects/:projectId/slots/resolve-conflicts', 
  protect, 
  securityService.createAuditMiddleware('resolve', 'slot-conflicts'),
  workCalendarController.resolveSlotConflicts
);

/**
 * POST /api/work-calendar/admin/bulk-slot-operations
 * Bulk slot operations
 */
router.post('/admin/bulk-slot-operations', 
  protect, 
  requireAdminAccess,
  securityService.createAuditMiddleware('bulk-operation', 'slot-operations'),
  securityService.getRateLimiter('bulkOperations'),
  workCalendarController.bulkSlotOperations
);

export default router;