import WorkItem from "../models/workItemModel.js";
import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import Slot from "../models/slotModel.js";
import { validateStatusTransition, VALID_STATUSES } from "../utils/statusValidation.js";
import { getWorkflowByDepartment, getWorkflowUIConfig, validateDepartmentFields } from "../utils/departmentWorkflows.js";
import { syncProjectProgress } from "../services/projectProgressService.js";
import notificationService from "../services/notificationService.js";
import NotificationService from "../services/notificationService.js";
import { logWorkItemOperation, logSecurityEvent } from "../utils/auditLogger.js";

// @desc    Get all work items for current user (My Work)
// @route   GET /api/work-items/my-work
// @access  Private
const getMyWorkItems = async (req, res) => {
  try {
    const { status, type, project, priority, dueDate, search, visibility } = req.query;
    
    // Build query - support both single and multiple assignee fields
    // Include draft items if user is the creator
    const query = {
      $or: [
        { assignedTo: req.user._id },
        { assignedToMultiple: req.user._id },
        { createdBy: req.user._id, visibility: 'draft' } // Show own draft items
      ]
    };
    
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
    if (visibility && visibility !== "all") {
      query.visibility = visibility;
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
    
    // Optimized query with lean() for better performance
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
      .populate("assignedToMultiple", "name email")
      .populate("createdBy", "name email")
      .populate("assigneeStatuses.assigneeId", "name email")
      .select("-comments -statusHistory -attachments")
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(500)
      .lean();
    
    res.status(200).json({
      success: true,
      count: workItems.length,
      data: workItems,
    });
  } catch (error) {
    
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

// @desc    Get all work items (Admin only)
// @route   GET /api/work-items
// @access  Private (Admin, SuperAdmin, HoD)
const getAllWorkItems = async (req, res) => {
  try {
    // Check if user has admin access
    if (!["admin", "superadmin", "hod", "hr", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Admin privileges required.",
        },
      });
    }

    const { status, type, project, priority, dueDate, search, assignedTo } = req.query;
    
    // Build query - no user restriction for admins
    const query = { isDeleted: { $ne: true } }; // Only show non-deleted items
    
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
    if (assignedTo && assignedTo !== "all") {
      // Support filtering by assignee in both single and multiple assignee fields
      query.$or = [
        { assignedTo: assignedTo },
        { assignedToMultiple: assignedTo }
      ];
    }
    
    // SIMPLIFIED: Date filtering using only dueDate (work items are due on specific dates)
    if (dueDate) {
      // Validate date format
      const dueDateObj = new Date(dueDate + 'T00:00:00.000Z');
      const dueDateEndObj = new Date(dueDate + 'T23:59:59.999Z');
      
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid due date format. Please use YYYY-MM-DD format.",
          },
        });
      }
      
      // Filter for work items due on this specific date
      query.dueDate = {
        $gte: dueDateObj,
        $lte: dueDateEndObj
      };
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
      .populate({
        path: "project",
        select: "name client department departments",
        populate: [
          {
            path: "client",
            select: "name company",
          },
          {
            path: "department",
            select: "name",
          },
          {
            path: "departments",
            select: "name",
          }
        ],
      })
      .populate("assignedTo", "name email")
      .populate("assignedToMultiple", "name email")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email")
      .populate({
        path: "slotAssignment.assignedSlot",
        select: "slotNumber slotIdentifier slotType"
      })
      .sort({ dueDate: 1, createdAt: -1 });

    // Debug: Log slot assignment data
    res.status(200).json({
      success: true,
      count: workItems.length,
      data: workItems,
    });
  } catch (error) {
    
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
      .populate("assignedToMultiple", "name email designation")
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
    
    // SIMPLIFIED ACCESS CHECK - Allow project members to view
    // Handle null assignedTo for draft items
    const isAssigned = workItem.assignedTo?._id?.toString() === req.user._id.toString() ||
                       (workItem.assignedToMultiple && workItem.assignedToMultiple.some(a => a._id.toString() === req.user._id.toString()));
    const isCreator = workItem.createdBy._id.toString() === req.user._id.toString();
    const isProjectMember = await Project.findOne({
      _id: workItem.project._id,
      $or: [
        { projectHead: req.user._id },
        { assignedUsers: req.user._id },
      ],
    });
    const isAdmin = ["admin", "superadmin", "hr", "manager", "hod"].includes(req.user.role);
    
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
          message: "You don't have access to this work item. You must be assigned, creator, or project member.",
        },
      });
    }
    
    res.status(200).json({
      success: true,
      data: workItem,
    });
  } catch (error) {
    
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
      assignedToMultiple, // New field for multiple assignees
      priority,
      dueDate,
      platform,
      postType,
      contentBucket,
      caption,
      hashtags,
      tags,
      estimatedHours,
      // Slot assignment fields
      assignToSlot,
      selectedSlot,
      // Draft/Scheduled fields
      visibility,
      scheduledActivationDate,
    } = req.body;
    
    // ENHANCED VALIDATION - Check required fields based on type
    // For draft mode, assignee is optional. For active/scheduled, it's required
    const hasAssignee = assignedTo || (assignedToMultiple && assignedToMultiple.length > 0);
    const isDraft = visibility === 'draft';
    const workType = type || 'task'; // Default to 'task' if not provided
    
    if (!title || !project || !dueDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
          details: "title, project, and dueDate are required",
        },
      });
    }

    // For non-draft mode, assignee is required
    if (!isDraft && !hasAssignee) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Assignee is required for active/scheduled work items",
          details: "Please assign at least one team member",
        },
      });
    }

    // Content-specific validation (only if type is explicitly 'content')
    if (workType === "content") {
      if (!platform) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Platform is required for content work items",
            details: "platform field is required when type is 'content'",
          },
        });
      }
      if (!postType) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Post type is required for content work items",
            details: "postType field is required when type is 'content'",
          },
        });
      }
    }

    // Slot assignment validation
    if (assignToSlot && !selectedSlot) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Slot selection is required when assigning to slot",
          details: "selectedSlot field is required when assignToSlot is true",
        },
      });
    }
    
    // MINIMAL - Just check if project exists (no complex permission checks)
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }
    
    // ENHANCED - Create work item with proper data handling
    const workItemData = {
      type: workType,
      title,
      description: description || '',
      project,
      createdBy: req.user._id,
      priority: priority || "medium",
      dueDate,
      status: "To Do",
      estimatedHours: estimatedHours || 0,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      visibility: visibility || 'active',
    };

    // Add scheduled activation date if provided
    if (visibility === 'scheduled' && scheduledActivationDate) {
      workItemData.scheduledActivationDate = scheduledActivationDate;
    }

    // Handle assignee(s) - support both single and multiple assignment
    if (assignedToMultiple && assignedToMultiple.length > 0) {
      // Multiple assignees mode
      workItemData.assignedToMultiple = assignedToMultiple;
      // Also set the first assignee as primary for backward compatibility
      workItemData.assignedTo = assignedToMultiple[0];
    } else if (assignedTo) {
      // Single assignee mode
      workItemData.assignedTo = assignedTo;
    }

    // Add content-specific fields only if type is content
    if (type === "content") {
      workItemData.platform = platform;
      workItemData.postType = postType;
      if (contentBucket) {
        workItemData.contentBucket = contentBucket;
      }
      if (caption) {
        workItemData.caption = caption;
      }
      if (hashtags) {
        workItemData.hashtags = hashtags;
      }
    }

    const workItem = await WorkItem.create(workItemData);
    
    // SLOT ASSIGNMENT - Handle slot assignment if requested
    if (assignToSlot && selectedSlot) {
      try {
        const slot = await Slot.findById(selectedSlot);
        if (slot) {
          slot.assignmentStatus = 'assigned';
          slot.assignedWorkItem = workItem._id;
          slot.assignedTo = assignedTo;
          slot.dueDate = dueDate;
          slot.assignedAt = new Date();
          slot.assignedBy = req.user._id;
          await slot.save();
          
          workItem.slotAssignment = {
            assignedSlot: slot._id,
            slotNumber: slot.slotNumber,
            slotIdentifier: slot.slotIdentifier,
            slotType: slot.slotType,
            assignedAt: new Date(),
            assignedBy: req.user._id
          };
          await workItem.save();
        }
      } catch (slotError) {
        // Slot assignment failed, but work item is still created
      }
    }
    
    // ENHANCED - Populate with proper department information
    await workItem.populate({
      path: "project", 
      select: "name client department departments",
      populate: [
        {
          path: "client",
          select: "name company"
        },
        {
          path: "department",
          select: "name"
        },
        {
          path: "departments",
          select: "name"
        }
      ]
    });
    await workItem.populate("assignedTo", "name email");
    await workItem.populate("createdBy", "name email");
    
    // Populate slot assignment if it exists
    if (workItem.slotAssignment?.assignedSlot) {
      await workItem.populate("slotAssignment.assignedSlot", "slotNumber slotIdentifier");
    }
    
    // AUTO-SYNC TO WORK CALENDAR - Create calendar entry immediately
    try {
      const { createWorkCalendarEntry } = await import("../controllers/workCalendarController.js");
      await createWorkCalendarEntry(workItem);
    } catch (syncError) {
      // Don't fail the request if calendar sync fails
    }
    
    // SEND NOTIFICATION TO ASSIGNED EMPLOYEE(S)
    try {
      const creator = await User.findById(req.user._id).select('name');
      const creatorName = creator?.name || 'System';
      
      // Handle multiple assignees
      if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
        for (const assigneeId of workItem.assignedToMultiple) {
          await NotificationService.sendToUser(
            assigneeId,
            '📋 New Work Assigned',
            `${creatorName} assigned you a new work: "${workItem.title}"`,
            {
              type: 'work_assigned',
              data: {
                workItemId: workItem._id.toString(),
                projectId: workItem.project._id?.toString() || workItem.project.toString(),
                projectName: workItem.project.name || 'Unknown Project',
                priority: workItem.priority,
                dueDate: workItem.dueDate,
              },
              actionUrl: `/work-items/${workItem._id}`,
              senderId: req.user._id,
            }
          );
        }
      } else if (workItem.assignedTo) {
        // Single assignee
        await NotificationService.sendToUser(
          workItem.assignedTo,
          '📋 New Work Assigned',
          `${creatorName} assigned you a new work: "${workItem.title}"`,
          {
            type: 'work_assigned',
            data: {
              workItemId: workItem._id.toString(),
              projectId: workItem.project._id?.toString() || workItem.project.toString(),
              projectName: workItem.project.name || 'Unknown Project',
              priority: workItem.priority,
              dueDate: workItem.dueDate,
            },
            actionUrl: `/work-items/${workItem._id}`,
            senderId: req.user._id,
          }
        );
      }
      
      
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }
    
    // Respond immediately to user
    res.status(201).json({
      success: true,
      message: "Work item created successfully",
      data: workItem,
    });
    
  } catch (error) {
    
    
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
    
    // SIMPLIFIED PERMISSION CHECK - Anyone with project access can update
    const project = await Project.findById(workItem.project);
    const userId = req.user?._id?.toString();
    
    const isAssigned = workItem.assignedTo && workItem.assignedTo.toString() === userId;
    const isCreator = workItem.createdBy && workItem.createdBy.toString() === userId;
    const isProjectHead = project?.projectHead && project.projectHead.toString() === userId;
    const isProjectMember = project?.assignedUsers?.some(assignedUserId => assignedUserId.toString() === userId);
    const isAdmin = ["admin", "superadmin", "hod", "manager"].includes(req.user?.role);
    
    // Allow if user is assigned, creator, project member, project head, or admin
    if (!isAssigned && !isCreator && !isProjectHead && !isProjectMember && !isAdmin) {
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
      "assignedTo", // Anyone with access can reassign
    ];
    
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        workItem[key] = req.body[key];
      }
    });
    
    // Track who modified it
    if (req.user?._id) {
      workItem.modifiedBy = req.user._id;
    }
    
    await workItem.save();
    
    // Populate the updated work item
    await workItem.populate("project", "name client");
    await workItem.populate("assignedTo", "name email");
    await workItem.populate("createdBy", "name email");
    
    // SEND NOTIFICATIONS FOR WORK ITEM UPDATE
    try {
      const updater = await User.findById(req.user._id).select('name');
      const updaterName = updater?.name || 'System';
      const updatedFields = Object.keys(req.body);
      
      // Check if assignee changed
      const oldAssignee = workItem.assignedTo?._id?.toString();
      const newAssignee = req.body.assignedTo;
      const assigneeChanged = newAssignee && oldAssignee !== newAssignee;
      
      // Get all employees on the project to notify them
      const projectData = await Project.findById(workItem.project).populate('teamMembers', '_id');
      const projectTeamMembers = projectData?.teamMembers?.map(member => member._id) || [];
      
      if (assigneeChanged) {
        // Handle assignee change separately (similar to reassignWorkItem)
        const oldAssigneeUser = await User.findById(oldAssignee).select('name');
        const newAssigneeUser = await User.findById(newAssignee).select('name');
        const oldAssigneeName = oldAssigneeUser?.name || 'Previous Assignee';
        const newAssigneeName = newAssigneeUser?.name || 'New Assignee';
        
        // Notify the new assignee
        await NotificationService.sendToUser(
          newAssignee,
          '📋 Work Assigned to You',
          `${updaterName} assigned "${workItem.title}" to you`,
          {
            type: 'work_assigned',
            data: {
              workItemId: workItem._id.toString(),
              workItemTitle: workItem.title,
              projectId: workItem.project._id?.toString() || workItem.project.toString(),
              projectName: workItem.project.name || 'Unknown Project',
              updaterName,
            },
            actionUrl: `/work-items/${workItem._id}`,
            senderId: req.user._id,
          }
        );
        
        // Notify the old assignee (if exists and is different from new assignee)
        if (oldAssignee && oldAssignee !== newAssignee) {
          await NotificationService.sendToUser(
            oldAssignee,
            '🔄 Work Reassigned',
            `${updaterName} reassigned "${workItem.title}" from you to ${newAssigneeName}`,
            {
              type: 'work_reassigned_from',
              data: {
                workItemId: workItem._id.toString(),
                workItemTitle: workItem.title,
                projectId: workItem.project._id?.toString() || workItem.project.toString(),
                projectName: workItem.project.name || 'Unknown Project',
                newAssigneeName,
                updaterName,
              },
              actionUrl: `/work-items/${workItem._id}`,
              senderId: req.user._id,
            }
          );
        }
        
        // Notify other project team members
        const notificationRecipients = projectTeamMembers.filter(memberId => 
          memberId.toString() !== req.user._id.toString() &&
          (!oldAssignee || memberId.toString() !== oldAssignee) &&
          memberId.toString() !== newAssignee
        );
        
        if (notificationRecipients.length > 0) {
          await NotificationService.sendToMultiple(
            notificationRecipients,
            '🔄 Work Reassigned',
            `${updaterName} reassigned "${workItem.title}" from ${oldAssigneeName} to ${newAssigneeName}`,
            {
              type: 'work_reassigned_project',
              data: {
                workItemId: workItem._id.toString(),
                workItemTitle: workItem.title,
                projectId: workItem.project._id?.toString() || workItem.project.toString(),
                projectName: workItem.project.name || 'Unknown Project',
                oldAssigneeName,
                newAssigneeName,
                updaterName,
              },
              actionUrl: `/work-items/${workItem._id}`,
              senderId: req.user._id,
            }
          );
        }
      } else {
        // General update (not assignee change)
        // Notify the assignee (if not the updater)
        if (workItem.assignedTo && workItem.assignedTo._id.toString() !== req.user._id.toString()) {
          await NotificationService.sendToUser(
            workItem.assignedTo._id,
            '📝 Work Updated',
            `${updaterName} updated "${workItem.title}"`,
            {
              type: 'work_updated',
              data: {
                workItemId: workItem._id.toString(),
                workItemTitle: workItem.title,
                projectId: workItem.project._id?.toString() || workItem.project.toString(),
                projectName: workItem.project.name || 'Unknown Project',
                updatedFields,
                updaterName,
              },
              actionUrl: `/work-items/${workItem._id}`,
              senderId: req.user._id,
            }
          );
        }
        
        // Notify other project team members (excluding updater and assignee)
        const notificationRecipients = projectTeamMembers.filter(memberId => 
          memberId.toString() !== req.user._id.toString() &&
          (!workItem.assignedTo || memberId.toString() !== workItem.assignedTo._id.toString())
        );
        
        if (notificationRecipients.length > 0) {
          await NotificationService.sendToMultiple(
            notificationRecipients,
            '📝 Work Updated',
            `${updaterName} updated "${workItem.title}"`,
            {
              type: 'work_updated_project',
              data: {
                workItemId: workItem._id.toString(),
                workItemTitle: workItem.title,
                projectId: workItem.project._id?.toString() || workItem.project.toString(),
                projectName: workItem.project.name || 'Unknown Project',
                updatedFields,
                updaterName,
              },
              actionUrl: `/work-items/${workItem._id}`,
              senderId: req.user._id,
            }
          );
        }
      }
      
      
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }
    
    // Log audit event
    logWorkItemOperation("UPDATE", workItem._id.toString(), req.user?._id?.toString(), {
      updatedFields: Object.keys(req.body),
    });
    
    res.status(200).json({
      success: true,
      message: "Work item updated successfully",
      data: workItem,
    });
  } catch (error) {
    
    
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
    const { status, completedAt } = req.body;
    
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
    // For multiple assignees, validate against individual status; for single assignee, validate against global status
    let statusToValidate = workItem.status;
    if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
      const userStatusEntry = workItem.assigneeStatuses?.find(
        as => as.assigneeId.toString() === req.user._id.toString()
      );
      statusToValidate = userStatusEntry?.status || workItem.status;
    }
    
    const transition = validateStatusTransition(statusToValidate, status);
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
    
    // If status is not changing, just return success (idempotent)
    // For multiple assignees, check individual status; for single assignee, check global status
    let currentUserStatus = workItem.status;
    if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
      const userStatusEntry = workItem.assigneeStatuses?.find(
        as => as.assigneeId.toString() === req.user._id.toString()
      );
      currentUserStatus = userStatusEntry?.status || workItem.status;
    }
    
    if (currentUserStatus === status) {
      await workItem.populate("project", "name");
      await workItem.populate("assignedTo", "name email");
      
      return res.status(200).json({
        success: true,
        message: "Status is already set to this value",
        data: workItem,
      });
    }
    
    // Check if user has permission
    const isAssigned = workItem.assignedTo && workItem.assignedTo.toString() === req.user._id.toString();
    const isAssignedMultiple = workItem.assignedToMultiple && workItem.assignedToMultiple.some(id => id.toString() === req.user._id.toString());
    const project = await Project.findById(workItem.project);
    const isProjectHead = project?.projectHead?.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin", "hr", "manager", "hod"].includes(req.user.role);
    
    if (!isAssigned && !isAssignedMultiple && !isProjectHead && !isAdmin) {
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
    
    // For multiple assignees, only update individual status, not global status
    if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
      // Initialize assigneeStatuses if not exists
      if (!workItem.assigneeStatuses) {
        workItem.assigneeStatuses = [];
      }
      
      // Update status for current user ONLY
      const existingStatusIndex = workItem.assigneeStatuses.findIndex(
        as => as.assigneeId.toString() === req.user._id.toString()
      );
      
      if (existingStatusIndex >= 0) {
        workItem.assigneeStatuses[existingStatusIndex].status = status;
        workItem.assigneeStatuses[existingStatusIndex].updatedAt = new Date();
      } else {
        workItem.assigneeStatuses.push({
          assigneeId: req.user._id,
          status: status,
          updatedAt: new Date(),
        });
      }
      // DO NOT update global status for multiple assignees
    } else {
      // For single assignee, update global status
      workItem.status = status;
    }
    
    workItem.modifiedBy = req.user._id;
    
    // The pre-save middleware will handle completedAt automatically
    
    // Add automatic status change comment
    if (!workItem.comments) {
      workItem.comments = [];
    }
    workItem.comments.push({
      user: req.user._id,
      text: `Status changed from "${oldStatus}" to "${status}"`,
      createdAt: new Date(),
      isSystemComment: true
    });
    
    await workItem.save();
    
    // Populate the work item with user data for comments
    try {
      await workItem.populate("comments.user", "name email");
    } catch (populateError) {
      console.error('Error populating comments:', populateError);
    }
    
    // Update project progress automatically (with error handling)
    try {
      await syncProjectProgress(workItem.project.toString());
    } catch (progressError) {
      console.error('Project progress sync error:', progressError);
      // Don't fail the request for this
    }
    
    // Send notifications based on status change (with error handling)
    try {
      const updater = await User.findById(req.user._id).select('name');
      const updaterName = updater?.name || 'System';
      
      // Get all employees on the project to notify them
      const projectData = await Project.findById(workItem.project).populate('teamMembers', '_id');
      const projectTeamMembers = projectData?.teamMembers?.map(member => member._id) || [];
      
      // Send notification to all project team members about status change
      if (projectTeamMembers.length > 0) {
        await NotificationService.sendToMultiple(
          projectTeamMembers,
          '🔄 Work Status Updated',
          `${updaterName} changed "${workItem.title}" from "${oldStatus}" to "${status}"`,
          {
            type: 'work_status_changed',
            data: {
              workItemId: workItem._id.toString(),
              workItemTitle: workItem.title,
              oldStatus,
              newStatus: status,
              projectId: workItem.project.toString(),
              projectName: projectData?.name || 'Unknown Project',
            },
            actionUrl: `/work-items/${workItem._id}`,
            senderId: req.user._id,
          }
        );
      }
      
      // Also send specific notifications based on status
      if (status === "Done") {
        // Notify assignees only if they didn't make the change
        const assigneesToNotify = [];
        
        if (workItem.assignedTo && workItem.assignedTo.toString() !== req.user._id.toString()) {
          assigneesToNotify.push(workItem.assignedTo);
        }
        
        if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
          workItem.assignedToMultiple.forEach(assigneeId => {
            if (assigneeId.toString() !== req.user._id.toString()) {
              assigneesToNotify.push(assigneeId);
            }
          });
        }
        
        // Send notification to each assignee
        for (const assigneeId of assigneesToNotify) {
          await NotificationService.sendToUser(
            assigneeId,
            '✅ Work Completed',
            `${updaterName} completed "${workItem.title}"`,
            {
              type: 'work_completed',
              data: {
                workItemId: workItem._id.toString(),
                workItemTitle: workItem.title,
                completedBy: updaterName,
              },
              actionUrl: `/work-items/${workItem._id}`,
              senderId: req.user._id,
            }
          );
        }
      } else {
        // Notify assignees of status change (if not the updater)
        const assigneesToNotify = [];
        
        if (workItem.assignedTo && workItem.assignedTo.toString() !== req.user._id.toString()) {
          assigneesToNotify.push(workItem.assignedTo);
        }
        
        if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
          workItem.assignedToMultiple.forEach(assigneeId => {
            if (assigneeId.toString() !== req.user._id.toString()) {
              assigneesToNotify.push(assigneeId);
            }
          });
        }
        
        // Send notification to each assignee
        for (const assigneeId of assigneesToNotify) {
          await NotificationService.sendToUser(
            assigneeId,
            '🔄 Status Changed',
            `${updaterName} changed "${workItem.title}" from "${oldStatus}" to "${status}"`,
            {
              type: 'work_status_changed',
              data: {
                workItemId: workItem._id.toString(),
                workItemTitle: workItem.title,
                oldStatus,
                newStatus: status,
              },
              actionUrl: `/work-items/${workItem._id}`,
              senderId: req.user._id,
            }
          );
        }
      }
      
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
      // Notification failed, continue
    }
    
    // Populate work item data
    try {
      await workItem.populate("project", "name");
      await workItem.populate("assignedTo", "name email");
      await workItem.populate("assignedToMultiple", "name email");
      await workItem.populate("assigneeStatuses.assigneeId", "name email");
    } catch (populateError) {
      console.error('Error populating work item data:', populateError);
    }
    
    // Log audit event (with error handling)
    try {
      logWorkItemOperation("STATUS_UPDATE", workItem._id.toString(), req.user._id.toString(), {
        oldStatus,
        newStatus: status,
      });
    } catch (auditError) {
      // Audit logging failed, continue
    }
    
    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: workItem,
    });
  } catch (error) {
    console.error('Error in updateWorkItemStatus:', error);
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
    
    // Check if user has permission to delete - ONLY HR, Manager, Admin, SuperAdmin
    const canDelete = ["admin", "superadmin", "hr", "manager"].includes(req.user.role);
    
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only HR, Manager, Admin, or SuperAdmin can delete work items",
        },
      });
    }
    
    const projectId = workItem.project.toString();
    const workItemId = workItem._id.toString();
    const workItemTitle = workItem.title;
    
    // If work item has slot assignment, clear the slot
    if (workItem.slotAssignment && workItem.slotAssignment.assignedSlot) {
      try {
        const slot = await Slot.findById(workItem.slotAssignment.assignedSlot);
        
        if (slot && slot.assignedWorkItem && slot.assignedWorkItem.toString() === workItemId) {
          slot.assignmentStatus = 'available';
          slot.assignedWorkItem = null;
          slot.assignedTo = null;
          slot.dueDate = null;
          slot.assignedAt = null;
          slot.assignedBy = null;
          await slot.save();
        }
      } catch (slotError) {
        // Don't fail the delete if slot cleanup fails
      }
    }
    
    // Perform soft delete
    await workItem.softDelete(req.user._id, reason || 'Deleted by user');
    
    // Update project progress after deletion (with error handling)
    try {
      await syncProjectProgress(projectId);
    } catch (progressError) {
      
      // Don't fail the delete operation if progress sync fails
    }
    
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
    const isAdmin = ["admin", "superadmin", "hr", "manager", "hod"].includes(req.user.role);
    
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
        const isAdmin = ["admin", "superadmin", "hr", "manager", "hod"].includes(req.user.role);
        
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
    
    // Extract mentions from comment text
    // Pattern: @name (just the name, no ID)
    const mentionPattern = /@([^\s@]+(?:\s+[^\s@]+)*)\s/g;
    const mentions = [];
    let match;
    
    // Get all users to map names to IDs
    const allUsers = await User.find({}, '_id name');
    const userMap = {};
    allUsers.forEach(user => {
      userMap[user.name] = user._id;
    });
    
    while ((match = mentionPattern.exec(text)) !== null) {
      const mentionName = match[1].trim();
      const userId = userMap[mentionName];
      
      if (userId) {
        mentions.push({
          userId: userId,
          userName: mentionName,
        });
      }
    }
    
    // Add comment
    workItem.comments.push({
      user: req.user._id,
      text: text.trim(),
      mentions: mentions,
      createdAt: new Date(),
    });
    
    await workItem.save();
    await workItem.populate("comments.user", "name email");
    
    // Get the newly added comment
    const newComment = workItem.comments[workItem.comments.length - 1];
    
    // Send notification to mentioned users
    if (mentions && mentions.length > 0) {
      try {
        for (const mention of mentions) {
          // Send mention-specific notification to mentioned users
          await notificationService.sendMentionNotification(
            mention.userId,
            workItem.title,
            req.user.name,
            newComment.text
          );
        }
      } catch (notificationError) {
        
        // Don't fail the comment creation if notifications fail
      }
    }
    
    // Send notification
    try {
      // Notify assignee if they didn't make the comment
      if (workItem.assignedTo && workItem.assignedTo.toString() !== req.user._id.toString()) {
        await notificationService.sendWorkItemCommentedNotification(
          workItem.assignedTo,
          workItem.title,
          req.user.name,
          newComment.text
        );
      }
      
      // Also notify project manager if different from assignee and commenter
      if (workItem.project && workItem.project.manager && 
          workItem.project.manager.toString() !== req.user._id.toString() &&
          workItem.project.manager.toString() !== workItem.assignedTo?.toString()) {
        await notificationService.sendWorkItemCommentedNotification(
          workItem.project.manager,
          workItem.title,
          req.user.name,
          newComment.text
        );
      }
    } catch (notificationError) {
      // Notification failed, continue
    }
    
    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: newComment,
    });
  } catch (error) {
    
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

// @desc    Delete a comment from work item
// @route   DELETE /api/work-items/:id/comments/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const { id: workItemId, commentId } = req.params;
    
    const workItem = await WorkItem.findById(workItemId);
    
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }
    
    // Find the comment
    const comment = workItem.comments.id(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Comment not found",
        },
      });
    }
    
    // Check if user has permission to delete the comment
    const isCommentOwner = comment.user.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin", "hr", "manager", "hod"].includes(req.user.role);
    
    if (!isCommentOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to delete this comment",
        },
      });
    }
    
    // Remove the comment
    workItem.comments.pull(commentId);
    await workItem.save();
    
    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to delete comment",
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
    const isAdmin = ["admin", "superadmin", "hr", "manager", "hod"].includes(req.user.role);
    
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

