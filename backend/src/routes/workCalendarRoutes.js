import express from 'express';
import * as workCalendarController from '../controllers/workCalendarController.js';
import { protect } from '../middleware/authMiddleware.js';

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
router.get('/admin/overview', protect, workCalendarController.getAdminWorkOverview);

// ============================================
// PDF EXPORT ROUTES
// ============================================

/**
 * POST /api/work-calendar/admin/export/pdf
 * Generate and download PDF report
 * Body: reportType, filters, groupBy, includeAnalytics, includeCharts
 */
router.post('/admin/export/pdf', protect, workCalendarController.generateWorkReportPDF);

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
    console.error('[TEST] Work calendar API test endpoint hit by user:', req.user.id);
    
    // Import WorkItem model to test database query
    const WorkItem = (await import('../models/workItemModel.js')).default;
    
    // Check if user has work items
    const workItems = await WorkItem.find({ assignedTo: req.user.id });
    console.error(`[TEST] Found ${workItems.length} work items for user ${req.user.id}`);
    
    if (workItems.length > 0) {
      console.error('[TEST] Work items:', workItems.map(item => ({
        id: item._id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status
      })));
    }
    
    res.json({
      success: true,
      message: 'Work calendar API is working',
      user: req.user.id,
      email: req.user.email,
      role: req.user.role,
      workItemsCount: workItems.length,
      workItems: workItems.map(item => ({
        id: item._id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status
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

export default router;