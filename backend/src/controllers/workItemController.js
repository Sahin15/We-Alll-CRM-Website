import WorkItem from "../models/workItemModel.js";
import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import { validateStatusTransition, VALID_STATUSES } from "../utils/statusValidation.js";
import { getWorkflowByDepartment, getWorkflowUIConfig, validateDepartmentFields } from "../utils/departmentWorkflows.js";
import { syncProjectProgress } from "../services/projectProgressService.js";
import {
  notifyWorkItemAssigned,
  notifyReviewRequested,
  notifyStatusChanged,
  notifyWorkItemCompleted,
  notifyWorkItemCommented,
} from "../services/notificationService.js";
import { logWorkItemOperation, logSecurityEvent } from "../utils/auditLogger.js";

// @desc    Get all work items for current user (My Work)
// @route   GET /api/work-items/my-work
// @access  Private
const getMyWorkItems = async (req, res) => {
  try {
    const { status, type, project, priority, dueDate, search } = req.query;
    
    // Build query
    const query = { assignedTo: req.user._id };
    
    // Apply filters
    if (status && status !== "all") {
      query.status = status;
    }
    if (type && type !== "all") {
      query.type = type;
    }
    if (project && project !== "all") {
      query.project = project;
    }
    if (priority && priority !== "all") {
      query.priority = priority;
    }
    if (dueDate) {
      query.dueDate = { $lte: new Date(dueDate) };
    }
    
    // Apply search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }
    
    const workItems = await WorkItem.find(query)
      .populate("project", "name client")
      .populate({
        path: "project",
        populate: {
          path: "client",
          select: "name company",
        },
      })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ dueDate: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: workItems.length,
      data: workItems,
    });
  } catch (error) {
    console.error("Error fetching my work items:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch work items",
        details: error.message,
      },
    });
  }
};

// @desc    Get work item by ID
// @route   GET /api/work-items/:id
// @access  Private
const getWorkItemById = async (req, res) => {
  try {
    const workItem = await WorkItem.findById(req.params.id)
      .populate("project", "name client departments department") // Include both single and multiple departments
      .populate({
        path: "project",
        populate: {
          path: "client",
          select: "name company email phone",
        },
      })
      .populate("assignedTo", "name email designation")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email")
      .populate("attachments.uploadedBy", "name email")
      .populate("statusHistory.changedBy", "name email");
    
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }
    
    // Check if user has access to this work item
    const isAssigned = workItem.assignedTo._id.toString() === req.user._id.toString();
    const isCreator = workItem.createdBy._id.toString() === req.user._id.toString();
    const isProjectMember = await Project.findOne({
      _id: workItem.project._id,
      $or: [
        { projectHead: req.user._id },
        { assignedUsers: req.user._id },
      ],
    });
    const isAdmin = ["admin", "superadmin", "hod"].includes(req.user.role);
    
    if (!isAssigned && !isCreator && !isProjectMember && !isAdmin) {
      // Log security event
      logSecurityEvent("UNAUTHORIZED_ACCESS_ATTEMPT", {
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        resource: "work_item",
        resourceId: req.params.id,
        action: "VIEW",
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have access to this work item",
        },
      });
    }
    
    res.status(200).json({
      success: true,
      data: workItem,
    });
  } catch (error) {
    console.error("Error fetching work item:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch work item",
        details: error.message,
      },
    });
  }
};