// @desc    Check work item sync status
// @route   GET /api/work-items/sync-status
// @access  Private (Admin only)
const checkSyncStatus = async (req, res) => {
  try {
    // Only admins can check sync status
    if (!["admin", "superadmin", "hod"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can check sync status",
        },
      });
    }

    // Get total work items
    const totalWorkItems = await WorkItem.countDocuments({ isDeleted: false });
    
    // Get work items created in last 24 hours
    const recentWorkItems = await WorkItem.countDocuments({
      isDeleted: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Try to get work calendar entries (if the collection exists)
    let totalCalendarEntries = 0;
    let recentCalendarEntries = 0;
    
    try {
      const { default: WorkCalendar } = await import("../models/workCalendarModel.js");
      totalCalendarEntries = await WorkCalendar.countDocuments();
      recentCalendarEntries = await WorkCalendar.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
    } catch (calendarError) {
      // WorkCalendar model not available or no entries found - this is expected
    }

    const syncStatus = {
      workItems: {
        total: totalWorkItems,
        recent24h: recentWorkItems
      },
      workCalendar: {
        total: totalCalendarEntries,
        recent24h: recentCalendarEntries
      },
      syncHealth: {
        isHealthy: totalCalendarEntries > 0 && (totalCalendarEntries >= totalWorkItems * 0.8),
        syncRatio: totalWorkItems > 0 ? (totalCalendarEntries / totalWorkItems) : 0,
        needsSync: totalWorkItems > totalCalendarEntries,
        lastChecked: new Date().toISOString()
      }
    };

    res.status(200).json({
      success: true,
      data: syncStatus,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to check sync status",
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

// @desc    Test endpoint to debug work items and date filtering
// @route   GET /api/work-items/debug
// @access  Private (Admin only)
const debugWorkItems = async (req, res) => {
  try {
    // Only admins can access debug endpoint
    if (!["admin", "superadmin", "hod"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can access debug endpoint",
        },
      });
    }

    // Get all work items without any filters
    const allWorkItems = await WorkItem.find({ isDeleted: { $ne: true } })
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .sort({ dueDate: 1 });

    // Group by due date for easier debugging
    const workItemsByDate = {};
    allWorkItems.forEach(item => {
      const dueDate = item.dueDate ? item.dueDate.toISOString().split('T')[0] : 'no-date';
      if (!workItemsByDate[dueDate]) {
        workItemsByDate[dueDate] = [];
      }
      workItemsByDate[dueDate].push({
        id: item._id,
        title: item.title,
        status: item.status,
        assignedTo: item.assignedTo?.name || 'Unassigned',
        project: item.project?.name || 'No Project',
        dueDate: item.dueDate
      });
    });

    // Test today's date filtering
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00.000Z');
    const todayEnd = new Date(today + 'T23:59:59.999Z');
    
    const todayItems = await WorkItem.find({
      isDeleted: { $ne: true },
      dueDate: {
        $gte: todayStart,
        $lte: todayEnd
      }
    }).populate("project", "name").populate("assignedTo", "name");

    res.status(200).json({
      success: true,
      debug: {
        totalWorkItems: allWorkItems.length,
        workItemsByDate,
        todayFilter: {
          date: today,
          startTime: todayStart.toISOString(),
          endTime: todayEnd.toISOString(),
          itemsFound: todayItems.length,
          items: todayItems.map(item => ({
            id: item._id,
            title: item.title,
            dueDate: item.dueDate,
            status: item.status
          }))
        },
        sampleQueries: {
          today: {
            dueDate: {
              $gte: todayStart,
              $lte: todayEnd
            }
          }
        }
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Debug endpoint failed",
        details: error.message,
      },
    });
  }
};

// Named exports for individual imports
export {
  getAllWorkItems,
  getMyWorkItems,
  getWorkItemById,
  createWorkItem,
  updateWorkItem,
  updateWorkItemStatus,
  deleteWorkItem,
  restoreWorkItem,
  bulkUpdateWorkItems,
  addComment,
  deleteComment,
  getCalendarWorkItems,
  getOverdueWorkItems,
  getWorkItemsByProject,
  checkSyncStatus,
  getWorkflowConfig,
  progressWorkflowStage,
  getWorkflowProgress,
  debugWorkItems,
  assignWorkItemToSlot,
  reassignWorkItem
};

// @desc    Assign work item to slot (Utility function for testing)
// @route   POST /api/work-items/:id/assign-slot
// @access  Private (Admin)
const assignWorkItemToSlot = async (req, res) => {
  try {
    const { slotId } = req.body;
    const workItemId = req.params.id;

    // Check admin access
    if (!["admin", "superadmin", "hod"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Admin privileges required.",
        },
      });
    }

    // Find work item
    const workItem = await WorkItem.findById(workItemId);
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }

    // Find slot
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Slot not found",
        },
      });
    }

    // Check if slot is available
    if (slot.assignmentStatus !== 'available') {
      return res.status(400).json({
        success: false,
        error: {
          code: "SLOT_NOT_AVAILABLE",
          message: "Slot is not available for assignment",
        },
      });
    }

    // Update slot
    slot.assignmentStatus = 'assigned';
    slot.assignedWorkItem = workItem._id;
    slot.assignedAt = new Date();
    slot.assignedBy = req.user._id;
    await slot.save();

    // Update work item
    workItem.slotAssignment = {
      assignedSlot: slot._id,
      slotNumber: slot.slotNumber,
      slotIdentifier: slot.slotIdentifier,
      slotType: slot.slotType || 'work',
      assignedAt: new Date(),
      assignedBy: req.user._id
    };
    await workItem.save();

    // Populate and return updated work item
    await workItem.populate([
      {
        path: "project",
        select: "name client department departments",
        populate: [
          {
            path: "client",
            select: "name company",
          },
          {
            path: "department",
            select: "name",
          },
          {
            path: "departments",
            select: "name",
          }
        ],
      },
      {
        path: "assignedTo",
        select: "name email"
      },
      {
        path: "slotAssignment.assignedSlot",
        select: "slotNumber slotIdentifier slotType"
      }
    ]);

    res.status(200).json({
      success: true,
      message: "Work item successfully assigned to slot",
      data: workItem,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to assign work item to slot",
        details: error.message,
      },
    });
  }
};

