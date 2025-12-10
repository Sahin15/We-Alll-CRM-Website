import CalendarEvent from "../models/calendarEventModel.js";
import WorkItem from "../models/workItemModel.js";
import Project from "../models/projectModel.js";
import Department from "../models/departmentModel.js";
import User from "../models/userModel.js";
import WorkflowAutomationService from "../services/workflowAutomationService.js";
import { getAdvancedWorkflowByDepartment } from "../utils/departmentWorkflowConfig.js";
import logger from "../utils/logger.js";

/**
 * Get calendar events for a specific date range
 * @route GET /api/calendar/events
 */
export const getCalendarEvents = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      view = "month", 
      department, 
      project, 
      assignedTo, 
      eventType,
      workflowType 
    } = req.query;
    
    const userId = req.user._id;
    const userRole = req.user.role;
    
    // Build date range
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    // Build filters based on user permissions
    const filters = {};
    
    // Role-based access control
    if (!["admin", "superadmin", "hr"].includes(userRole)) {
      if (userRole === "hod") {
        // HoD can see their department's events
        const user = await User.findById(userId).populate("headOfDepartment");
        if (user.headOfDepartment) {
          filters.department = user.headOfDepartment._id;
        }
      } else {
        // Regular employees can only see their assigned events
        filters.assignedTo = userId;
      }
    }
    
    // Apply additional filters
    if (department && ["admin", "superadmin", "hr"].includes(userRole)) {
      filters.department = department;
    }
    if (project) {
      filters.project = project;
    }
    if (assignedTo && ["admin", "superadmin", "hr", "hod"].includes(userRole)) {
      filters.assignedTo = assignedTo;
    }
    if (eventType) {
      filters.eventType = eventType;
    }
    
    // Get events
    const events = await CalendarEvent.getEventsForDateRange(start, end, filters);
    
    // Filter by workflow type if specified
    let filteredEvents = events;
    if (workflowType) {
      filteredEvents = events.filter(event => event.workflowType === workflowType);
    }
    
    // Transform events for calendar view
    const calendarEvents = filteredEvents.map(event => ({
      id: event._id,
      title: event.title,
      description: event.description,
      start: event.startDate,
      end: event.endDate,
      allDay: event.isAllDay,
      color: event.color,
      backgroundColor: event.backgroundColor,
      eventType: event.eventType,
      workflowStage: event.workflowStage,
      workflowType: event.workflowType,
      status: event.status,
      priority: event.priority,
      department: event.department,
      project: event.project,
      assignedTo: event.assignedTo,
      isOverdue: event.isOverdue,
      sourceId: event.sourceId,
      sourceModel: event.sourceModel,
    }));
    
    res.status(200).json({
      success: true,
      count: calendarEvents.length,
      data: calendarEvents,
      filters: filters,
    });
    
  } catch (error) {
    logger.error("Error fetching calendar events:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch calendar events",
        details: error.message,
      },
    });
  }
};

/**
 * Get department-specific calendar view
 * @route GET /api/calendar/department/:departmentId
 */
export const getDepartmentCalendar = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { startDate, endDate, view = "timeline" } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    // Check permissions
    if (!["admin", "superadmin", "hr"].includes(userRole)) {
      const user = await User.findById(userId);
      if (userRole === "hod" && user.headOfDepartment?.toString() !== departmentId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only view your own department's calendar",
          },
        });
      } else if (userRole === "employee" && user.department?.toString() !== departmentId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only view your department's calendar",
          },
        });
      }
    }
    
    // Get department info
    const department = await Department.findById(departmentId)
      .populate("head", "name email")
      .populate("employees", "name email role");
    
    if (!department) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Department not found",
        },
      });
    }
    
    // Get department's workflow configuration
    const workflow = getAdvancedWorkflowByDepartment(department.name);
    
    // Build date range
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Get events for this department
    const events = await CalendarEvent.getEventsForDateRange(start, end, {
      department: departmentId,
    });
    
    // Get department projects
    const projects = await Project.find({ department: departmentId })
      .populate("client", "name")
      .populate("projectHead", "name email")
      .select("name status progress client projectHead");
    
    // Get department work items with workflow stages
    const workItems = await WorkItem.find({
      project: { $in: projects.map(p => p._id) },
    })
      .populate("assignedTo", "name email role")
      .populate("project", "name")
      .select("title status currentStage workflowType dueDate assignedTo project");
    
    // Group work items by workflow stage
    const workItemsByStage = {};
    if (workflow && workflow.stages) {
      workflow.stages.forEach(stage => {
        workItemsByStage[stage.id] = workItems.filter(wi => wi.currentStage === stage.id);
      });
    }
    
    // Calculate department analytics
    const analytics = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === "In Progress").length,
      totalWorkItems: workItems.length,
      completedWorkItems: workItems.filter(wi => wi.status === "Done").length,
      overdueWorkItems: workItems.filter(wi => wi.dueDate < new Date() && wi.status !== "Done").length,
      teamMembers: department.employees.length,
    };
    
    res.status(200).json({
      success: true,
      data: {
        department: {
          _id: department._id,
          name: department.name,
          head: department.head,
          employeeCount: department.employees.length,
        },
        workflow: workflow,
        events: events,
        projects: projects,
        workItemsByStage: workItemsByStage,
        analytics: analytics,
        calendarConfig: workflow?.calendarConfig || {
          defaultView: "timeline",
          groupBy: "assignee",
          showDependencies: false,
        },
      },
    });
    
  } catch (error) {
    logger.error("Error fetching department calendar:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch department calendar",
        details: error.message,
      },
    });
  }
};