// @desc    Create new work item
// @route   POST /api/work-items
// @access  Private (Project Head, Admin, HoD)
const createWorkItem = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      project,
      assignedTo,
      priority,
      dueDate,
      platform,
      postType,
      contentBucket,
      caption,
      hashtags,
      tags,
      estimatedHours,
    } = req.body;
    
    console.log('🔍 [DEBUG] Received work item data:', req.body);
    console.log('🔍 [DEBUG] Required fields check:', { type, title, project, assignedTo, dueDate });
    console.log('🔍 [DEBUG] User info:', { id: req.user._id, role: req.user.role, email: req.user.email });
    
    // Validate required fields
    if (!type || !title || !project || !assignedTo || !dueDate) {
      console.log('🔍 [DEBUG] Validation failed - missing fields:', {
        type: !!type,
        title: !!title,
        project: !!project,
        assignedTo: !!assignedTo,
        dueDate: !!dueDate
      });
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
          details: "type, title, project, assignedTo, and dueDate are required",
        },
      });
    }
    
    // Validate type
    if (!["task", "content"].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid work item type",
          details: "Type must be either 'task' or 'content'",
        },
      });
    }
    
    // Validate content-specific fields
    if (type === "content") {
      if (!platform || !postType) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields for content work item",
            details: "platform and postType are required for content work items",
          },
        });
      }
    }
    
    // Check if project exists and get departments (support both single and multiple)
    const projectExists = await Project.findById(project)
      .populate("departments", "name") // New: multiple departments
      .populate("department", "name");  // Legacy: single department
    
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }
    
    // Auto-detect workflow type based on departments
    let workflowType = "standard";
    let departmentNames = [];
    
    // Handle multiple departments (new structure)
    if (projectExists.departments && projectExists.departments.length > 0) {
      departmentNames = projectExists.departments.map(dept => dept.name);
    }
    // Handle single department (legacy structure)
    else if (projectExists.department) {
      departmentNames = [projectExists.department.name];
    }
    
    // Determine workflow type based on departments
    // If any department is social media related, use advanced social media workflow
    const hasSocialMedia = departmentNames.some(name => 
      name.toLowerCase().includes('social') || 
      name.toLowerCase().includes('marketing')
    );
    
    if (hasSocialMedia) {
      const workflow = getWorkflowByDepartment(departmentNames.find(name => 
        name.toLowerCase().includes('social') || 
        name.toLowerCase().includes('marketing')
      ));
      workflowType = workflow.type;
    } else if (departmentNames.length > 0) {
      const workflow = getWorkflowByDepartment(departmentNames[0]);
      workflowType = workflow.type;
    }
    
    // Check if user has permission to create work items for this project
    const isProjectHead = projectExists.projectHead?.toString() === req.user._id.toString();
    
    // Check both assignedUsers and teamMembers arrays
    const isAssignedUser = projectExists.assignedUsers?.some(
      userId => userId.toString() === req.user._id.toString()
    );
    const isTeamMember = projectExists.teamMembers?.some(
      member => member.user?.toString() === req.user._id.toString()
    );
    
    const isAdmin = ["admin", "superadmin", "hod"].includes(req.user.role);
    
    console.log('🔍 [DEBUG] Authorization check:', {
      userId: req.user._id.toString(),
      userRole: req.user.role,
      projectId: projectExists._id.toString(),
      projectHead: projectExists.projectHead?.toString(),
      assignedUsers: projectExists.assignedUsers?.map(id => id.toString()),
      teamMembers: projectExists.teamMembers?.map(member => member.user?.toString()),
      isProjectHead,
      isAssignedUser,
      isTeamMember,
      isAdmin
    });
    
    if (!isProjectHead && !isAssignedUser && !isTeamMember && !isAdmin) {
      // Log security event
      logSecurityEvent("UNAUTHORIZED_ACCESS_ATTEMPT", {
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        resource: "work_item",
        action: "CREATE",
        project: project,
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to create work items for this project. You must be assigned to the project.",
        },
      });
    }
    
    // Check if assignee exists and is part of the project
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Assignee not found",
        },
      });
    }
    
    // Create work item with auto-detected workflow
    const workItem = await WorkItem.create({
      type,
      title,
      description,
      project,
      assignedTo,
      createdBy: req.user._id,
      priority: priority || "medium",
      dueDate,
      workflowType, // Auto-detected from department
      platform: type === "content" ? platform : undefined,
      postType: type === "content" ? postType : undefined,
      contentBucket: type === "content" ? contentBucket : undefined,
      caption: type === "content" ? caption : undefined,
      hashtags: type === "content" ? hashtags : undefined,
      tags: tags || [],
      estimatedHours: estimatedHours || 0,
      status: "To Do", // Default status
      departmentData: req.body.departmentData || {}, // Department-specific data
    });
    
    // Populate the created work item
    await workItem.populate("project", "name client");
    await workItem.populate("assignedTo", "name email");
    await workItem.populate("createdBy", "name email");
    
    // Respond immediately to user
    res.status(201).json({
      success: true,
      message: "Work item created successfully",
      data: workItem,
    });
    
    // Handle background operations asynchronously (don't wait for them)
    setImmediate(async () => {
      try {
        // Initialize advanced workflow if applicable (background)
        const { default: WorkflowAutomationService } = await import("../services/workflowAutomationService.js");
        await WorkflowAutomationService.initializeWorkItemWorkflow(workItem, projectExists);
        
        // Auto-sync to work calendar (background)
        try {
          const { createWorkCalendarEntry } = await import('./workCalendarController.js');
          await createWorkCalendarEntry(workItem);
          console.log(`✅ Auto-synced work item ${workItem._id} to calendar`);
        } catch (syncError) {
          console.error('⚠️ Failed to auto-sync work item to calendar:', syncError);
        }
        
        // Update project progress automatically (background)
        await syncProjectProgress(project);
        
        // Send assignment notification (background)
        await notifyWorkItemAssigned(workItem, req.user);
        
        // Log audit event (background)
        logWorkItemOperation("CREATE", workItem._id.toString(), req.user._id.toString(), {
          type: workItem.type,
          title: workItem.title,
          project: workItem.project._id.toString(),
          assignedTo: workItem.assignedTo._id.toString(),
        });
        
      } catch (backgroundError) {
        console.error('⚠️ Background operation failed:', backgroundError);
        // Don't affect the user experience
      }
    });
  } catch (error) {
    console.error("Error creating work item:", error);
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: errors,
        },
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create work item",
        details: error.message,
      },
    });
  }
};