// @desc    Reassign work item to different user (Slot reassignment)
// @route   PUT /api/work-items/:id/reassign
// @access  Private (Admin, Project Manager)
const reassignWorkItem = async (req, res) => {
  try {
    const { newAssigneeId } = req.body;
    const workItemId = req.params.id;

    // Validate input
    if (!newAssigneeId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "New assignee ID is required",
        },
      });
    }

    // Find work item
    const workItem = await WorkItem.findById(workItemId)
      .populate('assignedTo', 'name email')
      .populate('project', 'name');

    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Work item not found",
        },
      });
    }

    // SIMPLIFIED PERMISSION CHECK - Anyone with project access can reassign
    const project = await Project.findById(workItem.project);
    const isProjectHead = project?.projectHead?.toString() === req.user._id.toString();
    const isProjectMember = project?.assignedUsers?.some(userId => userId.toString() === req.user._id.toString());
    const isAdmin = ["admin", "superadmin", "hod", "manager"].includes(req.user.role);
    
    // Allow if user is project member, project head, or admin
    if (!isProjectHead && !isProjectMember && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to reassign this work item. You must be a project member.",
        },
      });
    }

    // Find new assignee
    const User = (await import('../models/userModel.js')).default;
    const newAssignee = await User.findById(newAssigneeId).select('name email role');
    
    if (!newAssignee) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "New assignee not found",
        },
      });
    }

    const oldAssignee = workItem.assignedTo;

    // Update work item assignee
    workItem.assignedTo = newAssigneeId;
    workItem.updatedAt = new Date();
    await workItem.save();

    // If work item has slot assignment, update the slot's assigned work item
    if (workItem.slotAssignment && workItem.slotAssignment.assignedSlot) {
      try {
        const slot = await Slot.findById(workItem.slotAssignment.assignedSlot);
        
        if (slot && slot.assignedWorkItem) {
          // Update the slot's assigned work item to reflect new assignee
          await slot.populate('assignedWorkItem');
          if (slot.assignedWorkItem) {
            slot.assignedWorkItem.assignedTo = newAssigneeId;
            await slot.assignedWorkItem.save();
          }
        }
      } catch (slotError) {
        // Don't fail the reassignment if slot update fails
      }
    }

    // Populate the updated work item
    await workItem.populate([
      {
        path: "project",
        select: "name client department departments",
        populate: [
          {
            path: "client",
            select: "name company",
          },
          {
            path: "department",
            select: "name",
          },
          {
            path: "departments",
            select: "name",
          }
        ],
      },
      {
        path: "assignedTo",
        select: "name email"
      },
      {
        path: "slotAssignment.assignedSlot",
        select: "slotNumber slotIdentifier slotType"
      }
    ]);

    // SEND NOTIFICATIONS FOR REASSIGNMENT
    try {
      const reassigner = await User.findById(req.user._id).select('name');
      const reassignerName = reassigner?.name || 'System';
      const oldAssigneeName = oldAssignee?.name || 'Previous Assignee';
      const newAssigneeName = newAssignee?.name || 'New Assignee';
      
      // Notify the new assignee
      await NotificationService.sendToUser(
        newAssigneeId,
        '📋 Work Reassigned to You',
        `${reassignerName} reassigned "${workItem.title}" to you`,
        {
          type: 'work_reassigned',
          data: {
            workItemId: workItem._id.toString(),
            workItemTitle: workItem.title,
            projectId: workItem.project._id?.toString() || workItem.project.toString(),
            projectName: workItem.project.name || 'Unknown Project',
            oldAssigneeName,
            reassignerName,
          },
          actionUrl: `/work-items/${workItem._id}`,
          senderId: req.user._id,
        }
      );
      
      // Notify the old assignee (if exists and is different from new assignee)
      if (oldAssignee && oldAssignee._id.toString() !== newAssigneeId.toString()) {
        await NotificationService.sendToUser(
          oldAssignee._id,
          '🔄 Work Reassigned',
          `${reassignerName} reassigned "${workItem.title}" from you to ${newAssigneeName}`,
          {
            type: 'work_reassigned_from',
            data: {
              workItemId: workItem._id.toString(),
              workItemTitle: workItem.title,
              projectId: workItem.project._id?.toString() || workItem.project.toString(),
              projectName: workItem.project.name || 'Unknown Project',
              newAssigneeName,
              reassignerName,
            },
            actionUrl: `/work-items/${workItem._id}`,
            senderId: req.user._id,
          }
        );
      }
      
      // Get all employees on the project to notify them
      const projectData = await Project.findById(workItem.project).populate('teamMembers', '_id');
      const projectTeamMembers = projectData?.teamMembers?.map(member => member._id) || [];
      
      // Filter out the reassigner, old assignee, and new assignee from project team notifications
      const notificationRecipients = projectTeamMembers.filter(memberId => 
        memberId.toString() !== req.user._id.toString() &&
        (!oldAssignee || memberId.toString() !== oldAssignee._id.toString()) &&
        memberId.toString() !== newAssigneeId.toString()
      );
      
      // Notify other project team members
      if (notificationRecipients.length > 0) {
        await NotificationService.sendToMultiple(
          notificationRecipients,
          '🔄 Work Reassigned',
          `${reassignerName} reassigned "${workItem.title}" from ${oldAssigneeName} to ${newAssigneeName}`,
          {
            type: 'work_reassigned_project',
            data: {
              workItemId: workItem._id.toString(),
              workItemTitle: workItem.title,
              projectId: workItem.project._id?.toString() || workItem.project.toString(),
              projectName: workItem.project.name || 'Unknown Project',
              oldAssigneeName,
              newAssigneeName,
              reassignerName,
            },
            actionUrl: `/work-items/${workItem._id}`,
            senderId: req.user._id,
          }
        );
      }
      
      
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      message: `Work item successfully reassigned to ${newAssignee.name}`,
      data: workItem,
      reassignment: {
        oldAssignee: oldAssignee ? { name: oldAssignee.name, email: oldAssignee.email } : null,
        newAssignee: { name: newAssignee.name, email: newAssignee.email }
      }
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to reassign work item",
        details: error.message,
      },
    });
  }
};


