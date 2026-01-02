import WorkCalendar from "../models/workCalendarModel.js";
import WorkItem from "../models/workItemModel.js";
import Project from "../models/projectModel.js";
import Department from "../models/departmentModel.js";
import User from "../models/userModel.js";
import Client from "../models/clientModel.js";
import CalendarEvent from "../models/calendarEventModel.js";
import Slot from "../models/slotModel.js";
import logger from "../utils/logger.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import moment from "moment";
import analyticsEngine from "../services/analyticsEngine.js";
import exportService from "../services/exportService.js";
import realTimeUpdateService from "../services/realTimeUpdateService.js";
import slotManagementService from "../services/slotManagementService.js";

/**
 * Comprehensive Work Calendar Controller
 * Handles employee work calendars, admin overview, filtering, and PDF exports
 */

// ============================================
// EMPLOYEE WORK CALENDAR
// ============================================

/**
 * Get employee's personal work calendar
 * Shows all work assigned to the employee
 */
export const getEmployeeWorkCalendar = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user.id;
    const { 
      startDate, 
      endDate, 
      status, 
      workType, 
      project, 
      priority,
      view = 'calendar' 
    } = req.query;

    // Log only essential information
    logger.info(`Getting work calendar for employee: ${employeeId}`);

    // Permission check: employees can only see their own calendar
    if (req.user.role === 'employee' && employeeId !== req.user.id) {
      logger.error(`Permission denied: employee ${req.user.id} trying to access ${employeeId}'s calendar`);
      return res.status(403).json({ 
        success: false, 
        message: "You can only view your own work calendar" 
      });
    }

    // Build date range filter - temporarily disabled for debugging
    const dateFilter = {};
    // Commenting out date filter to see all work calendar entries
    // if (startDate && endDate) {
    //   dateFilter.$or = [
    //     {
    //       startDate: { 
    //         $gte: new Date(startDate), 
    //         $lte: new Date(endDate) 
    //       }
    //     },
    //     {
    //       endDate: { 
    //         $gte: new Date(startDate), 
    //         $lte: new Date(endDate) 
    //       }
    //     },
    //     {
    //       $and: [
    //         { startDate: { $lte: new Date(startDate) } },
    //         { endDate: { $gte: new Date(endDate) } }
    //       ]
    //     }
    //   ];
    // }

    // Get work calendar entries - show ALL entries for debugging
    const workCalendarQuery = {
      assignedTo: employeeId
      // Temporarily not applying date filter: ...dateFilter
    };

    if (status) workCalendarQuery.status = status;
    if (workType) workCalendarQuery.workType = workType;
    if (project) workCalendarQuery.project = project;
    if (priority) workCalendarQuery.priority = priority;

    const workCalendarEntries = await WorkCalendar.find(workCalendarQuery)
      .populate('project', 'name client status')
      .populate('client', 'name')
      .populate('department', 'name')
      .populate('assignedTo', 'name email')
      .populate('collaborators.user', 'name email')
      .sort({ startDate: 1 });

    logger.info(`Found ${workCalendarEntries.length} work calendar entries for employee ${employeeId}`);

    // Get work items for the employee (to auto-generate calendar entries if needed)
    const workItemsQuery = {
      assignedTo: employeeId
    };

    // For work items, use a broader date range to show all relevant items
    if (startDate && endDate) {
      const extendedStartDate = new Date(startDate);
      extendedStartDate.setDate(extendedStartDate.getDate() - 30); // 30 days before
      const extendedEndDate = new Date(endDate);
      extendedEndDate.setDate(extendedEndDate.getDate() + 30); // 30 days after
      
      workItemsQuery.dueDate = {
        $gte: extendedStartDate,
        $lte: extendedEndDate
      };
    }

    const workItems = await WorkItem.find(workItemsQuery)
      .populate('project', 'name client status departments')
      .populate('assignedTo', 'name email')
      .sort({ dueDate: 1 });

    logger.info(`Found ${workItems.length} work items for employee ${employeeId}`);

    // Auto-generate calendar entries for work items that don't have them
    const existingWorkItemIds = workCalendarEntries
      .filter(entry => entry.sourceModel === 'WorkItem')
      .map(entry => entry.sourceId.toString());

    const newCalendarEntries = [];
    for (const workItem of workItems) {
      if (!existingWorkItemIds.includes(workItem._id.toString())) {
        const calendarEntry = await createWorkCalendarEntry(workItem);
        if (calendarEntry) {
          newCalendarEntries.push(calendarEntry);
        }
      }
    }

    // Combine existing and new entries
    const allEntries = [...workCalendarEntries, ...newCalendarEntries];

    // Get employee details
    const employee = await User.findById(employeeId)
      .populate('department', 'name')
      .select('name email role department');

    // Calculate analytics
    const analytics = calculateEmployeeAnalytics(allEntries, workItems);

    // Format response based on view type
    let formattedEntries = allEntries;
    if (view === 'calendar') {
      formattedEntries = formatForCalendarView(allEntries);
    } else if (view === 'timeline') {
      formattedEntries = formatForTimelineView(allEntries);
    } else if (view === 'list') {
      formattedEntries = formatForListView(allEntries);
    }

    logger.info(`Sending response with ${formattedEntries.length} work calendar entries and ${workItems.length} work items`);
    
    const responseData = {
      success: true,
      data: {
        employee,
        workCalendar: formattedEntries,
        workItems,
        analytics,
        filters: {
          startDate,
          endDate,
          status,
          workType,
          project,
          priority,
          view
        }
      }
    };
    
    res.status(200).json(responseData);

  } catch (error) {
    logger.error('Error in getEmployeeWorkCalendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee work calendar',
      error: error.message
    });
  }
};

// ============================================
// ADMIN COMPREHENSIVE OVERVIEW
// ============================================

/**
 * Get comprehensive admin overview with advanced filtering
 * Admin can see all work across projects, employees, departments
 */
export const getAdminWorkOverview = async (req, res) => {
  try {
    // Only admin, superadmin, hr, manager can access
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const {
      startDate,
      endDate,
      department,
      project,
      client,
      employee,
      status,
      workType,
      priority,
      company,
      view = 'overview',
      groupBy = 'project',
      sortBy = 'startDate',
      sortOrder = 'asc'
    } = req.query;

    // Build comprehensive filter - Filter by due date (when work should be done)
    const filter = {};
    
    if (startDate && endDate) {
      // Filter by dueDate instead of startDate/endDate for better work scheduling
      filter.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (department) filter.department = department;
    if (project) filter.project = project;
    if (client) filter.client = client;
    if (employee) filter.assignedTo = employee;
    if (status) filter.status = status;
    if (workType) filter.workType = workType;
    if (priority) filter.priority = priority;
    
    // Company filter - filter by service company
    if (company && company !== 'all') {
      // Get clients that belong to the specified company
      const companyClients = await Client.find({ company: company }).select('_id').lean();
      const companyClientIds = companyClients.map(c => c._id);
      
      if (companyClientIds.length > 0) {
        // If there's already a client filter, combine them
        if (filter.client) {
          // Check if the single client is in the company
          const singleClientInCompany = companyClientIds.some(cId => cId.toString() === filter.client.toString());
          if (!singleClientInCompany) {
            filter._id = { $in: [] }; // No results
          }
        } else {
          // No existing client filter, use company clients
          filter.client = { $in: companyClientIds };
        }
      } else {
        // No clients found for this company, return empty result
        filter._id = { $in: [] };
      }
    }

    // Get all work calendar entries
    const workCalendarEntries = await WorkCalendar.find(filter)
      .populate('project', 'name client status departments')
      .populate('client', 'name email')
      .populate('department', 'name')
      .populate('assignedTo', 'name email role department')
      .populate('createdBy', 'name email')
      .populate('collaborators.user', 'name email')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });

    // Get related work items
    const workItemFilter = {};
    if (department) {
      // Get projects in this department
      const deptProjects = await Project.find({ departments: department }).select('_id');
      workItemFilter.project = { $in: deptProjects.map(p => p._id) };
    }
    if (project) workItemFilter.project = project;
    if (employee) workItemFilter.assignedTo = employee;
    if (status) {
      // Map work calendar status to work item status
      const statusMap = {
        'scheduled': 'To Do',
        'in-progress': 'In Progress',
        'completed': 'Done',
        'overdue': ['To Do', 'In Progress', 'Review']
      };
      workItemFilter.status = statusMap[status] || status;
    }

    const workItems = await WorkItem.find(workItemFilter)
      .populate('project', 'name client status')
      .populate('assignedTo', 'name email role department')
      .sort({ dueDate: 1 });

    // Get comprehensive analytics
    const analytics = await getComprehensiveAnalytics(filter);

    // Group data based on groupBy parameter
    let groupedData = {};
    if (groupBy === 'project') {
      groupedData = groupByProject(workCalendarEntries, workItems);
    } else if (groupBy === 'employee') {
      groupedData = groupByEmployee(workCalendarEntries, workItems);
    } else if (groupBy === 'department') {
      groupedData = groupByDepartment(workCalendarEntries, workItems);
    } else if (groupBy === 'client') {
      groupedData = groupByClient(workCalendarEntries, workItems);
    } else if (groupBy === 'date') {
      groupedData = groupByDate(workCalendarEntries, workItems);
    }

    // Get filter options for frontend
    const filterOptions = await getFilterOptions();

    res.status(200).json({
      success: true,
      data: {
        workCalendar: workCalendarEntries,
        workItems,
        groupedData,
        analytics,
        filterOptions,
        filters: {
          startDate,
          endDate,
          department,
          project,
          client,
          employee,
          status,
          workType,
          priority,
          view,
          groupBy,
          sortBy,
          sortOrder
        },
        totalRecords: workCalendarEntries.length
      }
    });

  } catch (error) {
    logger.error('Error in getAdminWorkOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin work overview',
      error: error.message
    });
  }
};

// ============================================
// PDF EXPORT FUNCTIONALITY
// ============================================

/**
 * Generate and download PDF report
 * Supports various report types and filters
 */