// @desc    Update work item
// @route   PUT /api/work-items/:id
// @access  Private
const updateWorkItem = async (req, res) => {
  try {
    const workItem = await WorkItem.findById(req.params.id);
    
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }
    
    // Check if user has permission to update
    const isAssigned = workItem.assignedTo.toString() === req.user._id.toString();
    const isCreator = workItem.createdBy.toString() === req.user._id.toString();
    const project = await Project.findById(workItem.project);
    const isProjectHead = project?.projectHead?.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin", "hod"].includes(req.user.role);
    
    if (!isAssigned && !isCreator && !isProjectHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to update this work item",
        },
      });
    }
    
    // Update allowed fields
    const allowedUpdates = [
      "title",
      "description",
      "priority",
      "dueDate",
      "platform",
      "postType",
      "contentBucket",
      "caption",
      "hashtags",
      "tags",
      "estimatedHours",
      "actualHours",
    ];
    
    // Only project head or admin can reassign
    if (isProjectHead || isAdmin) {
      allowedUpdates.push("assignedTo");
    }
    
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        workItem[key] = req.body[key];
      }
    });
    
    // Track who modified it
    workItem.modifiedBy = req.user._id;
    
    await workItem.save();
    
    // Populate the updated work item
    await workItem.populate("project", "name client");
    await workItem.populate("assignedTo", "name email");
    await workItem.populate("createdBy", "name email");
    
    // Log audit event
    logWorkItemOperation("UPDATE", workItem._id.toString(), req.user._id.toString(), {
      updatedFields: Object.keys(req.body),
    });
    
    res.status(200).json({
      success: true,
      message: "Work item updated successfully",
      data: workItem,
    });
  } catch (error) {
    console.error("Error updating work item:", error);
    
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: errors,
        },
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update work item",
        details: error.message,
      },
    });
  }
};