/**
 * Remove slot assignment from work item
 * PUT /api/workitems/:workItemId/slot/remove
 */
export const removeSlotAssignment = async (req, res) => {
  try {
    const { workItemId } = req.params;

    // Permission check
    if (!['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Insufficient permissions to remove slot assignment.'
        }
      });
    }

    // Find work item
    const workItem = await WorkItem.findById(workItemId);
    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Work item not found'
        }
      });
    }

    // Check if work item has slot assignment
    if (!workItem.slotAssignment?.assignedSlot) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SLOT_ASSIGNMENT',
          message: 'Work item is not assigned to any slot'
        }
      });
    }

    const slotId = workItem.slotAssignment.assignedSlot;

    // Update slot to available
    const slot = await Slot.findById(slotId);
    if (slot) {
      slot.assignmentStatus = 'available';
      slot.assignedWorkItem = null;
      slot.assignedTo = null;
      slot.assignedAt = null;
      slot.assignedBy = null;
      await slot.save();
    }

    // Remove slot assignment from work item
    workItem.slotAssignment = {
      assignedSlot: null,
      slotNumber: null,
      slotIdentifier: null,
      slotType: null
    };
    await workItem.save();

    // Populate and return updated work item
    await workItem.populate([
      {
        path: 'project',
        select: 'name client department departments',
        populate: [
          {
            path: 'client',
            select: 'name company'
          },
          {
            path: 'department',
            select: 'name'
          },
          {
            path: 'departments',
            select: 'name'
          }
        ]
      },
      {
        path: 'assignedTo',
        select: 'name email'
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Slot assignment removed successfully',
      data: workItem
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to remove slot assignment',
        details: error.message
      }
    });
  }
};