/**
 * Get project timeline view
 * @route GET /api/calendar/project/:projectId/timeline
 */
export const getProjectTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Get project with team members
    const project = await Project.findById(projectId)
      .populate("department", "name")
      .populate("client", "name")
      .populate("projectHead", "name email")
      .populate("teamMembers.user", "name email role")
      .populate("assignedUsers", "name email role");
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }
    
    // Check access permissions
    const userId = req.user._id;
    const userRole = req.user.role;
    const isProjectMember = project.assignedUsers.some(u => u._id.toString() === userId.toString()) ||
                           project.teamMembers.some(tm => tm.user._id.toString() === userId.toString()) ||
                           project.projectHead?._id.toString() === userId.toString();
    
    if (!["admin", "superadmin", "hr"].includes(userRole) && !isProjectMember) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have access to this project",
        },
      });
    }
    
    // Get workflow configuration
    const workflow = getAdvancedWorkflowByDepartment(project.department.name);
    
    // Build date range
    const start = startDate ? new Date(startDate) : new Date(project.startDate || Date.now());
    const end = endDate ? new Date(endDate) : new Date(project.endDate || Date.now() + 90 * 24 * 60 * 60 * 1000);
    
    // Get project events
    const events = await CalendarEvent.getEventsForDateRange(start, end, {
      project: projectId,
    });
    
    // Get project work items
    const workItems = await WorkItem.find({ project: projectId })
      .populate("assignedTo", "name email role")
      .populate("stageAssignments.assignedTo", "name email role")
      .sort({ dueDate: 1 });
    
    // Group work items by team member and stage
    const workItemsByMember = {};
    const workItemsByStage = {};
    
    project.teamMembers.forEach(member => {
      workItemsByMember[member.user._id] = {
        user: member.user,
        role: member.role,
        specialization: member.specialization,
        workItems: workItems.filter(wi => 
          wi.assignedTo._id.toString() === member.user._id.toString() ||
          wi.stageAssignments.some(sa => sa.assignedTo._id.toString() === member.user._id.toString())
        ),
      };
    });
    
    if (workflow && workflow.stages) {
      workflow.stages.forEach(stage => {
        workItemsByStage[stage.id] = {
          stage: stage,
          workItems: workItems.filter(wi => wi.currentStage === stage.id),
          assignedMembers: project.teamMembers.filter(tm => 
            stage.roles.includes(tm.role)
          ),
        };
      });
    }
    
    // Calculate project timeline analytics
    const analytics = {
      totalWorkItems: workItems.length,
      completedWorkItems: workItems.filter(wi => wi.status === "Done").length,
      inProgressWorkItems: workItems.filter(wi => wi.status === "In Progress").length,
      overdueWorkItems: workItems.filter(wi => wi.dueDate < new Date() && wi.status !== "Done").length,
      averageCompletionTime: 0, // Calculate based on completed work items
      bottlenecks: [], // Identify stages with most pending items
    };
    
    // Identify bottlenecks
    if (workflow && workflow.stages) {
      workflow.stages.forEach(stage => {
        const stageWorkItems = workItems.filter(wi => wi.currentStage === stage.id);
        if (stageWorkItems.length > 3) { // Threshold for bottleneck
          analytics.bottlenecks.push({
            stage: stage.name,
            count: stageWorkItems.length,
            assignedMembers: project.teamMembers.filter(tm => stage.roles.includes(tm.role)),
          });
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        project: {
          _id: project._id,
          name: project.name,
          department: project.department,
          client: project.client,
          projectHead: project.projectHead,
          status: project.status,
          progress: project.progress,
          startDate: project.startDate,
          endDate: project.endDate,
        },
        workflow: workflow,
        events: events,
        workItemsByMember: workItemsByMember,
        workItemsByStage: workItemsByStage,
        teamMembers: project.teamMembers,
        analytics: analytics,
      },
    });
    
  } catch (error) {
    logger.error("Error fetching project timeline:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch project timeline",
        details: error.message,
      },
    });
  }
};