// @desc    Update work item status
// @route   PATCH /api/work-items/:id/status
// @access  Private
const updateWorkItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Status is required",
        },
      });
    }
    
    const workItem = await WorkItem.findById(req.params.id);
    
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }
    
    // Validate status transition
    const transition = validateStatusTransition(workItem.status, status);
    if (!transition.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: transition.message,
          field: "status",
        },
      });
    }
    
    // Check if user has permission
    const isAssigned = workItem.assignedTo.toString() === req.user._id.toString();
    const project = await Project.findById(workItem.project);
    const isProjectHead = project?.projectHead?.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin", "hod"].includes(req.user.role);
    
    if (!isAssigned && !isProjectHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to update this work item status",
        },
      });
    }
    
    // Store old status for notification
    const oldStatus = workItem.status;
    
    // Update status using the model method
    workItem.status = status;
    workItem.modifiedBy = req.user._id;
    
    await workItem.save();
    
    // Update project progress automatically
    await syncProjectProgress(workItem.project.toString());
    
    // Send notifications based on status change
    if (status === "Review") {
      await notifyReviewRequested(workItem, req.user);
    } else if (status === "Done") {
      await notifyWorkItemCompleted(workItem);
    } else {
      await notifyStatusChanged(workItem, oldStatus, status, req.user);
    }
    
    await workItem.populate("project", "name");
    await workItem.populate("assignedTo", "name email");
    
    // Log audit event
    logWorkItemOperation("STATUS_UPDATE", workItem._id.toString(), req.user._id.toString(), {
      oldStatus,
      newStatus: status,
    });
    
    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: workItem,
    });
  } catch (error) {
    console.error("Error updating work item status:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update status",
        details: error.message,
      },
    });
  }
};

// @desc    Delete work item
// @route   DELETE /api/work-items/:id
// @access  Private (Project Head, Admin, HoD)
const deleteWorkItem = async (req, res) => {
  try {
    const { reason } = req.body; // Optional deletion reason
    
    const workItem = await WorkItem.findById(req.params.id);
    
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }
    
    // Check if already deleted
    if (workItem.isDeleted) {
      return res.status(400).json({
        success: false,
        error: {
          code: "ALREADY_DELETED",
          message: "Work item is already deleted",
        },
      });
    }
    
    // Check if user has permission to delete
    const project = await Project.findById(workItem.project);
    const isProjectHead = project?.projectHead?.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin", "hod"].includes(req.user.role);
    
    if (!isProjectHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to delete this work item",
        },
      });
    }
    
    const projectId = workItem.project.toString();
    const workItemId = workItem._id.toString();
    const workItemTitle = workItem.title;
    
    // Perform soft delete
    await workItem.softDelete(req.user._id, reason || 'Deleted by user');
    
    // Update project progress after deletion
    await syncProjectProgress(projectId);
    
    // Log audit event
    logWorkItemOperation("SOFT_DELETE", workItemId, req.user._id.toString(), {
      title: workItemTitle,
      project: projectId,
      reason: reason || 'No reason provided'
    });
    
    res.status(200).json({
      success: true,
      message: "Work item deleted successfully (soft delete - can be restored)",
      data: {
        workItemId,
        deletedAt: workItem.deletedAt,
        canRestore: true
      }
    });
  } catch (error) {
    console.error("Error deleting work item:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to delete work item",
        details: error.message,
      },
    });
  }
};

// @desc    Restore soft deleted work item
// @route   PUT /api/work-items/:id/restore
// @access  Private (Project Head, Admin, HoD)
const restoreWorkItem = async (req, res) => {
  try {
    const workItem = await WorkItem.findById(req.params.id);
    
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }
    
    // Check if not deleted
    if (!workItem.isDeleted) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NOT_DELETED",
          message: "Work item is not deleted",
        },
      });
    }
    
    // Check if user has permission to restore
    const project = await Project.findById(workItem.project);
    const isProjectHead = project?.projectHead?.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin", "hod"].includes(req.user.role);
    
    if (!isProjectHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to restore this work item",
        },
      });
    }
    
    // Restore work item
    await workItem.restore(req.user._id);
    
    // Update project progress after restoration
    await syncProjectProgress(workItem.project.toString());
    
    // Log audit event
    logWorkItemOperation("RESTORE", workItem._id.toString(), req.user._id.toString(), {
      title: workItem.title,
      project: workItem.project.toString(),
    });
    
    res.status(200).json({
      success: true,
      message: "Work item restored successfully",
      data: workItem
    });
  } catch (error) {
    console.error("Error restoring work item:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to restore work item",
        details: error.message,
      },
    });
  }
};