/**
 * Get work items grouped by slots for a project
 * GET /api/projects/:projectId/workitems/grouped-by-slots
 */
export const getWorkItemsGroupedBySlots = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project to check if slots are enabled
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found'
        }
      });
    }

    // Check if slots are enabled
    if (!project.slotConfiguration?.enableSlotSystem) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SLOTS_NOT_ENABLED',
          message: 'Slots are not enabled for this project'
        }
      });
    }

    // Get all work items for the project
    const workItems = await WorkItem.find({ project: projectId })
      .populate('assignedTo', 'name email')
      .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier')
      .sort({ 'slotAssignment.slotNumber': 1, createdAt: 1 });

    // Get all slots for the project
    const slots = await Slot.find({ project: projectId })
      .sort({ slotNumber: 1 });

    // Group work items by slot
    const groupedData = {
      slotted: {},
      unassigned: []
    };

    // Initialize slot groups
    slots.forEach(slot => {
      groupedData.slotted[slot._id.toString()] = {
        slot: {
          _id: slot._id,
          slotNumber: slot.slotNumber,
          slotIdentifier: slot.slotIdentifier,
          assignmentStatus: slot.assignmentStatus,
          completionStatus: slot.completionStatus
        },
        workItems: []
      };
    });

    // Distribute work items into groups
    workItems.forEach(workItem => {
      if (workItem.slotAssignment?.assignedSlot) {
        const slotId = workItem.slotAssignment.assignedSlot._id?.toString() || 
                       workItem.slotAssignment.assignedSlot.toString();
        if (groupedData.slotted[slotId]) {
          groupedData.slotted[slotId].workItems.push(workItem);
        } else {
          // Slot doesn't exist anymore, treat as unassigned
          groupedData.unassigned.push(workItem);
        }
      } else {
        groupedData.unassigned.push(workItem);
      }
    });

    res.status(200).json({
      success: true,
      data: groupedData
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get work items grouped by slots',
        details: error.message
      }
    });
  }
};