export const generateWorkReportPDF = async (req, res) => {
  try {
    // Only admin, superadmin, hr, manager can generate reports
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const {
      reportType = 'comprehensive',
      startDate,
      endDate,
      department,
      project,
      client,
      employee,
      status,
      workType,
      priority,
      groupBy = 'project',
      includeAnalytics = true,
      includeCharts = false
    } = req.body;

    // Get data based on filters - Filter by due date (when work should be done)
    const filter = {};
    if (startDate && endDate) {
      // Filter by dueDate instead of startDate/endDate
      filter.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (department) filter.department = department;
    if (project) filter.project = project;
    if (client) filter.client = client;
    if (employee) filter.assignedTo = employee;
    if (status) filter.status = status;
    if (workType) filter.workType = workType;
    if (priority) filter.priority = priority;

    const workCalendarEntries = await WorkCalendar.find(filter)
      .populate('project', 'name client status departments')
      .populate('client', 'name email')
      .populate('department', 'name')
      .populate('assignedTo', 'name email role department')
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    const workItems = await WorkItem.find({})
      .populate('project', 'name client status')
      .populate('assignedTo', 'name email role department')
      .sort({ dueDate: 1 });

    // Generate PDF
    const pdfBuffer = await generatePDFReport({
      reportType,
      workCalendarEntries,
      workItems,
      filters: { startDate, endDate, department, project, client, employee, status, workType, priority },
      groupBy,
      includeAnalytics,
      includeCharts,
      generatedBy: req.user
    });

    // Set response headers for PDF download
    const filename = `work-report-${moment().format('DD-MM-YYYY-HHmm')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Error in generateWorkReportPDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report',
      error: error.message
    });
  }
};

// ============================================
// ENHANCED ADMIN OVERVIEW WITH ADVANCED FILTERING
// ============================================

/**
 * Enhanced admin overview with advanced filtering, client focus, and spreadsheet data
 * Supports complex filter combinations, bulk operations, and real-time analytics
 */
export const getEnhancedAdminOverview = async (req, res) => {
  try {
    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const {
      // Date filters
      startDate,
      endDate,
      
      // Entity filters
      client,
      project,
      employee,
      department,
      
      // Work classification filters
      status,
      priority,
      workType,
      company,
      
      // Advanced filters
      search,
      tags,
      customFilters,
      vipOnly,
      
      // Pagination and sorting
      page = 1,
      limit = 100,
      sortBy = 'startDate',
      sortOrder = 'asc',
      
      // View options
      includeAnalytics = true,
      groupBy,
      
      // Performance options
      useCache = true
    } = req.query;

    // Build comprehensive filter with client focus
    const filter = await buildAdvancedFilter({
      startDate,
      endDate,
      client,
      project,
      employee,
      department,
      status,
      priority,
      workType,
      company,
      search,
      tags,
      customFilters,
      vipOnly
    });

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Get work entries with enhanced population for client data
    const workEntries = await WorkCalendar.find(filter)
      .populate({
        path: 'project',
        select: 'name client status departments description',
        populate: {
          path: 'client',
          select: 'name email company phone address'
        }
      })
      .populate('client', 'name email company phone address')
      .populate('department', 'name description')
      .populate('assignedTo', 'name email role department profilePicture')
      .populate('createdBy', 'name email')
      .populate('collaborators.user', 'name email role')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await WorkCalendar.countDocuments(filter);

    // Enhance work entries with client information
    const enhancedWorkEntries = workEntries.map(entry => ({
      ...entry,
      // Ensure client info is available at top level
      client: entry.client || entry.project?.client,
      // Add computed fields for spreadsheet view
      daysUntilDue: entry.dueDate ? Math.ceil((new Date(entry.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      isOverdue: entry.dueDate ? new Date() > new Date(entry.dueDate) && entry.status !== 'completed' : false,
      completionPercentage: entry.progress || 0,
      workloadImpact: calculateWorkloadImpact(entry),
      // Format dates for spreadsheet display
      formattedStartDate: new Date(entry.startDate).toLocaleDateString(),
      formattedDueDate: entry.dueDate ? new Date(entry.dueDate).toLocaleDateString() : null,
      formattedEndDate: new Date(entry.endDate).toLocaleDateString()
    }));

    // Calculate comprehensive analytics if requested
    let analytics = null;
    let slotAnalytics = null;
    if (includeAnalytics) {
      analytics = await calculateEnhancedAnalytics(filter);
      slotAnalytics = await calculateSlotAnalytics(filter);
    }

    // Group data if requested
    let groupedData = null;
    if (groupBy) {
      groupedData = await groupWorkData(enhancedWorkEntries, groupBy);
    }

    // Get filter options for frontend dropdowns
    const filterOptions = await getEnhancedFilterOptions();

    // Build response
    const response = {
      success: true,
      data: {
        workEntries: enhancedWorkEntries,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasNextPage: skip + enhancedWorkEntries.length < totalCount,
        hasPrevPage: parseInt(page) > 1,
        analytics,
        slotAnalytics,
        groupedData,
        filterOptions,
        appliedFilters: {
          startDate,
          endDate,
          client,
          project,
          employee,
          department,
          status,
          priority,
          workType,
          search,
          tags,
          sortBy,
          sortOrder,
          page,
          limit
        },
        lastUpdated: new Date()
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in getEnhancedAdminOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enhanced admin overview',
      error: error.message
    });
  }
};

/**
 * Advanced filtering with client focus and custom criteria
 */
export const advancedFilter = async (req, res) => {
  try {
    const {
      filters,
      logicalOperator = 'AND',
      customCriteria = []
    } = req.body;

    // Build filter with custom criteria support
    const filter = await buildAdvancedFilter(filters);
    
    // Apply custom criteria with logical operators
    if (customCriteria.length > 0) {
      const customFilter = buildCustomCriteriaFilter(customCriteria, logicalOperator);
      if (logicalOperator === 'AND') {
        Object.assign(filter, customFilter);
      } else {
        filter.$or = [filter, customFilter];
      }
    }

    // Execute query
    const results = await WorkCalendar.find(filter)
      .populate('project client department assignedTo')
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      data: {
        results,
        count: results.length,
        filter: filter
      }
    });

  } catch (error) {
    logger.error('Error in advancedFilter:', error);
    res.status(500).json({
      success: false,
      message: 'Advanced filtering failed',
      error: error.message
    });
  }
};

/**
 * Enhanced bulk operations for work entries with comprehensive validation and logging
 */
export const bulkOperations = async (req, res) => {
  try {
    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required for bulk operations.'
      });
    }

    const {
      workEntryIds,
      operation,
      data
    } = req.body;

    // Enhanced input validation
    const validationResult = validateBulkOperationInput(workEntryIds, operation, data, req.user.role);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.message,
        errors: validationResult.errors
      });
    }

    // Get existing work entries for validation
    const existingEntries = await WorkCalendar.find({ _id: { $in: workEntryIds } })
      .populate('assignedTo', 'name email role')
      .populate('project', 'name client')
      .populate('client', 'name');

    if (existingEntries.length !== workEntryIds.length) {
      return res.status(400).json({
        success: false,
        message: `Some work entries not found. Expected ${workEntryIds.length}, found ${existingEntries.length}`
      });
    }

    // Operation-specific validation
    const operationValidation = await validateOperationConstraints(operation, data, existingEntries, req.user);
    if (!operationValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Operation validation failed',
        errors: operationValidation.errors,
        warnings: operationValidation.warnings
      });
    }

    // Prepare update data
    const updateData = await prepareUpdateData(operation, data, req.user);
    
    // Create audit log entry before operation
    const auditLogEntry = {
      operation,
      performedBy: req.user.id,
      performedAt: new Date(),
      targetEntries: workEntryIds,
      operationData: data,
      beforeState: existingEntries.map(entry => ({
        id: entry._id,
        status: entry.status,
        priority: entry.priority,
        assignedTo: entry.assignedTo?._id,
        startDate: entry.startDate,
        dueDate: entry.dueDate,
        endDate: entry.endDate
      }))
    };

    let results = {
      successful: [],
      failed: [],
      warnings: []
    };

    // Execute operation with transaction for data integrity
    const session = await WorkCalendar.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Process each entry individually for better error handling
        for (const entryId of workEntryIds) {
          try {
            const result = await WorkCalendar.findByIdAndUpdate(
              entryId,
              updateData,
              { 
                new: true, 
                session,
                runValidators: true 
              }
            ).populate('project client department assignedTo');

            if (result) {
              results.successful.push({
                id: entryId,
                entry: result
              });
            } else {
              results.failed.push({
                id: entryId,
                error: 'Entry not found or update failed'
              });
            }
          } catch (entryError) {
            results.failed.push({
              id: entryId,
              error: entryError.message
            });
          }
        }

        // Log successful operation
        if (results.successful.length > 0) {
          auditLogEntry.afterState = results.successful.map(r => ({
            id: r.id,
            status: r.entry.status,
            priority: r.entry.priority,
            assignedTo: r.entry.assignedTo?._id,
            startDate: r.entry.startDate,
            dueDate: r.entry.dueDate,
            endDate: r.entry.endDate
          }));

          // Save audit log
          await saveAuditLog(auditLogEntry);
        }
      });
    } finally {
      await session.endSession();
    }

    // Enhanced logging
    logger.info(`Bulk operation completed`, {
      operation,
      performedBy: req.user.email,
      totalEntries: workEntryIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      operationData: data
    });

    // Send notifications for reassignment operations
    if (operation === 'reassign' && results.successful.length > 0) {
      await sendReassignmentNotifications(results.successful, data.assignedTo, req.user);
    }

    // Broadcast real-time updates for successful operations
    if (results.successful.length > 0) {
      for (const result of results.successful) {
        await realTimeUpdateService.broadcastWorkUpdate(result.entry, 'update');
      }
      
      // Also broadcast analytics update since bulk operations affect metrics
      await realTimeUpdateService.broadcastAnalyticsUpdate();
    }

    // Prepare response
    const response = {
      success: true,
      data: {
        operation,
        totalRequested: workEntryIds.length,
        successfulCount: results.successful.length,
        failedCount: results.failed.length,
        successfulEntries: results.successful.map(r => r.entry),
        failedEntries: results.failed,
        warnings: results.warnings,
        operationData: data,
        auditLogId: auditLogEntry.id
      },
      message: `Bulk operation completed. ${results.successful.length} entries updated successfully${results.failed.length > 0 ? `, ${results.failed.length} failed` : ''}.`
    };

    // Add warnings to response if any
    if (operationValidation.warnings?.length > 0) {
      response.warnings = operationValidation.warnings;
    }

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in enhanced bulkOperations:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk operation failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate bulk operation input
 */
const validateBulkOperationInput = (workEntryIds, operation, data, userRole) => {
  const errors = [];

  // Validate work entry IDs
  if (!workEntryIds || !Array.isArray(workEntryIds) || workEntryIds.length === 0) {
    errors.push('Work entry IDs are required and must be a non-empty array');
  }

  if (workEntryIds && workEntryIds.length > 1000) {
    errors.push('Cannot process more than 1000 entries at once');
  }

  // Validate operation
  const allowedOperations = ['updateStatus', 'reassign', 'updateDates', 'updatePriority', 'addTags', 'delete'];
  if (!operation || !allowedOperations.includes(operation)) {
    errors.push(`Invalid operation. Allowed operations: ${allowedOperations.join(', ')}`);
  }

  // Role-based operation restrictions
  if (operation === 'delete' && !['admin', 'superadmin'].includes(userRole)) {
    errors.push('Delete operation requires admin or superadmin role');
  }

  return {
    isValid: errors.length === 0,
    errors,
    message: errors.length > 0 ? 'Input validation failed' : 'Input validation passed'
  };
};

/**
 * Validate operation constraints
 */
const validateOperationConstraints = async (operation, data, existingEntries, user) => {
  const errors = [];
  const warnings = [];

  switch (operation) {
    case 'updateStatus':
      if (!data.status) {
        errors.push('Status is required for status update operation');
      }
      
      // Check for completed items being changed
      const completedItems = existingEntries.filter(entry => entry.status === 'completed');
      if (completedItems.length > 0 && data.status !== 'completed') {
        warnings.push(`${completedItems.length} completed items will be changed to ${data.status}`);
      }
      break;

    case 'reassign':
      if (!data.assignedTo) {
        errors.push('Assignee is required for reassignment operation');
      } else {
        // Validate assignee exists
        const assignee = await User.findById(data.assignedTo);
        if (!assignee) {
          errors.push('Invalid assignee ID');
        } else if (!['employee', 'hod', 'manager'].includes(assignee.role)) {
          errors.push('Assignee must have employee, hod, or manager role');
        }
      }
      break;

    case 'updateDates':
      // Validate date logic
      if (data.startDate && data.endDate) {
        if (new Date(data.startDate) > new Date(data.endDate)) {
          errors.push('Start date cannot be after end date');
        }
      }
      
      if (data.dueDate && data.startDate) {
        if (new Date(data.dueDate) < new Date(data.startDate)) {
          errors.push('Due date cannot be before start date');
        }
      }

      // Check for past dates
      const now = new Date();
      if (data.startDate && new Date(data.startDate) < now) {
        warnings.push('Start date is in the past');
      }
      break;

    case 'updatePriority':
      if (!data.priority) {
        errors.push('Priority is required for priority update operation');
      } else if (!['urgent', 'high', 'medium', 'low'].includes(data.priority)) {
        errors.push('Invalid priority value');
      }
      break;

    case 'addTags':
      if (!data.tags || !Array.isArray(data.tags) || data.tags.length === 0) {
        errors.push('Tags array is required and must not be empty');
      } else if (data.tags.some(tag => typeof tag !== 'string' || tag.trim().length === 0)) {
        errors.push('All tags must be non-empty strings');
      }
      break;

    case 'delete':
      // Check for completed items
      const completedForDelete = existingEntries.filter(entry => entry.status === 'completed');
      if (completedForDelete.length > 0) {
        errors.push(`Cannot delete ${completedForDelete.length} completed items`);
      }

      // Check for items with dependencies (if applicable)
      const itemsWithDependencies = existingEntries.filter(entry => entry.dependencies?.length > 0);
      if (itemsWithDependencies.length > 0) {
        warnings.push(`${itemsWithDependencies.length} items have dependencies`);
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Prepare update data based on operation
 */
const prepareUpdateData = async (operation, data, user) => {
  const baseUpdate = {
    lastModifiedBy: user.id,
    updatedAt: new Date()
  };

  switch (operation) {
    case 'updateStatus':
      return { ...baseUpdate, status: data.status };

    case 'reassign':
      return { ...baseUpdate, assignedTo: data.assignedTo };

    case 'updateDates':
      const dateUpdate = { ...baseUpdate };
      if (data.startDate) dateUpdate.startDate = new Date(data.startDate);
      if (data.dueDate) dateUpdate.dueDate = new Date(data.dueDate);
      if (data.endDate) dateUpdate.endDate = new Date(data.endDate);
      return dateUpdate;

    case 'updatePriority':
      return { ...baseUpdate, priority: data.priority };

    case 'addTags':
      return { 
        ...baseUpdate, 
        $addToSet: { tags: { $each: data.tags } }
      };

    case 'delete':
      return { 
        ...baseUpdate, 
        status: 'cancelled',
        deletedAt: new Date(),
        deletedBy: user.id
      };

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

/**
 * Save audit log for bulk operations
 */
const saveAuditLog = async (auditLogEntry) => {
  try {
    // In a real implementation, save to audit log collection
    logger.info('Bulk operation audit log', auditLogEntry);
    
    // Could save to database:
    // await AuditLog.create(auditLogEntry);
    
    return auditLogEntry;
  } catch (error) {
    logger.error('Failed to save audit log:', error);
  }
};

/**
 * Send notifications for reassignment operations
 */
const sendReassignmentNotifications = async (successfulEntries, newAssigneeId, performedBy) => {
  try {
    // In a real implementation, send notifications
    logger.info(`Sending reassignment notifications for ${successfulEntries.length} entries to user ${newAssigneeId}`);
    
    // Could integrate with notification system:
    // await NotificationService.sendBulkReassignmentNotification({
    //   entries: successfulEntries,
    //   newAssignee: newAssigneeId,
    //   performedBy: performedBy.id
    // });
    
  } catch (error) {
    logger.error('Failed to send reassignment notifications:', error);
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Auto-create work calendar entry from work item
 */
export const createWorkCalendarEntry = async (workItem) => {
  try {
    // Check if entry already exists
    const existing = await WorkCalendar.findOne({
      sourceId: workItem._id,
      sourceModel: 'WorkItem'
    });

    if (existing) {
      logger.info(`Calendar entry already exists for work item: ${workItem._id}`);
      return null;
    }

    // Determine work type based on work item
    let workType = 'work-item';
    if (workItem.type === 'content') {
      workType = 'work-item'; // Keep as work-item for consistency
    }

    // Calculate start and end dates based on due date
    const dueDate = new Date(workItem.dueDate);
    
    // Set both start and end date to the due date to show work item only on due date
    const startDate = new Date(dueDate);
    startDate.setHours(9, 0, 0, 0); // Start at 9 AM on due date
    
    const endDate = new Date(dueDate);
    endDate.setHours(17, 0, 0, 0); // End at 5 PM on due date

    // Get project details for department and client
    const project = await Project.findById(workItem.project)
      .populate('departments')
      .populate('client');

    if (!project) {
      logger.error(`Project not found for work item: ${workItem._id}`);
      return null;
    }

    // Get department - use first department from project
    let departmentId = null;
    if (project.departments && project.departments.length > 0) {
      departmentId = project.departments[0]._id;
    } else if (project.department) {
      departmentId = project.department;
    }

    if (!departmentId) {
      logger.error(`No department found for project: ${project._id}`);
      return null;
    }

    const calendarEntry = new WorkCalendar({
      title: workItem.title,
      description: workItem.description || `Work item: ${workItem.title}`,
      workType,
      sourceId: workItem._id,
      sourceModel: 'WorkItem',
      assignedTo: workItem.assignedTo,
      department: departmentId,
      project: workItem.project,
      client: project?.client?._id,
      startDate,
      endDate,
      dueDate: workItem.dueDate,
      isAllDay: true, // Work items are all-day events by default
      status: mapWorkItemStatusToCalendarStatus(workItem.status),
      priority: workItem.priority || 'medium',
      timeTracking: {
        estimatedHours: workItem.estimatedHours || 8, // Default 8 hours
        actualHours: workItem.actualHours || 0
      },
      isAutoGenerated: true,
      autoGeneratedBy: 'work-item-sync',
      createdBy: workItem.createdBy,
      tags: workItem.tags || []
    });

    await calendarEntry.save();
    logger.info(`Created calendar entry for work item: ${workItem._id} - ${workItem.title}`);
    return calendarEntry;

  } catch (error) {
    logger.error('Error creating work calendar entry:', error);
    logger.error('Work item data:', JSON.stringify(workItem, null, 2));
    return null;
  }
};

/**
 * Map work item status to calendar status
 */
const mapWorkItemStatusToCalendarStatus = (workItemStatus) => {
  const statusMap = {
    'To Do': 'scheduled',
    'In Progress': 'in-progress',
    'Review': 'in-progress',
    'Done': 'completed'
  };
  return statusMap[workItemStatus] || 'scheduled';
};

/**
 * Calculate employee analytics
 */
const calculateEmployeeAnalytics = (workCalendarEntries, workItems) => {
  const now = new Date();
  
  return {
    totalWork: workCalendarEntries.length,
    completedWork: workCalendarEntries.filter(w => w.status === 'completed').length,
    inProgressWork: workCalendarEntries.filter(w => w.status === 'in-progress').length,
    scheduledWork: workCalendarEntries.filter(w => w.status === 'scheduled').length,
    overdueWork: workCalendarEntries.filter(w => w.isOverdue).length,
    totalWorkItems: workItems.length,
    completedWorkItems: workItems.filter(w => w.status === 'Done').length,
    overdueWorkItems: workItems.filter(w => w.isOverdue).length,
    totalEstimatedHours: workCalendarEntries.reduce((sum, w) => sum + (w.timeTracking?.estimatedHours || 0), 0),
    totalActualHours: workCalendarEntries.reduce((sum, w) => sum + (w.timeTracking?.actualHours || 0), 0),
    averageEfficiency: calculateAverageEfficiency(workCalendarEntries),
    workloadByPriority: {
      urgent: workCalendarEntries.filter(w => w.priority === 'urgent').length,
      high: workCalendarEntries.filter(w => w.priority === 'high').length,
      medium: workCalendarEntries.filter(w => w.priority === 'medium').length,
      low: workCalendarEntries.filter(w => w.priority === 'low').length
    }
  };
};

/**
 * Get comprehensive analytics for admin
 */
const getComprehensiveAnalytics = async (filter) => {
  const analytics = await WorkCalendar.getAnalytics(filter);
  
  // Additional department-wise analytics
  const departmentAnalytics = await WorkCalendar.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'departments',
        localField: 'department',
        foreignField: '_id',
        as: 'departmentInfo'
      }
    },
    { $unwind: '$departmentInfo' },
    {
      $group: {
        _id: '$department',
        departmentName: { $first: '$departmentInfo.name' },
        totalWork: { $sum: 1 },
        completedWork: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        overdueWork: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
        totalHours: { $sum: '$timeTracking.actualHours' }
      }
    }
  ]);

  // Project-wise analytics
  const projectAnalytics = await WorkCalendar.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'projectInfo'
      }
    },
    { $unwind: '$projectInfo' },
    {
      $group: {
        _id: '$project',
        projectName: { $first: '$projectInfo.name' },
        totalWork: { $sum: 1 },
        completedWork: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        overdueWork: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
      }
    }
  ]);

  return {
    overall: analytics[0] || {},
    byDepartment: departmentAnalytics,
    byProject: projectAnalytics
  };
};

/**
 * Format entries for different view types
 */
const formatForCalendarView = (entries) => {
  return entries.map(entry => ({
    id: entry._id,
    title: entry.title,
    start: entry.startDate,
    end: entry.endDate,
    allDay: entry.isAllDay,
    backgroundColor: getStatusColor(entry.status),
    borderColor: getPriorityColor(entry.priority),
    resource: entry
  }));
};

const formatForTimelineView = (entries) => {
  // Group by date and sort chronologically
  const grouped = {};
  entries.forEach(entry => {
    const date = moment(entry.startDate).format('YYYY-MM-DD');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  });
  
  return Object.keys(grouped)
    .sort()
    .map(date => ({
      date,
      entries: grouped[date].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    }));
};

const formatForListView = (entries) => {
  return entries.sort((a, b) => {
    // Sort by priority first, then by due date
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 0;
    const bPriority = priorityOrder[b.priority] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return new Date(a.startDate) - new Date(b.startDate);
  });
};

/**
 * Grouping functions
 */
const groupByProject = (workCalendarEntries, workItems) => {
  const grouped = {};
  
  workCalendarEntries.forEach(entry => {
    const projectId = entry.project?._id?.toString() || 'unassigned';
    const projectName = entry.project?.name || 'Unassigned';
    
    if (!grouped[projectId]) {
      grouped[projectId] = {
        project: entry.project,
        workCalendar: [],
        workItems: [],
        analytics: { total: 0, completed: 0, overdue: 0 }
      };
    }
    
    grouped[projectId].workCalendar.push(entry);
    grouped[projectId].analytics.total++;
    if (entry.status === 'completed') grouped[projectId].analytics.completed++;
    if (entry.isOverdue) grouped[projectId].analytics.overdue++;
  });
  
  workItems.forEach(item => {
    const projectId = item.project?._id?.toString() || 'unassigned';
    
    if (grouped[projectId]) {
      grouped[projectId].workItems.push(item);
    }
  });
  
  return grouped;
};

const groupByEmployee = (workCalendarEntries, workItems) => {
  const grouped = {};
  
  workCalendarEntries.forEach(entry => {
    const employeeId = entry.assignedTo?._id?.toString() || 'unassigned';
    
    if (!grouped[employeeId]) {
      grouped[employeeId] = {
        employee: entry.assignedTo,
        workCalendar: [],
        workItems: [],
        analytics: { total: 0, completed: 0, overdue: 0 }
      };
    }
    
    grouped[employeeId].workCalendar.push(entry);
    grouped[employeeId].analytics.total++;
    if (entry.status === 'completed') grouped[employeeId].analytics.completed++;
    if (entry.isOverdue) grouped[employeeId].analytics.overdue++;
  });
  
  return grouped;
};

const groupByDepartment = (workCalendarEntries, workItems) => {
  const grouped = {};
  
  workCalendarEntries.forEach(entry => {
    const deptId = entry.department?._id?.toString() || 'unassigned';
    
    if (!grouped[deptId]) {
      grouped[deptId] = {
        department: entry.department,
        workCalendar: [],
        workItems: [],
        analytics: { total: 0, completed: 0, overdue: 0 }
      };
    }
    
    grouped[deptId].workCalendar.push(entry);
    grouped[deptId].analytics.total++;
    if (entry.status === 'completed') grouped[deptId].analytics.completed++;
    if (entry.isOverdue) grouped[deptId].analytics.overdue++;
  });
  
  return grouped;
};

const groupByClient = (workCalendarEntries, workItems) => {
  const grouped = {};
  
  workCalendarEntries.forEach(entry => {
    const clientId = entry.client?._id?.toString() || 'internal';
    
    if (!grouped[clientId]) {
      grouped[clientId] = {
        client: entry.client || { name: 'Internal Work' },
        workCalendar: [],
        workItems: [],
        analytics: { total: 0, completed: 0, overdue: 0 }
      };
    }
    
    grouped[clientId].workCalendar.push(entry);
    grouped[clientId].analytics.total++;
    if (entry.status === 'completed') grouped[clientId].analytics.completed++;
    if (entry.isOverdue) grouped[clientId].analytics.overdue++;
  });
  
  return grouped;
};

const groupByDate = (workCalendarEntries, workItems) => {
  const grouped = {};
  
  workCalendarEntries.forEach(entry => {
    const date = moment(entry.startDate).format('YYYY-MM-DD');
    
    if (!grouped[date]) {
      grouped[date] = {
        date,
        workCalendar: [],
        workItems: [],
        analytics: { total: 0, completed: 0, overdue: 0 }
      };
    }
    
    grouped[date].workCalendar.push(entry);
    grouped[date].analytics.total++;
    if (entry.status === 'completed') grouped[date].analytics.completed++;
    if (entry.isOverdue) grouped[date].analytics.overdue++;
  });
  
  return grouped;
};

/**
 * Get filter options for frontend dropdowns
 */
const getFilterOptions = async () => {
  const [departments, projects, clients, employees] = await Promise.all([
    Department.find({}).select('name').lean(),
    Project.find({}).select('name client').populate('client', 'name').lean(),
    Client.find({}).select('name').lean(),
    User.find({ role: { $in: ['employee', 'hod'] } }).select('name email department').populate('department', 'name').lean()
  ]);

  return {
    departments,
    projects,
    clients,
    employees,
    workTypes: [
      'work-item', 'project-milestone', 'meeting', 'deadline', 
      'review', 'presentation', 'training', 'client-call', 
      'internal-task', 'other'
    ],
    statuses: ['scheduled', 'in-progress', 'completed', 'cancelled', 'postponed', 'overdue'],
    priorities: ['low', 'medium', 'high', 'urgent']
  };
};

/**
 * Utility functions for colors and calculations
 */
const getStatusColor = (status) => {
  const colors = {
    'scheduled': '#6c757d',
    'in-progress': '#0d6efd',
    'completed': '#198754',
    'cancelled': '#dc3545',
    'postponed': '#fd7e14',
    'overdue': '#dc3545'
  };
  return colors[status] || '#6c757d';
};

const getPriorityColor = (priority) => {
  const colors = {
    'low': '#28a745',
    'medium': '#ffc107',
    'high': '#fd7e14',
    'urgent': '#dc3545'
  };
  return colors[priority] || '#6c757d';
};

const calculateAverageEfficiency = (entries) => {
  const entriesWithEfficiency = entries.filter(e => e.efficiencyScore !== null);
  if (entriesWithEfficiency.length === 0) return null;
  
  const sum = entriesWithEfficiency.reduce((acc, e) => acc + e.efficiencyScore, 0);
  return Math.round(sum / entriesWithEfficiency.length);
};

/**
 * Generate comprehensive PDF report
 */
const generatePDFReport = async (options) => {
  const {
    reportType,
    workCalendarEntries,
    workItems,
    filters,
    groupBy,
    includeAnalytics,
    includeCharts,
    generatedBy
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text('Work Calendar Report', { align: 'center' });
      doc.moveDown();

      // Report metadata
      doc.fontSize(12);
      doc.text(`Generated on: ${moment().format('DD MMMM YYYY [at] HH:mm')}`, { align: 'right' });
      doc.text(`Generated by: ${generatedBy.name} (${generatedBy.email})`, { align: 'right' });
      doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, { align: 'right' });
      doc.moveDown();

      // Filters applied
      if (Object.keys(filters).some(key => filters[key])) {
        doc.fontSize(14).text('Filters Applied:', { underline: true });
        doc.fontSize(10);
        
        if (filters.startDate && filters.endDate) {
          doc.text(`Date Range: ${moment(filters.startDate).format('DD MMM YYYY')} - ${moment(filters.endDate).format('DD MMM YYYY')}`);
        }
        if (filters.department) doc.text(`Department: ${filters.department}`);
        if (filters.project) doc.text(`Project: ${filters.project}`);
        if (filters.client) doc.text(`Client: ${filters.client}`);
        if (filters.employee) doc.text(`Employee: ${filters.employee}`);
        if (filters.status) doc.text(`Status: ${filters.status}`);
        if (filters.workType) doc.text(`Work Type: ${filters.workType}`);
        if (filters.priority) doc.text(`Priority: ${filters.priority}`);
        
        doc.moveDown();
      }

      // Analytics summary
      if (includeAnalytics) {
        doc.addPage();
        doc.fontSize(16).text('Analytics Summary', { underline: true });
        doc.moveDown();

        const analytics = calculateEmployeeAnalytics(workCalendarEntries, workItems);
        
        doc.fontSize(12);
        doc.text(`Total Work Entries: ${analytics.totalWork}`);
        doc.text(`Completed Work: ${analytics.completedWork} (${Math.round((analytics.completedWork / analytics.totalWork) * 100)}%)`);
        doc.text(`In Progress Work: ${analytics.inProgressWork}`);
        doc.text(`Scheduled Work: ${analytics.scheduledWork}`);
        doc.text(`Overdue Work: ${analytics.overdueWork}`);
        doc.moveDown();

        doc.text(`Total Work Items: ${analytics.totalWorkItems}`);
        doc.text(`Completed Work Items: ${analytics.completedWorkItems}`);
        doc.text(`Overdue Work Items: ${analytics.overdueWorkItems}`);
        doc.moveDown();

        doc.text(`Total Estimated Hours: ${analytics.totalEstimatedHours}`);
        doc.text(`Total Actual Hours: ${analytics.totalActualHours}`);
        if (analytics.averageEfficiency) {
          doc.text(`Average Efficiency: ${analytics.averageEfficiency}%`);
        }
        doc.moveDown();

        // Workload by priority
        doc.text('Workload by Priority:');
        doc.text(`  Urgent: ${analytics.workloadByPriority.urgent}`);
        doc.text(`  High: ${analytics.workloadByPriority.high}`);
        doc.text(`  Medium: ${analytics.workloadByPriority.medium}`);
        doc.text(`  Low: ${analytics.workloadByPriority.low}`);
        doc.moveDown();
      }

      // Work calendar entries
      if (workCalendarEntries.length > 0) {
        doc.addPage();
        doc.fontSize(16).text('Work Calendar Entries', { underline: true });
        doc.moveDown();

        workCalendarEntries.forEach((entry, index) => {
          if (index > 0 && index % 10 === 0) {
            doc.addPage();
          }

          doc.fontSize(12).text(`${index + 1}. ${entry.title}`, { continued: false });
          doc.fontSize(10);
          
          if (entry.project?.name) {
            doc.text(`Project: ${entry.project.name}`);
          }
          if (entry.assignedTo?.name) {
            doc.text(`Assigned to: ${entry.assignedTo.name}`);
          }
          if (entry.department?.name) {
            doc.text(`Department: ${entry.department.name}`);
          }
          
          doc.text(`Status: ${entry.status}`);
          doc.text(`Priority: ${entry.priority}`);
          doc.text(`Start: ${moment(entry.startDate).format('DD MMM YYYY HH:mm')}`);
          doc.text(`End: ${moment(entry.endDate).format('DD MMM YYYY HH:mm')}`);
          
          if (entry.dueDate) {
            doc.text(`Due: ${moment(entry.dueDate).format('DD MMM YYYY')}`);
          }
          
          if (entry.description) {
            doc.text(`Description: ${entry.description.substring(0, 100)}${entry.description.length > 100 ? '...' : ''}`);
          }
          
          doc.moveDown(0.5);
        });
      }

      // Work items
      if (workItems.length > 0) {
        doc.addPage();
        doc.fontSize(16).text('Work Items', { underline: true });
        doc.moveDown();

        workItems.forEach((item, index) => {
          if (index > 0 && index % 15 === 0) {
            doc.addPage();
          }

          doc.fontSize(12).text(`${index + 1}. ${item.title}`, { continued: false });
          doc.fontSize(10);
          
          if (item.project?.name) {
            doc.text(`Project: ${item.project.name}`);
          }
          if (item.assignedTo?.name) {
            doc.text(`Assigned to: ${item.assignedTo.name}`);
          }
          
          doc.text(`Type: ${item.type}`);
          doc.text(`Status: ${item.status}`);
          doc.text(`Priority: ${item.priority}`);
          doc.text(`Due: ${moment(item.dueDate).format('DD MMM YYYY')}`);
          
          if (item.completedAt) {
            doc.text(`Completed: ${moment(item.completedAt).format('DD MMM YYYY')}`);
          }
          
          if (item.description) {
            doc.text(`Description: ${item.description.substring(0, 80)}${item.description.length > 80 ? '...' : ''}`);
          }
          
          doc.moveDown(0.3);
        });
      }

      // Footer
      doc.fontSize(8).text(
        `Report generated by CRM Work Calendar System - ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

// ============================================
// SYNC AND MAINTENANCE FUNCTIONS
// ============================================

/**
 * Sync work items to work calendar
 * Creates calendar entries for work items that don't have them
 */
export const syncWorkItemsToCalendar = async (req, res) => {
  try {
    // Only admin can trigger sync
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { projectId, employeeId, departmentId } = req.query;

    // Build query for work items to sync
    const workItemQuery = {};
    if (projectId) workItemQuery.project = projectId;
    if (employeeId) workItemQuery.assignedTo = employeeId;
    if (departmentId) {
      const deptProjects = await Project.find({ departments: departmentId }).select('_id');
      workItemQuery.project = { $in: deptProjects.map(p => p._id) };
    }

    const workItems = await WorkItem.find(workItemQuery)
      .populate('project', 'name client departments')
      .populate('assignedTo', 'name email');

    let syncedCount = 0;
    let skippedCount = 0;

    for (const workItem of workItems) {
      const existing = await WorkCalendar.findOne({
        sourceId: workItem._id,
        sourceModel: 'WorkItem'
      });

      if (!existing) {
        const calendarEntry = await createWorkCalendarEntry(workItem);
        if (calendarEntry) {
          syncedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Sync completed. ${syncedCount} entries created, ${skippedCount} already existed.`,
      data: {
        syncedCount,
        skippedCount,
        totalProcessed: workItems.length
      }
    });

  } catch (error) {
    logger.error('Error in syncWorkItemsToCalendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync work items to calendar',
      error: error.message
    });
  }
};

/**
 * Update work calendar entry
 */
export const updateWorkCalendarEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const entry = await WorkCalendar.findById(id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Work calendar entry not found'
      });
    }

    // Permission check
    if (req.user.role === 'employee' && entry.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own work calendar entries'
      });
    }

    // Update entry
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        entry[key] = updates[key];
      }
    });

    entry.lastModifiedBy = req.user.id;
    await entry.save();

    const updatedEntry = await WorkCalendar.findById(id)
      .populate('project', 'name client')
      .populate('assignedTo', 'name email')
      .populate('department', 'name');

    // Broadcast real-time update
    await realTimeUpdateService.broadcastWorkUpdate(updatedEntry, 'update');

    res.status(200).json({
      success: true,
      message: 'Work calendar entry updated successfully',
      data: updatedEntry
    });

  } catch (error) {
    logger.error('Error in updateWorkCalendarEntry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update work calendar entry',
      error: error.message
    });
  }
};

/**
 * Delete work calendar entry
 */
export const deleteWorkCalendarEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await WorkCalendar.findById(id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Work calendar entry not found'
      });
    }

    // Permission check
    if (req.user.role === 'employee' && entry.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own work calendar entries'
      });
    }

    // Don't allow deletion of auto-generated entries
    if (entry.isAutoGenerated) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete auto-generated calendar entries. Update the source work item instead.'
      });
    }

    // Broadcast real-time update before deletion
    await realTimeUpdateService.broadcastWorkUpdate(entry, 'delete');

    await WorkCalendar.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Work calendar entry deleted successfully'
    });

  } catch (error) {
    logger.error('Error in deleteWorkCalendarEntry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete work calendar entry',
      error: error.message
    });
  }
};

/**
 * Sync current user's work items to calendar
 */
export const syncMyWorkItemsToCalendar = async (req, res) => {
  try {
    const employeeId = req.user.id;
    
    // Log sync operation
    logger.info(`Starting work item sync for employee: ${employeeId}`);

    // Get all work items for current user
    const workItems = await WorkItem.find({ assignedTo: employeeId })
      .populate('project', 'name client departments department')
      .populate('assignedTo', 'name email');

    logger.info(`Found ${workItems.length} work items for employee: ${employeeId}`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const workItem of workItems) {
      try {
        const existing = await WorkCalendar.findOne({
          sourceId: workItem._id,
          sourceModel: 'WorkItem'
        });

        if (!existing) {
          const calendarEntry = await createWorkCalendarEntry(workItem);
          if (calendarEntry) {
            syncedCount++;
            logger.info(`Synced work item: ${workItem.title}`);
          } else {
            errorCount++;
            errors.push(`Failed to create calendar entry for: ${workItem.title}`);
          }
        } else {
          skippedCount++;
          logger.debug(`Skipped existing work item: ${workItem.title}`);
        }
      } catch (itemError) {
        errorCount++;
        errors.push(`Error processing ${workItem.title}: ${itemError.message}`);
        logger.error(`Error processing work item ${workItem._id}:`, itemError);
      }
    }

    const message = `Sync completed. ${syncedCount} entries created, ${skippedCount} already existed${errorCount > 0 ? `, ${errorCount} errors` : ''}.`;
    
    res.status(200).json({
      success: true,
      message,
      data: {
        syncedCount,
        skippedCount,
        errorCount,
        totalProcessed: workItems.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    logger.error('Error in syncMyWorkItemsToCalendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync your work items to calendar',
      error: error.message
    });
  }
};

/**
 * Create manual work calendar entry (API endpoint)
 */
export const createWorkCalendarEntryAPI = async (req, res) => {
  try {
    const {
      title,
      description,
      workType,
      assignedTo,
      department,
      project,
      client,
      startDate,
      endDate,
      dueDate,
      priority,
      isAllDay,
      location,
      meetingUrl,
      tags
    } = req.body;

    // Validation
    if (!title || !assignedTo || !department || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, assignedTo, department, startDate, and endDate are required'
      });
    }

    // Permission check
    if (req.user.role === 'employee' && assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Employees can only create calendar entries for themselves'
      });
    }

    const calendarEntry = new WorkCalendar({
      title,
      description,
      workType: workType || 'other',
      assignedTo,
      department,
      project,
      client,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'medium',
      isAllDay: isAllDay || false,
      location,
      meetingUrl,
      tags: tags || [],
      status: 'scheduled',
      isAutoGenerated: false,
      createdBy: req.user.id
    });

    await calendarEntry.save();

    const populatedEntry = await WorkCalendar.findById(calendarEntry._id)
      .populate('project', 'name client')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('client', 'name');

    // Broadcast real-time update
    await realTimeUpdateService.broadcastWorkUpdate(populatedEntry, 'create');

    res.status(201).json({
      success: true,
      message: 'Work calendar entry created successfully',
      data: populatedEntry
    });

  } catch (error) {
    logger.error('Error in createWorkCalendarEntry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create work calendar entry',
      error: error.message
    });
  }
};

// ============================================
// EXPORT FUNCTIONALITY
// ============================================

/**
 * Enhanced export work data with background processing and job queue
 */
export const exportWorkData = async (req, res) => {
  try {
    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required for data export.'
      });
    }

    const {
      filters = {},
      format = 'csv',
      columns = [],
      includeAnalytics = false,
      backgroundProcessing = true
    } = req.body;

    // Validate format
    if (!['csv', 'excel', 'pdf'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported formats: csv, excel, pdf'
      });
    }

    logger.info('Export request received:', {
      user: req.user.id,
      format,
      filters,
      includeAnalytics,
      backgroundProcessing
    });

    // Build filter
    const filter = await buildAdvancedFilter(filters);

    // Get work entries
    const workEntries = await WorkCalendar.find(filter)
      .populate('project', 'name client status')
      .populate('client', 'name email company')
      .populate('department', 'name')
      .populate('assignedTo', 'name email role')
      .sort({ startDate: 1 })
      .lean();

    // Add computed fields for export
    const enhancedWorkEntries = workEntries.map(entry => ({
      ...entry,
      isOverdue: entry.dueDate ? new Date() > new Date(entry.dueDate) && entry.status !== 'completed' : false,
      daysUntilDue: entry.dueDate ? Math.ceil((new Date(entry.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      formattedStartDate: entry.startDate ? new Date(entry.startDate).toLocaleDateString() : null,
      formattedDueDate: entry.dueDate ? new Date(entry.dueDate).toLocaleDateString() : null,
      formattedEndDate: entry.endDate ? new Date(entry.endDate).toLocaleDateString() : null
    }));

    if (backgroundProcessing && enhancedWorkEntries.length > 100) {
      // Use background processing for large datasets
      const jobId = await exportService.createExportJob({
        format,
        workEntries: enhancedWorkEntries,
        columns,
        includeAnalytics,
        filters,
        requestedBy: req.user.id
      });

      res.status(202).json({
        success: true,
        message: 'Export job created successfully',
        data: {
          jobId,
          status: 'queued',
          estimatedTime: Math.ceil(enhancedWorkEntries.length / 10), // Rough estimate in seconds
          statusUrl: `/api/work-calendar/admin/export/${jobId}`
        }
      });

    } else {
      // Process synchronously for small datasets or when requested
      try {
        let exportData;
        let filename;
        let contentType;

        switch (format) {
          case 'csv':
            exportData = await exportService.generateEnhancedCSV(enhancedWorkEntries, columns, includeAnalytics);
            filename = `work-export-${new Date().toISOString().split('T')[0]}.csv`;
            contentType = 'text/csv';
            break;
          case 'excel':
            exportData = await exportService.generateEnhancedExcel(enhancedWorkEntries, columns, includeAnalytics, filters);
            filename = `work-export-${new Date().toISOString().split('T')[0]}.xlsx`;
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
          case 'pdf':
            exportData = await exportService.generateEnhancedPDF(enhancedWorkEntries, columns, includeAnalytics, filters);
            filename = `work-export-${new Date().toISOString().split('T')[0]}.pdf`;
            contentType = 'application/pdf';
            break;
        }

        // Set response headers for download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', exportData.length);

        // Send the file
        res.send(exportData);

      } catch (exportError) {
        logger.error('Export processing error:', exportError);
        res.status(500).json({
          success: false,
          message: 'Export processing failed',
          error: exportError.message
        });
      }
    }

  } catch (error) {
    logger.error('Error in exportWorkData:', error);
    res.status(500).json({
      success: false,
      message: 'Export request failed',
      error: error.message
    });
  }
};

/**
 * Get export job status with enhanced tracking
 */
export const getExportStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin, HR, or Manager privileges required.'
      });
    }

    const job = exportService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Export job not found'
      });
    }

    const response = {
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        message: this.getStatusMessage(job.status, job.progress)
      }
    };

    // Add result data if completed
    if (job.status === 'completed' && job.result) {
      response.data.result = {
        filename: job.result.filename,
        size: job.result.size,
        downloadUrl: job.result.downloadUrl,
        contentType: job.result.contentType
      };
    }

    // Add error if failed
    if (job.status === 'failed' && job.error) {
      response.data.error = job.error;
    }

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in getExportStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get export status',
      error: error.message
    });
  }
};

/**
 * Get all export jobs (for monitoring)
 */
export const getAllExportJobs = async (req, res) => {
  try {
    // Permission check - only admin, superadmin, hr, manager can see all jobs
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin, HR, or Manager privileges required.'
      });
    }

    const jobs = exportService.getAllJobs();

    res.status(200).json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          id: job.id,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          format: job.data?.format,
          entryCount: job.data?.workEntries?.length || 0
        })),
        totalJobs: jobs.length
      }
    });

  } catch (error) {
    logger.error('Error in getAllExportJobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get export jobs',
      error: error.message
    });
  }
};

/**
 * Cancel export job
 */
export const cancelExportJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin, HR, or Manager privileges required.'
      });
    }

    const cancelled = exportService.cancelJob(jobId);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: 'Job cannot be cancelled (not found or already completed)'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Export job cancelled successfully'
    });

  } catch (error) {
    logger.error('Error in cancelExportJob:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel export job',
      error: error.message
    });
  }
};

/**
 * Download export file
 */
export const downloadExportFile = async (req, res) => {
  try {
    const { filename } = req.params;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const filePath = path.join(process.cwd(), 'exports', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Export file not found or has expired'
      });
    }

    // Determine content type from file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.csv':
        contentType = 'text/csv';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    logger.error('Error in downloadExportFile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download export file',
      error: error.message
    });
  }
};

/**
 * Get status message for job
 */
const getStatusMessage = (status, progress) => {
  switch (status) {
    case 'queued':
      return 'Export job is queued for processing';
    case 'processing':
      return `Export in progress (${progress}% complete)`;
    case 'completed':
      return 'Export completed successfully';
    case 'failed':
      return 'Export failed';
    case 'cancelled':
      return 'Export was cancelled';
    default:
      return 'Unknown status';
  }
};

// ============================================
// ENHANCED HELPER FUNCTIONS FOR ADVANCED FILTERING
// ============================================

/**
 * Build advanced filter with client focus and complex criteria
 */
const buildAdvancedFilter = async (filterParams) => {
  const {
    startDate,
    endDate,
    client,
    project,
    employee,
    department,
    status,
    priority,
    workType,
    company,
    search,
    tags,
    customFilters,
    vipOnly
  } = filterParams;

  const filter = {};

  // Date range filter - Filter by due date (when work should be done)
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter by dueDate for better work scheduling
    filter.dueDate = {
      $gte: start,
      $lte: end
    };
  }

  // Client filter - primary focus for admin overview
  if (client && client !== 'all') {
    filter.client = client;
  }

  // VIP Client filter - show only VIP clients' work
  if (vipOnly === 'true' || vipOnly === true) {
    // Get VIP client IDs
    const vipClients = await Client.find({ isVip: true }).select('_id').lean();
    const vipClientIds = vipClients.map(c => c._id);
    
    if (vipClientIds.length > 0) {
      filter.client = { $in: vipClientIds };
    } else {
      // No VIP clients found, return empty result
      filter._id = { $in: [] };
    }
  }

  // Project filter
  if (project && project !== 'all') {
    filter.project = project;
  }

  // Employee filter
  if (employee && employee !== 'all') {
    filter.assignedTo = employee;
  }

  // Department filter
  if (department && department !== 'all') {
    filter.department = department;
  }

  // Status filter
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Priority filter
  if (priority && priority !== 'all') {
    filter.priority = priority;
  }

  // Work type filter
  if (workType && workType !== 'all') {
    filter.workType = workType;
  }

  // Company filter - filter by service company
  if (company && company !== 'all') {
    // Get clients that belong to the specified company
    const companyClients = await Client.find({ company: company }).select('_id').lean();
    const companyClientIds = companyClients.map(c => c._id);
    
    if (companyClientIds.length > 0) {
      // If there's already a client filter, combine them
      if (filter.client) {
        if (filter.client.$in) {
          // Intersect with existing client filter
          filter.client = { $in: filter.client.$in.filter(id => companyClientIds.some(cId => cId.toString() === id.toString())) };
        } else {
          // Check if the single client is in the company
          const singleClientInCompany = companyClientIds.some(cId => cId.toString() === filter.client.toString());
          if (!singleClientInCompany) {
            filter._id = { $in: [] }; // No results
          }
        }
      } else {
        // No existing client filter, use company clients
        filter.client = { $in: companyClientIds };
      }
    } else {
      // No clients found for this company, return empty result
      filter._id = { $in: [] };
    }
  }

  // Global search across text fields
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { 'notes.text': searchRegex },
      { tags: { $in: [searchRegex] } }
    ];
  }

  // Tags filter
  if (tags && Array.isArray(tags) && tags.length > 0) {
    filter.tags = { $in: tags };
  }

  return filter;
};

/**
 * Build custom criteria filter for advanced filtering
 */
const buildCustomCriteriaFilter = (customCriteria, logicalOperator) => {
  const criteriaFilters = customCriteria.map(criteria => {
    const { field, operator, value, dataType } = criteria;
    let fieldFilter = {};

    switch (operator) {
      case 'equals':
        fieldFilter[field] = value;
        break;
      case 'contains':
        fieldFilter[field] = new RegExp(value, 'i');
        break;
      case 'startsWith':
        fieldFilter[field] = new RegExp(`^${value}`, 'i');
        break;
      case 'endsWith':
        fieldFilter[field] = new RegExp(`${value}$`, 'i');
        break;
      case 'greaterThan':
        fieldFilter[field] = { $gt: dataType === 'date' ? new Date(value) : value };
        break;
      case 'lessThan':
        fieldFilter[field] = { $lt: dataType === 'date' ? new Date(value) : value };
        break;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          fieldFilter[field] = {
            $gte: dataType === 'date' ? new Date(value[0]) : value[0],
            $lte: dataType === 'date' ? new Date(value[1]) : value[1]
          };
        }
        break;
    }

    return fieldFilter;
  });

  if (logicalOperator === 'OR') {
    return { $or: criteriaFilters };
  } else {
    return { $and: criteriaFilters };
  }
};

/**
 * Calculate workload impact for spreadsheet display
 */
const calculateWorkloadImpact = (workEntry) => {
  const estimatedHours = workEntry.timeTracking?.estimatedHours || 0;
  const priority = workEntry.priority;
  
  if (priority === 'urgent' || estimatedHours > 8) return 'high';
  if (priority === 'high' || estimatedHours > 4) return 'medium';
  return 'low';
};

/**
 * Calculate enhanced analytics with client focus
 */
const calculateEnhancedAnalytics = async (filter) => {
  try {
    // Overall metrics
    const overallPipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          inProgressWork: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
          totalEstimatedHours: { $sum: "$timeTracking.estimatedHours" },
          totalActualHours: { $sum: "$timeTracking.actualHours" },
          avgProgress: { $avg: "$progress" }
        }
      }
    ];

    // Client breakdown
    const clientPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$client',
          clientName: { $first: '$clientInfo.name' },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
          totalHours: { $sum: "$timeTracking.estimatedHours" }
        }
      },
      { $sort: { totalWork: -1 } }
    ];

    // Project breakdown with slot information
    const projectPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectInfo'
        }
      },
      { $unwind: { path: '$projectInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'slots',
          localField: 'project',
          foreignField: 'project',
          as: 'projectSlots'
        }
      },
      {
        $group: {
          _id: '$project',
          projectName: { $first: '$projectInfo.name' },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
          totalHours: { $sum: "$timeTracking.estimatedHours" },
          // Slot information
          totalSlots: { $first: { $size: "$projectSlots" } },
          completedSlots: { 
            $first: { 
              $size: { 
                $filter: { 
                  input: "$projectSlots", 
                  cond: { $eq: ["$$this.assignmentStatus", "completed"] } 
                } 
              } 
            } 
          }
        }
      },
      { $sort: { totalWork: -1 } }
    ];

    // Employee breakdown
    const employeePipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'employeeInfo'
        }
      },
      { $unwind: { path: '$employeeInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$assignedTo',
          employeeName: { $first: '$employeeInfo.name' },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
          totalHours: { $sum: "$timeTracking.estimatedHours" },
          avgProgress: { $avg: "$progress" }
        }
      },
      { $sort: { totalWork: -1 } }
    ];

    // Department breakdown
    const departmentPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      { $unwind: { path: '$departmentInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$department',
          departmentName: { $first: '$departmentInfo.name' },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
          totalHours: { $sum: "$timeTracking.estimatedHours" }
        }
      },
      { $sort: { totalWork: -1 } }
    ];

    // Execute all pipelines
    const [overall, byClient, byProject, byEmployee, byDepartment] = await Promise.all([
      WorkCalendar.aggregate(overallPipeline),
      WorkCalendar.aggregate(clientPipeline),
      WorkCalendar.aggregate(projectPipeline),
      WorkCalendar.aggregate(employeePipeline),
      WorkCalendar.aggregate(departmentPipeline)
    ]);

    return {
      overall: overall[0] || {
        totalWork: 0,
        completedWork: 0,
        inProgressWork: 0,
        overdueWork: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        avgProgress: 0
      },
      byClient: byClient.slice(0, 10), // Top 10 clients
      byProject: byProject.slice(0, 10), // Top 10 projects
      byEmployee: byEmployee.slice(0, 10), // Top 10 employees
      byDepartment: byDepartment.slice(0, 10), // Top 10 departments
      workloadByPriority: await getWorkloadByPriority(filter)
    };

  } catch (error) {
    logger.error('Error calculating enhanced analytics:', error);
    return null;
  }
};

/**
 * Get workload breakdown by priority
 */
const getWorkloadByPriority = async (filter) => {
  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 },
        totalHours: { $sum: '$timeTracking.estimatedHours' }
      }
    }
  ];

  const results = await WorkCalendar.aggregate(pipeline);
  
  // Convert to object format
  const priorityBreakdown = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  results.forEach(result => {
    if (priorityBreakdown.hasOwnProperty(result._id)) {
      priorityBreakdown[result._id] = result.count;
    }
  });

  return priorityBreakdown;
};

/**
 * Group work data by specified dimension
 */
const groupWorkData = async (workEntries, groupBy) => {
  const grouped = {};

  workEntries.forEach(entry => {
    let groupKey;
    let groupInfo;

    switch (groupBy) {
      case 'client':
        groupKey = entry.client?._id || 'no-client';
        groupInfo = {
          client: entry.client,
          name: entry.client?.name || 'Internal Work'
        };
        break;
      case 'project':
        groupKey = entry.project?._id || 'no-project';
        groupInfo = {
          project: entry.project,
          name: entry.project?.name || 'No Project'
        };
        break;
      case 'employee':
        groupKey = entry.assignedTo?._id || 'unassigned';
        groupInfo = {
          employee: entry.assignedTo,
          name: entry.assignedTo?.name || 'Unassigned'
        };
        break;
      case 'department':
        groupKey = entry.department?._id || 'no-department';
        groupInfo = {
          department: entry.department,
          name: entry.department?.name || 'No Department'
        };
        break;
      case 'status':
        groupKey = entry.status;
        groupInfo = {
          status: entry.status,
          name: entry.status.charAt(0).toUpperCase() + entry.status.slice(1)
        };
        break;
      default:
        groupKey = 'all';
        groupInfo = { name: 'All Work' };
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        ...groupInfo,
        workEntries: [],
        analytics: {
          total: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
          totalHours: 0
        }
      };
    }

    grouped[groupKey].workEntries.push(entry);
    grouped[groupKey].analytics.total++;
    
    if (entry.status === 'completed') grouped[groupKey].analytics.completed++;
    if (entry.status === 'in-progress') grouped[groupKey].analytics.inProgress++;
    if (entry.isOverdue) grouped[groupKey].analytics.overdue++;
    
    grouped[groupKey].analytics.totalHours += entry.timeTracking?.estimatedHours || 0;
  });

  return grouped;
};

/**
 * Get enhanced filter options for frontend dropdowns
 */
const getEnhancedFilterOptions = async () => {
  try {
    const [clients, projects, employees, departments] = await Promise.all([
      Client.find({ status: 'active' }).select('name email company').sort({ name: 1 }),
      Project.find({ status: 'active' }).populate('client', 'name').select('name client').sort({ name: 1 }),
      User.find({ 
        role: { $in: ['employee', 'hod', 'manager'] },
        status: 'active' 
      }).select('name email role department').sort({ name: 1 }),
      Department.find({ status: 'active' }).select('name description').sort({ name: 1 })
    ]);

    return {
      clients,
      projects,
      employees,
      departments,
      statuses: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'postponed', label: 'Postponed' }
      ],
      priorities: [
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ],
      workTypes: [
        { value: 'work-item', label: 'Work Item' },
        { value: 'project-milestone', label: 'Project Milestone' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'deadline', label: 'Deadline' },
        { value: 'review', label: 'Review' },
        { value: 'presentation', label: 'Presentation' },
        { value: 'training', label: 'Training' },
        { value: 'client-call', label: 'Client Call' },
        { value: 'internal-task', label: 'Internal Task' },
        { value: 'other', label: 'Other' }
      ]
    };
  } catch (error) {
    logger.error('Error getting enhanced filter options:', error);
    return {
      clients: [],
      projects: [],
      employees: [],
      departments: [],
      statuses: [],
      priorities: [],
      workTypes: []
    };
  }
};

// ============================================
// EXPORT HELPER FUNCTIONS
// ============================================

/**
 * Generate CSV export data
 */
const generateCSVExport = (workEntries, columns, includeAnalytics) => {
  // Default columns if none specified
  const defaultColumns = [
    'title',
    'assignedTo.name',
    'client.name',
    'project.name',
    'department.name',
    'status',
    'priority',
    'workType',
    'startDate',
    'dueDate',
    'endDate',
    'timeTracking.estimatedHours',
    'timeTracking.actualHours',
    'progress'
  ];

  const exportColumns = columns.length > 0 ? columns : defaultColumns;

  // Generate CSV header
  const headers = exportColumns.map(col => {
    const headerMap = {
      'title': 'Title',
      'assignedTo.name': 'Assigned To',
      'client.name': 'Client',
      'project.name': 'Project',
      'department.name': 'Department',
      'status': 'Status',
      'priority': 'Priority',
      'workType': 'Work Type',
      'startDate': 'Start Date',
      'dueDate': 'Due Date',
      'endDate': 'End Date',
      'timeTracking.estimatedHours': 'Estimated Hours',
      'timeTracking.actualHours': 'Actual Hours',
      'progress': 'Progress (%)'
    };
    return headerMap[col] || col;
  });

  // Generate CSV rows
  const rows = workEntries.map(entry => {
    return exportColumns.map(col => {
      let value = getNestedValue(entry, col);
      
      // Format dates
      if (col.includes('Date') && value) {
        value = new Date(value).toLocaleDateString();
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Escape CSV values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  return Buffer.from(csvContent, 'utf8');
};

/**
 * Generate Excel export data (simplified - in production use a proper Excel library)
 */
const generateExcelExport = async (workEntries, columns, includeAnalytics) => {
  // For now, return CSV format with Excel extension
  // In production, use libraries like 'exceljs' or 'xlsx'
  const csvData = generateCSVExport(workEntries, columns, includeAnalytics);
  return csvData;
};

/**
 * Generate PDF export data (simplified)
 */
const generatePDFExport = async (workEntries, columns, includeAnalytics) => {
  // Create a simple PDF with work data
  const doc = new PDFDocument();
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Add title
  doc.fontSize(20).text('Work Management Report', 50, 50);
  doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80);
  doc.text(`Total Entries: ${workEntries.length}`, 50, 100);

  // Add work entries (simplified)
  let yPosition = 140;
  workEntries.slice(0, 50).forEach((entry, index) => { // Limit to 50 entries for PDF
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    doc.text(`${index + 1}. ${entry.title}`, 50, yPosition);
    doc.text(`   Assigned: ${entry.assignedTo?.name || 'N/A'}`, 70, yPosition + 15);
    doc.text(`   Client: ${entry.client?.name || 'N/A'}`, 70, yPosition + 30);
    doc.text(`   Status: ${entry.status}`, 70, yPosition + 45);
    
    yPosition += 70;
  });

  if (workEntries.length > 50) {
    doc.text(`... and ${workEntries.length - 50} more entries`, 50, yPosition + 20);
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
};

/**
 * Get nested object value by dot notation path
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

// Duplicate functions removed - using the ones defined above

// ============================================
// REAL-TIME ANALYTICS ENDPOINT
// ============================================

/**
 * Get comprehensive work calendar analytics with client focus
 * Uses the analytics engine for advanced calculations and caching
 */
export const getWorkCalendarAnalytics = async (req, res) => {
  try {
    // Permission check - only admin, superadmin, hr, manager can access analytics
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required for analytics.'
      });
    }

    // Extract filters from query parameters
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      client: req.query.client,
      project: req.query.project,
      employee: req.query.employee,
      department: req.query.department,
      status: req.query.status,
      priority: req.query.priority,
      workType: req.query.workType,
      search: req.query.search
    };

    // Remove undefined/null filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === null || filters[key] === 'all') {
        delete filters[key];
      }
    });

    logger.info('Analytics request received:', {
      user: req.user.id,
      role: req.user.role,
      filters
    });

    // Try to use analytics engine, fallback to basic analytics if it fails
    let analytics;
    try {
      analytics = await analyticsEngine.calculateComprehensiveAnalytics(filters);
    } catch (analyticsError) {
      logger.error('Analytics engine error, using fallback:', analyticsError);
      
      // Fallback to basic analytics
      analytics = await calculateBasicAnalytics(filters);
    }

    if (!analytics) {
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate analytics'
      });
    }

    // Add request metadata
    analytics.metadata = {
      ...analytics.metadata,
      requestedBy: req.user.id,
      requestedAt: new Date(),
      filters
    };

    res.json({
      success: true,
      data: analytics,
      message: 'Analytics calculated successfully'
    });

  } catch (error) {
    logger.error('Error in getWorkCalendarAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
};

/**
 * Calculate basic analytics as fallback
 */
const calculateBasicAnalytics = async (filters) => {
  try {
    // Build query
    const query = {};
    
    if (filters.startDate || filters.endDate) {
      query.startDate = {};
      if (filters.startDate) query.startDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.startDate.$lte = new Date(filters.endDate);
    }
    
    if (filters.client) query.client = filters.client;
    if (filters.project) query.project = filters.project;
    if (filters.employee) query.assignedTo = filters.employee;
    if (filters.department) query.department = filters.department;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.workType) query.workType = filters.workType;

    // Get all work entries
    const workEntries = await WorkCalendar.find(query)
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name')
      .populate('department', 'name')
      .lean();

    // Calculate basic metrics
    const totalWork = workEntries.length;
    const completedWork = workEntries.filter(w => w.status === 'completed').length;
    const overdueWork = workEntries.filter(w => w.status === 'overdue' || (w.dueDate && new Date(w.dueDate) < new Date() && w.status !== 'completed')).length;
    const inProgressWork = workEntries.filter(w => w.status === 'in-progress').length;

    // Group by client
    const byClient = {};
    workEntries.forEach(entry => {
      const clientName = entry.client?.name || 'Internal Work';
      if (!byClient[clientName]) {
        byClient[clientName] = { clientName, totalWork: 0, completedWork: 0, overdueWork: 0 };
      }
      byClient[clientName].totalWork++;
      if (entry.status === 'completed') byClient[clientName].completedWork++;
      if (entry.status === 'overdue' || (entry.dueDate && new Date(entry.dueDate) < new Date() && entry.status !== 'completed')) {
        byClient[clientName].overdueWork++;
      }
    });

    // Group by project
    const byProject = {};
    workEntries.forEach(entry => {
      const projectName = entry.project?.name || 'No Project';
      if (!byProject[projectName]) {
        byProject[projectName] = { projectName, totalWork: 0, completedWork: 0, overdueWork: 0 };
      }
      byProject[projectName].totalWork++;
      if (entry.status === 'completed') byProject[projectName].completedWork++;
      if (entry.status === 'overdue' || (entry.dueDate && new Date(entry.dueDate) < new Date() && entry.status !== 'completed')) {
        byProject[projectName].overdueWork++;
      }
    });

    // Group by employee
    const byEmployee = {};
    workEntries.forEach(entry => {
      const employeeName = entry.assignedTo?.name || 'Unassigned';
      if (!byEmployee[employeeName]) {
        byEmployee[employeeName] = { employeeName, totalWork: 0, completedWork: 0, overdueWork: 0, avgProgress: 0 };
      }
      byEmployee[employeeName].totalWork++;
      if (entry.status === 'completed') byEmployee[employeeName].completedWork++;
      if (entry.status === 'overdue' || (entry.dueDate && new Date(entry.dueDate) < new Date() && entry.status !== 'completed')) {
        byEmployee[employeeName].overdueWork++;
      }
      byEmployee[employeeName].avgProgress += entry.completionPercentage || 0;
    });

    // Calculate average progress
    Object.values(byEmployee).forEach(emp => {
      emp.avgProgress = emp.totalWork > 0 ? Math.round(emp.avgProgress / emp.totalWork) : 0;
    });

    // Group by department
    const byDepartment = {};
    workEntries.forEach(entry => {
      const deptName = entry.department?.name || 'No Department';
      if (!byDepartment[deptName]) {
        byDepartment[deptName] = { departmentName: deptName, totalWork: 0, completedWork: 0, overdueWork: 0 };
      }
      byDepartment[deptName].totalWork++;
      if (entry.status === 'completed') byDepartment[deptName].completedWork++;
      if (entry.status === 'overdue' || (entry.dueDate && new Date(entry.dueDate) < new Date() && entry.status !== 'completed')) {
        byDepartment[deptName].overdueWork++;
      }
    });

    // Workload by priority
    const workloadByPriority = {};
    workEntries.forEach(entry => {
      const priority = entry.priority || 'medium';
      workloadByPriority[priority] = (workloadByPriority[priority] || 0) + 1;
    });

    return {
      overall: {
        totalWork,
        completedWork,
        overdueWork,
        inProgressWork,
        totalEstimatedHours: workEntries.reduce((sum, w) => sum + (w.timeTracking?.estimatedHours || 0), 0),
        totalActualHours: workEntries.reduce((sum, w) => sum + (w.timeTracking?.actualHours || 0), 0)
      },
      byClient: Object.values(byClient),
      byProject: Object.values(byProject),
      byEmployee: Object.values(byEmployee),
      byDepartment: Object.values(byDepartment),
      workloadByPriority,
      metadata: {
        calculatedAt: new Date(),
        filters,
        fallbackMode: true
      }
    };
  } catch (error) {
    logger.error('Error in calculateBasicAnalytics:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time analytics updates via WebSocket
 * This endpoint registers the client for analytics updates
 */
export const subscribeToAnalyticsUpdates = async (req, res) => {
  try {
    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required for real-time analytics.'
      });
    }

    const { filters } = req.body;

    // Subscribe to analytics updates
    const unsubscribe = analyticsEngine.subscribe((event, data) => {
      // In a real WebSocket implementation, this would send data to the client
      // For now, we'll just log the event
      logger.info('Analytics update:', { event, user: req.user.id });
    });

    // Store unsubscribe function (in production, use a proper session store)
    req.session = req.session || {};
    req.session.analyticsUnsubscribe = unsubscribe;

    res.json({
      success: true,
      message: 'Subscribed to analytics updates',
      subscriptionId: `analytics_${req.user.id}_${Date.now()}`
    });

  } catch (error) {
    logger.error('Error in subscribeToAnalyticsUpdates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to analytics updates',
      error: error.message
    });
  }
};

/**
 * Invalidate analytics cache
 * Useful when data changes and fresh analytics are needed
 */
export const invalidateAnalyticsCache = async (req, res) => {
  try {
    // Permission check - only admin/superadmin can invalidate cache
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required to invalidate cache.'
      });
    }

    const { pattern } = req.body;

    // Invalidate cache
    analyticsEngine.invalidateCache(pattern);

    logger.info('Analytics cache invalidated:', {
      user: req.user.id,
      pattern: pattern || 'all'
    });

    res.json({
      success: true,
      message: 'Analytics cache invalidated successfully'
    });

  } catch (error) {
    logger.error('Error in invalidateAnalyticsCache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate analytics cache',
      error: error.message
    });
  }
};

/**
 * Get analytics cache statistics
 * Useful for monitoring and debugging
 */
export const getAnalyticsCacheStats = async (req, res) => {
  try {
    // Permission check
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required for cache stats.'
      });
    }

    const stats = analyticsEngine.getCacheStats();

    res.json({
      success: true,
      data: stats,
      message: 'Cache statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('Error in getAnalyticsCacheStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: error.message
    });
  }
};

// ============================================
// SLOT MANAGEMENT ENDPOINTS
// ============================================

/**
 * Get available slots for a project
 * GET /api/work-calendar/projects/:projectId/slots/available
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { slotType, priority, workType, includeAll } = req.query;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    const filters = {};
    if (slotType) filters.slotType = slotType;
    if (priority) filters.priority = priority;
    if (workType) filters.workType = workType;

    let result;
    
    if (includeAll === 'true') {
      // Get all slots (both available and assigned) for display purposes
      const Slot = (await import('../models/slotModel.js')).default;
      
      const allSlots = await Slot.find({ 
        project: projectId,
        ...filters 
      })
        .sort({ slotNumber: 1 })
        .populate('project', 'name client slotConfiguration')
        .populate('assignedWorkItem', 'title status assignedTo')
        .populate('assignedTo', 'name email')
        .populate({
          path: 'assignedWorkItem',
          populate: {
            path: 'assignedTo',
            select: 'name email'
          }
        })
        .lean();

      result = {
        slots: allSlots,
        count: allSlots.length,
        availableCount: allSlots.filter(slot => 
          slot.assignmentStatus === 'available' && !slot.assignedWorkItem
        ).length,
        assignedCount: allSlots.filter(slot => 
          slot.assignmentStatus === 'assigned' || slot.assignedWorkItem
        ).length
      };
    } else {
      // Get only available slots (original behavior)
      result = await slotManagementService.getAvailableSlots(projectId, filters);
    }

    res.json({
      success: true,
      data: result,
      message: includeAll === 'true' 
        ? `Found ${result.count} total slots (${result.availableCount} available, ${result.assignedCount} assigned)`
        : `Found ${result.count} available slots`
    });

  } catch (error) {
    logger.error('Error in getAvailableSlots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available slots',
      error: error.message
    });
  }
};

/**
 * Assign work item to slot
 * POST /api/work-calendar/slots/:slotId/assign
 */
export const assignWorkItemToSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { workItemId, notes } = req.body;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    if (!workItemId) {
      return res.status(400).json({
        success: false,
        message: 'Work item ID is required'
      });
    }

    const result = await slotManagementService.assignWorkItemToSlot(
      workItemId,
      slotId,
      req.user.id,
      { notes }
    );

    res.json({
      success: true,
      data: result,
      message: 'Work item assigned to slot successfully'
    });

  } catch (error) {
    logger.error('Error in assignWorkItemToSlot:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to assign work item to slot'
    });
  }
};

/**
 * Release work item from slot
 * POST /api/work-calendar/work-items/:workItemId/release-slot
 */
export const releaseSlotFromWorkItem = async (req, res) => {
  try {
    const { workItemId } = req.params;
    const { reason = 'Manual release' } = req.body;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    const result = await slotManagementService.releaseSlotFromWorkItem(
      workItemId,
      req.user.id,
      reason
    );

    res.json({
      success: true,
      data: result,
      message: 'Slot released from work item successfully'
    });

  } catch (error) {
    logger.error('Error in releaseSlotFromWorkItem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release slot from work item',
      error: error.message
    });
  }
};

/**
 * Complete a slot
 * POST /api/work-calendar/slots/:slotId/complete
 */
export const completeSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { notes, requiresApproval = false } = req.body;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    const result = await slotManagementService.completeSlot(
      slotId,
      req.user.id,
      { notes, requiresApproval }
    );

    res.json({
      success: true,
      data: result,
      message: 'Slot completed successfully'
    });

  } catch (error) {
    logger.error('Error in completeSlot:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete slot'
    });
  }
};

/**
 * Get project slot statistics
 * GET /api/work-calendar/projects/:projectId/slots/statistics
 */
export const getProjectSlotStatistics = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    const statistics = await slotManagementService.getProjectSlotStatistics(projectId);

    res.json({
      success: true,
      data: statistics,
      message: 'Project slot statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('Error in getProjectSlotStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project slot statistics',
      error: error.message
    });
  }
};

/**
 * Create slots for a project
 * POST /api/work-calendar/projects/:projectId/slots/create
 */
export const createSlotsForProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { count, startingSlotNumber, slotType = 'work' } = req.body;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    const options = {
      count,
      startingSlotNumber,
      slotType,
      createdBy: req.user.id
    };

    const result = await slotManagementService.createSlotsForProject(projectId, options);

    res.json({
      success: true,
      data: result,
      message: result.message
    });

  } catch (error) {
    logger.error('Error in createSlotsForProject:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create slots for project'
    });
  }
};

/**
 * Detect slot conflicts for a project
 * GET /api/work-calendar/projects/:projectId/slots/conflicts
 */
export const detectSlotConflicts = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const conflicts = await slotManagementService.detectSlotConflicts(projectId);

    res.json({
      success: true,
      data: conflicts,
      message: conflicts.hasConflicts ? 
        `Found ${conflicts.conflictCount} slot conflicts` : 
        'No slot conflicts detected'
    });

  } catch (error) {
    logger.error('Error in detectSlotConflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect slot conflicts',
      error: error.message
    });
  }
};

/**
 * Resolve slot conflicts for a project
 * POST /api/work-calendar/projects/:projectId/slots/resolve-conflicts
 */
export const resolveSlotConflicts = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { conflicts } = req.body;

    // Permission check
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    if (!conflicts || !Array.isArray(conflicts)) {
      return res.status(400).json({
        success: false,
        message: 'Conflicts array is required'
      });
    }

    const result = await slotManagementService.resolveSlotConflicts(projectId, conflicts);

    res.json({
      success: true,
      data: result,
      message: `Resolved ${result.resolvedCount} conflicts, ${result.failedCount} failed`
    });

  } catch (error) {
    logger.error('Error in resolveSlotConflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve slot conflicts',
      error: error.message
    });
  }
};

/**
 * Bulk slot operations
 * POST /api/work-calendar/admin/bulk-slot-operations
 */
export const bulkSlotOperations = async (req, res) => {
  try {
    const { workItemIds, operation, slotData } = req.body;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    if (!workItemIds || !Array.isArray(workItemIds) || workItemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Work item IDs array is required'
      });
    }

    if (!operation) {
      return res.status(400).json({
        success: false,
        message: 'Operation is required'
      });
    }

    const results = {
      successful: [],
      failed: [],
      operation,
      totalProcessed: workItemIds.length
    };

    // Process each work item based on operation
    for (const workItemId of workItemIds) {
      try {
        let result;
        
        switch (operation) {
          case 'assign-slots':
            if (!slotData?.targetSlots || slotData.targetSlots.length === 0) {
              throw new Error('Target slots are required for assign operation');
            }
            
            // For bulk assignment, assign to first available slot from target slots
            const availableSlot = slotData.targetSlots[0]; // Simplified - could be more intelligent
            result = await slotManagementService.assignWorkItemToSlot(
              workItemId,
              availableSlot,
              req.user.id
            );
            break;

          case 'release-slots':
            result = await slotManagementService.releaseSlotFromWorkItem(
              workItemId,
              req.user.id,
              'Bulk release operation'
            );
            break;

          case 'complete-slots':
            // First get the work item to find its slot
            const workItem = await WorkItem.findById(workItemId);
            if (workItem?.slotAssignment?.assignedSlot) {
              result = await slotManagementService.completeSlot(
                workItem.slotAssignment.assignedSlot,
                req.user.id,
                { notes: 'Bulk completion operation' }
              );
            } else {
              throw new Error('Work item has no assigned slot to complete');
            }
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        results.successful.push({
          workItemId,
          result,
          message: 'Operation completed successfully'
        });

      } catch (error) {
        results.failed.push({
          workItemId,
          error: error.message,
          message: 'Operation failed'
        });
      }
    }

    // Broadcast bulk operation update
    await realTimeUpdateService.broadcastBulkSlotUpdate({
      operation,
      successful: results.successful.length,
      failed: results.failed.length,
      total: results.totalProcessed
    });

    res.json({
      success: true,
      data: results,
      message: `Bulk operation completed: ${results.successful.length} successful, ${results.failed.length} failed`
    });

  } catch (error) {
    logger.error('Error in bulkSlotOperations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk slot operations',
      error: error.message
    });
  }
};

/**
 * Calculate slot analytics for enhanced admin overview
 * Provides comprehensive slot metrics integrated with work analytics
 */
const calculateSlotAnalytics = async (filter) => {
  try {
    // Get all projects that match the filter to calculate slot analytics
    const projectIds = await WorkCalendar.distinct('project', filter);
    
    if (projectIds.length === 0) {
      return {
        overall: {
          totalSlots: 0,
          availableSlots: 0,
          assignedSlots: 0,
          inProgressSlots: 0,
          completedSlots: 0,
          blockedSlots: 0,
          slotUtilizationRate: 0,
          slotCompletionRate: 0,
          averageSlotsPerProject: 0
        },
        byProject: [],
        slotStatusDistribution: [],
        completionTrends: [],
        bottleneckAnalysis: []
      };
    }

    // Overall slot metrics across all projects
    const overallSlotPipeline = [
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: null,
          totalSlots: { $sum: 1 },
          availableSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "available"] }, 1, 0] } },
          assignedSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "assigned"] }, 1, 0] } },
          inProgressSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "in-progress"] }, 1, 0] } },
          completedSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "completed"] }, 1, 0] } },
          blockedSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "blocked"] }, 1, 0] } }
        }
      }
    ];

    // Project-level slot breakdown
    const projectSlotPipeline = [
      { $match: { project: { $in: projectIds } } },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectInfo'
        }
      },
      { $unwind: { path: '$projectInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$project',
          projectName: { $first: '$projectInfo.name' },
          totalSlots: { $sum: 1 },
          availableSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "available"] }, 1, 0] } },
          assignedSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "assigned"] }, 1, 0] } },
          inProgressSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "in-progress"] }, 1, 0] } },
          completedSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "completed"] }, 1, 0] } },
          blockedSlots: { $sum: { $cond: [{ $eq: ["$assignmentStatus", "blocked"] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          slotCompletionRate: {
            $cond: [
              { $gt: ["$totalSlots", 0] },
              { $multiply: [{ $divide: ["$completedSlots", "$totalSlots"] }, 100] },
              0
            ]
          },
          slotUtilizationRate: {
            $cond: [
              { $gt: ["$totalSlots", 0] },
              { $multiply: [{ $divide: [{ $add: ["$assignedSlots", "$inProgressSlots", "$completedSlots"] }, "$totalSlots"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalSlots: -1 } },
      { $limit: 10 }
    ];

    // Slot status distribution for charts
    const statusDistributionPipeline = [
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$assignmentStatus',
          count: { $sum: 1 }
        }
      }
    ];

    // Slot completion trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const completionTrendsPipeline = [
      { 
        $match: { 
          project: { $in: projectIds },
          'completionStatus.completedAt': { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$completionStatus.completedAt"
            }
          },
          completedSlots: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    // Execute all pipelines
    const [overallSlots, projectSlots, statusDistribution, completionTrends] = await Promise.all([
      Slot.aggregate(overallSlotPipeline),
      Slot.aggregate(projectSlotPipeline),
      Slot.aggregate(statusDistributionPipeline),
      Slot.aggregate(completionTrendsPipeline)
    ]);

    // Calculate overall metrics
    const overall = overallSlots[0] || {
      totalSlots: 0,
      availableSlots: 0,
      assignedSlots: 0,
      inProgressSlots: 0,
      completedSlots: 0,
      blockedSlots: 0
    };

    // Calculate derived metrics
    const slotUtilizationRate = overall.totalSlots > 0 ? 
      ((overall.assignedSlots + overall.inProgressSlots + overall.completedSlots) / overall.totalSlots) * 100 : 0;
    
    const slotCompletionRate = overall.totalSlots > 0 ? 
      (overall.completedSlots / overall.totalSlots) * 100 : 0;
    
    const averageSlotsPerProject = projectIds.length > 0 ? 
      overall.totalSlots / projectIds.length : 0;

    // Format status distribution for charts
    const formattedStatusDistribution = statusDistribution.map(status => ({
      name: status._id.charAt(0).toUpperCase() + status._id.slice(1).replace('-', ' '),
      value: status.count,
      status: status._id
    }));

    // Identify bottlenecks (projects with high blocked slot ratios)
    const bottleneckAnalysis = projectSlots
      .filter(project => project.totalSlots > 0)
      .map(project => ({
        projectId: project._id,
        projectName: project.projectName,
        blockedRatio: (project.blockedSlots / project.totalSlots) * 100,
        totalSlots: project.totalSlots,
        blockedSlots: project.blockedSlots
      }))
      .filter(project => project.blockedRatio > 20) // Projects with >20% blocked slots
      .sort((a, b) => b.blockedRatio - a.blockedRatio);

    return {
      overall: {
        ...overall,
        slotUtilizationRate: Math.round(slotUtilizationRate * 100) / 100,
        slotCompletionRate: Math.round(slotCompletionRate * 100) / 100,
        averageSlotsPerProject: Math.round(averageSlotsPerProject * 100) / 100
      },
      byProject: projectSlots,
      slotStatusDistribution: formattedStatusDistribution,
      completionTrends: completionTrends,
      bottleneckAnalysis: bottleneckAnalysis
    };

  } catch (error) {
    logger.error('Error calculating slot analytics:', error);
    return null;
  }
};

/**
 * GET /api/work-calendar/admin/slot-analytics
 * Get comprehensive slot analytics for admin dashboard
 */
export const getSlotAnalytics = async (req, res) => {
  try {
    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const {
      startDate,
      endDate,
      client,
      project,
      employee,
      department,
      status,
      priority,
      workType,
      company,
      search,
      tags,
      customFilters,
      vipOnly
    } = req.query;

    // Build filter for work calendar entries
    const filter = await buildAdvancedFilter({
      startDate,
      endDate,
      client,
      project,
      employee,
      department,
      status,
      priority,
      workType,
      company,
      search,
      tags,
      customFilters,
      vipOnly
    });

    // Calculate slot analytics
    const slotAnalytics = await calculateSlotAnalytics(filter);

    if (!slotAnalytics) {
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate slot analytics'
      });
    }

    res.status(200).json({
      success: true,
      data: slotAnalytics,
      appliedFilters: {
        startDate,
        endDate,
        client,
        project,
        employee,
        department,
        status,
        priority,
        workType,
        search,
        tags
      },
      lastUpdated: new Date()
    });

  } catch (error) {
    logger.error('Error in getSlotAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slot analytics',
      error: error.message
    });
  }
};