// @desc    Bulk update work items
// @route   POST /api/work-items/bulk-update
// @access  Private
const bulkUpdateWorkItems = async (req, res) => {
  try {
    const { workItemIds, updates } = req.body;
    
    if (!workItemIds || !Array.isArray(workItemIds) || workItemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "workItemIds array is required",
        },
      });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "updates object is required",
        },
      });
    }
    
    const results = {
      success: [],
      failed: [],
    };
    
    // Process each work item
    for (const id of workItemIds) {
      try {
        const workItem = await WorkItem.findById(id);
        
        if (!workItem) {
          results.failed.push({
            id,
            error: "Work item not found",
          });
          continue;
        }
        
        // Check permission
        const project = await Project.findById(workItem.project);
        const isProjectHead = project?.projectHead?.toString() === req.user._id.toString();
        const isAdmin = ["admin", "superadmin", "hod"].includes(req.user.role);
        
        if (!isProjectHead && !isAdmin) {
          results.failed.push({
            id,
            error: "Permission denied",
          });
          continue;
        }
        
        // Apply updates
        Object.keys(updates).forEach(key => {
          if (["status", "priority", "dueDate", "assignedTo"].includes(key)) {
            workItem[key] = updates[key];
          }
        });
        
        await workItem.save();
        
        // Update project progress if status changed
        if (updates.status) {
          await syncProjectProgress(workItem.project.toString());
        }
        
        results.success.push(id);
      } catch (error) {
        results.failed.push({
          id,
          error: error.message,
        });
      }
    }
    
    // Log audit event
    logWorkItemOperation("BULK_UPDATE", "multiple", req.user._id.toString(), {
      successCount: results.success.length,
      failedCount: results.failed.length,
      updates: Object.keys(updates),
    });
    
    res.status(200).json({
      success: true,
      message: `Updated ${results.success.length} work items, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to perform bulk update",
        details: error.message,
      },
    });
  }
};

// @desc    Add comment to work item
// @route   POST /api/work-items/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Comment text is required",
        },
      });
    }
    
    const workItem = await WorkItem.findById(req.params.id);
    
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }
    
    // Add comment
    workItem.comments.push({
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });
    
    await workItem.save();
    await workItem.populate("comments.user", "name email");
    
    // Get the newly added comment
    const newComment = workItem.comments[workItem.comments.length - 1];
    
    // Send notification
    await notifyWorkItemCommented(workItem, newComment, req.user);
    
    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: newComment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to add comment",
        details: error.message,
      },
    });
  }
};

// @desc    Get work items for calendar view
// @route   GET /api/work-items/calendar
// @access  Private
const getCalendarWorkItems = async (req, res) => {
  try {
    const { startDate, endDate, project, type } = req.query;
    
    // Build query - user can see their own items or items from projects they're part of
    const query = {
      $or: [
        { assignedTo: req.user._id },
        { createdBy: req.user._id },
      ],
    };
    
    // Apply date range filter
    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    // Apply project filter
    if (project && project !== "all") {
      query.project = project;
    }
    
    // Apply type filter
    if (type && type !== "all") {
      query.type = type;
    }
    
    const workItems = await WorkItem.find(query)
      .populate("project", "name client")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ dueDate: 1 });
    
    res.status(200).json({
      success: true,
      count: workItems.length,
      data: workItems,
    });
  } catch (error) {
    console.error("Error fetching calendar work items:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch calendar work items",
        details: error.message,
      },
    });
  }
};

// @desc    Get overdue work items for current user
// @route   GET /api/work-items/overdue
// @access  Private
const getOverdueWorkItems = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const workItems = await WorkItem.find({
      assignedTo: req.user._id,
      status: { $ne: "Done" },
      dueDate: { $lt: today },
    })
      .populate("project", "name client")
      .populate("assignedTo", "name email")
      .sort({ dueDate: 1 });
    
    res.status(200).json({
      success: true,
      count: workItems.length,
      data: workItems,
    });
  } catch (error) {
    console.error("Error fetching overdue work items:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch overdue work items",
        details: error.message,
      },
    });
  }
};

// @desc    Get work items by project
// @route   GET /api/work-items/project/:projectId
// @access  Private
const getWorkItemsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, type, assignedTo } = req.query;
    
    // Check if user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }
    
    // Check access
    const isProjectHead = project.projectHead?.toString() === req.user._id.toString();
    const isTeamMember = project.assignedUsers?.some(
      userId => userId.toString() === req.user._id.toString()
    );
    const isAdmin = ["admin", "superadmin", "hod"].includes(req.user.role);
    
    if (!isProjectHead && !isTeamMember && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have access to this project",
        },
      });
    }
    
    // Build query
    const query = { project: projectId };
    
    if (status && status !== "all") {
      query.status = status;
    }
    if (type && type !== "all") {
      query.type = type;
    }
    if (assignedTo && assignedTo !== "all") {
      query.assignedTo = assignedTo;
    }
    
    const workItems = await WorkItem.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ status: 1, dueDate: 1 });
    
    res.status(200).json({
      success: true,
      count: workItems.length,
      data: workItems,
    });
  } catch (error) {
    console.error("Error fetching project work items:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch project work items",
        details: error.message,
      },
    });
  }
};

// @desc    Get workflow configuration for a project/department
// @route   GET /api/work-items/workflow-config/:projectId
// @access  Private
const getWorkflowConfig = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project with departments (support both single and multiple)
    const project = await Project.findById(projectId)
      .populate("departments", "name") // New: multiple departments
      .populate("department", "name");  // Legacy: single department
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }
    
    // Get workflow based on department
    const departmentName = project.department?.name || "Standard";
    const workflow = getWorkflowByDepartment(departmentName);
    const uiConfig = getWorkflowUIConfig(workflow.type);
    
    res.status(200).json({
      success: true,
      data: {
        workflowType: workflow.type,
        departmentName,
        config: uiConfig,
      },
    });
  } catch (error) {
    console.error("Error fetching workflow config:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch workflow configuration",
        details: error.message,
      },
    });
  }
};

// @desc    Progress work item to next workflow stage
// @route   POST /api/work-items/:id/progress-stage
// @access  Private
const progressWorkflowStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const { default: WorkflowAutomationService } = await import("../services/workflowAutomationService.js");
    
    const updatedWorkItem = await WorkflowAutomationService.progressToNextStage(
      id,
      req.user._id,
      notes
    );
    
    res.status(200).json({
      success: true,
      message: "Work item progressed to next stage",
      data: updatedWorkItem,
    });
    
  } catch (error) {
    console.error("Error progressing workflow stage:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to progress workflow stage",
        details: error.message,
      },
    });
  }
};

// @desc    Get workflow progress for a work item
// @route   GET /api/work-items/:id/workflow-progress
// @access  Private
const getWorkflowProgress = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { default: WorkflowAutomationService } = await import("../services/workflowAutomationService.js");
    
    const progress = await WorkflowAutomationService.getWorkflowProgress(id);
    
    res.status(200).json({
      success: true,
      data: progress,
    });
    
  } catch (error) {
    console.error("Error fetching workflow progress:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch workflow progress",
        details: error.message,
      },
    });
  }
};

// Named exports for individual imports
export {
  getMyWorkItems,
  getWorkItemById,
  createWorkItem,
  updateWorkItem,
  updateWorkItemStatus,
  deleteWorkItem,
  restoreWorkItem,
  bulkUpdateWorkItems,
  addComment,
  getCalendarWorkItems,
  getOverdueWorkItems,
  getWorkItemsByProject,
  getWorkflowConfig,
  progressWorkflowStage,
  getWorkflowProgress
};