/**
 * Get work items by slot
 * GET /api/workitems/by-slot/:slotId
 */
export const getWorkItemsBySlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    // Find work items assigned to this slot
    const workItems = await WorkItem.find({
      'slotAssignment.assignedSlot': slotId
    })
      .populate('project', 'name client')
      .populate('assignedTo', 'name email')
      .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: workItems,
      count: workItems.length
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get work items by slot',
        details: error.message
      }
    });
  }
};

// @desc    Get pending work count for a user on a specific due date
// @route   GET /api/work-items/pending-count/:userId
// @access  Private
export const getPendingWorkCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { dueDate } = req.query;

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Due date is required" }
      });
    }

    // Parse the due date
    const dueDateObj = new Date(dueDate + 'T00:00:00.000Z');
    const dueDateEndObj = new Date(dueDate + 'T23:59:59.999Z');

    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid due date format" }
      });
    }

    // Count active work items for this user on the specified due date
    const count = await WorkItem.countDocuments({
      $or: [
        { assignedTo: userId },
        { assignedToMultiple: userId }
      ],
      status: { $in: ["To Do", "In Progress"] },
      dueDate: {
        $gte: dueDateObj,
        $lte: dueDateEndObj
      },
      visibility: { $in: ["active", "scheduled"] }, // Only count active/scheduled items
      isDeleted: { $ne: true }
    });

    res.status(200).json({
      success: true,
      data: {
        userId,
        dueDate,
        count
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch pending work count",
        details: error.message
      }
    });
  }
};