/**
 * Create calendar event
 * @route POST /api/calendar/events
 */
export const createCalendarEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      isAllDay,
      assignedTo,
      department,
      project,
      priority,
      location,
      reminders,
    } = req.body;
    
    const event = await CalendarEvent.create({
      title,
      description,
      eventType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAllDay: isAllDay || false,
      assignedTo: assignedTo || [],
      department,
      project,
      priority: priority || "medium",
      location,
      reminders: reminders || [],
      createdBy: req.user._id,
      isAutoGenerated: false,
    });
    
    await event.populate("assignedTo.user", "name email");
    await event.populate("department", "name");
    await event.populate("project", "name");
    
    res.status(201).json({
      success: true,
      message: "Calendar event created successfully",
      data: event,
    });
    
  } catch (error) {
    logger.error("Error creating calendar event:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create calendar event",
        details: error.message,
      },
    });
  }
};

/**
 * Update calendar event
 * @route PUT /api/calendar/events/:id
 */
export const updateCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const event = await CalendarEvent.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Calendar event not found",
        },
      });
    }
    
    // Check permissions
    const userId = req.user._id;
    const userRole = req.user.role;
    const isCreator = event.createdBy.toString() === userId.toString();
    const isAssigned = event.assignedTo.some(a => a.user.toString() === userId.toString());
    
    if (!["admin", "superadmin"].includes(userRole) && !isCreator && !isAssigned) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to update this event",
        },
      });
    }
    
    // Update event
    Object.keys(updates).forEach(key => {
      if (key !== "_id" && key !== "createdBy" && key !== "createdAt") {
        event[key] = updates[key];
      }
    });
    
    event.lastModifiedBy = userId;
    await event.save();
    
    await event.populate("assignedTo.user", "name email");
    await event.populate("department", "name");
    await event.populate("project", "name");
    
    res.status(200).json({
      success: true,
      message: "Calendar event updated successfully",
      data: event,
    });
    
  } catch (error) {
    logger.error("Error updating calendar event:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update calendar event",
        details: error.message,
      },
    });
  }
};

/**
 * Delete calendar event
 * @route DELETE /api/calendar/events/:id
 */
export const deleteCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await CalendarEvent.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Calendar event not found",
        },
      });
    }
    
    // Check permissions
    const userId = req.user._id;
    const userRole = req.user.role;
    const isCreator = event.createdBy.toString() === userId.toString();
    
    if (!["admin", "superadmin"].includes(userRole) && !isCreator) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to delete this event",
        },
      });
    }
    
    // Don't allow deletion of auto-generated events
    if (event.isAutoGenerated) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Cannot delete auto-generated events",
        },
      });
    }
    
    await event.deleteOne();
    
    res.status(200).json({
      success: true,
      message: "Calendar event deleted successfully",
    });
    
  } catch (error) {
    logger.error("Error deleting calendar event:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to delete calendar event",
        details: error.message,
      },
    });
  }
};

/**
 * Get workflow analytics for admin dashboard
 * @route GET /api/calendar/analytics/workflow
 */
export const getWorkflowAnalytics = async (req, res) => {
  try {
    const { department, project, dateRange } = req.query;
    const userRole = req.user.role;
    
    // Check permissions
    if (!["admin", "superadmin", "hr", "hod"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions to view analytics",
        },
      });
    }
    
    // Build date range
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
    
    // Get analytics by department
    let analytics = {};
    
    if (department) {
      analytics = await WorkflowAutomationService.getDepartmentWorkflowAnalytics(department, { startDate, endDate });
    } else {
      // Get analytics for all departments
      const departments = await Department.find({ status: "active" });
      
      for (const dept of departments) {
        const deptAnalytics = await WorkflowAutomationService.getDepartmentWorkflowAnalytics(dept._id, { startDate, endDate });
        analytics[dept.name] = deptAnalytics;
      }
    }
    
    res.status(200).json({
      success: true,
      data: analytics,
      dateRange: { startDate, endDate },
    });
    
  } catch (error) {
    logger.error("Error fetching workflow analytics:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch workflow analytics",
        details: error.message,
      },
    });
  }
};

export default {
  getCalendarEvents,
  getDepartmentCalendar,
  getProjectTimeline,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getWorkflowAnalytics,
};