// @desc    Activate a draft or scheduled work item
// @route   PATCH /api/work-items/:id/activate
// @access  Private (Creator, Admin, Project Head)
export const activateWorkItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { visibility } = req.body; // 'active' or 'scheduled'

    const workItem = await WorkItem.findById(id);

    if (!workItem) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Work item not found" }
      });
    }

    // Check authorization - only creator, admin, or project head can activate
    const project = await Project.findById(workItem.project);
    const isCreator = workItem.createdBy.toString() === req.user._id.toString();
    const isProjectHead = project?.projectHead?.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isCreator && !isProjectHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You don't have permission to activate this work item" }
      });
    }

    // Update visibility and activation timestamp
    workItem.visibility = visibility || 'active';
    workItem.activatedAt = new Date();

    // If activating from draft/scheduled to active, ensure assignees are set
    if (visibility === 'active' && !workItem.assignedTo && (!workItem.assignedToMultiple || workItem.assignedToMultiple.length === 0)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Cannot activate work item without assignees" }
      });
    }

    await workItem.save();

    const populatedWorkItem = await WorkItem.findById(id)
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("assignedToMultiple", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: `Work item activated and is now visible to assigned team members`,
      data: populatedWorkItem
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to activate work item",
        details: error.message
      }
    });
  }
};


// @desc    Get all work items created by current user
// @route   GET /api/work-items/created-by/me
// @access  Private
export const getCreatedByMe = async (req, res) => {
  try {
    const { status, type, project, priority, dueDate, search } = req.query;
    
    // Build query - only items created by current user
    const query = {
      createdBy: req.user._id,
      isDeleted: { $ne: true }
    };
    
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
      const dueDateObj = new Date(dueDate + 'T00:00:00.000Z');
      const dueDateEndObj = new Date(dueDate + 'T23:59:59.999Z');
      query.dueDate = {
        $gte: dueDateObj,
        $lte: dueDateEndObj
      };
    }
    
    // Apply search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }
    
    // Optimized query with lean() for better performance
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
      .populate("assignedToMultiple", "name email")
      .populate("createdBy", "name email")
      .populate("assigneeStatuses.assigneeId", "name email")
      .select("-comments -statusHistory -attachments")
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(500)
      .lean();
    
    res.status(200).json({
      success: true,
      count: workItems.length,
      data: workItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch created work items",
        details: error.message,
      },
    });
  }
};
