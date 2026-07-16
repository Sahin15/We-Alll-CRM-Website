import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import Client from "../models/clientModel.js";
import Department from "../models/departmentModel.js";
import logger from '../utils/logger.js';
import { optimizedProjectPopulate, buildTextSearch } from '../utils/queryOptimizer.js';
import NotificationService from "../services/notificationService.js";
import {
  getPersonalProjectMembershipFilter,
  isUserPersonallyAssignedToProject,
} from '../services/projectAccessService.js';
import {
  buildProjectListQuery,
  canUserViewProject,
  canViewAllCompanyProjects,
} from '../services/resourceVisibilityService.js';
import { encrypt, decrypt } from "../utils/encryption.js";
import {
  isPastMember,
  stripPastMembersFromProject,
} from "../utils/employeeQueryUtils.js";
// Temporarily removed imports for debugging
// import WorkItem from "../models/workItemModel.js";
// import Slot from "../models/slotModel.js";
// import slotManagementService from '../services/slotManagementService.js';

// Helper function to check if user has access to a project (personal team membership + grants)
const userHasProjectAccess = (user, project) => canUserViewProject(user, project);

// Create new project
export const createProject = async (req, res) => {
  try {
    
    // Extract fields from request body
    const {
      name,
      client,
      projectHead,
      description,
      startDate,
      departments,
      budget,
      status,
      priority,
      teamMembers,
      assignedUsers,
      enableSlotSystem,
      totalSlots,
      slotType,
      calculationMethod
    } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ message: "Project name is required" });
    }

    // SIMPLIFIED: Project Head is required
    if (!projectHead) {
      return res
        .status(400)
        .json({ message: "Project Head is required" });
    }

    // SIMPLIFIED: Only Manager, HR, Admin, SuperAdmin can create projects
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Only Manager, HR, Admin, or SuperAdmin can create projects" 
      });
    }

    // SIMPLIFIED: Prepare assigned users array
    // Project Head is automatically added to assignedUsers
    let finalAssignedUsers = [projectHead];
    
    // Process team members if provided (optional during creation)
    let processedTeamMembers = [];
    if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
      processedTeamMembers = teamMembers.map(member => ({
        user: member.user,
        role: member.role || 'Team Member', // Custom role from input
        assignedBy: req.user._id,
        assignedAt: new Date()
      }));

      // Add team members to assignedUsers
      teamMembers.forEach(member => {
        if (member.user && !finalAssignedUsers.includes(member.user)) {
          finalAssignedUsers.push(member.user);
        }
      });
    }

    // Initialize slot configuration - ALWAYS 20 slots per month
    const DEFAULT_SLOT_COUNT = 20;
    const slotConfig = {
      totalSlots: DEFAULT_SLOT_COUNT, // Fixed 20 slots per month
      slotType: 'generic',
      allowDynamicSlots: true,
      slotNamingPattern: 'Slot {number}',
      autoCreateSlots: true,
      enableSlotSystem: true // Always enabled
    };

    // Initialize progress tracking - ALWAYS slot-based
    const progressConfig = {
      calculationMethod: 'slot-based', // Always slot-based
      completedSlots: 0,
      totalSlots: DEFAULT_SLOT_COUNT, // Fixed 20 slots per month
      progressPercentage: 0,
      lastProgressUpdate: new Date(),
      progressHistory: []
    };

    // Initialize slot management
    const slotManagementConfig = {
      allowSlotReassignment: true,
      requireApprovalForSlotChanges: false,
      slotCompletionRequiresApproval: false,
      autoReleaseOnWorkItemDeletion: true
    };
    
    const project = await Project.create({
      name,
      client: client || null,
      description: description || '',
      startDate: startDate || null,
      departments: departments || [], // Add departments support
      budget: budget || 0,
      status: status || "Pending",
      priority: priority || "medium",
      projectHead: projectHead, // Required
      assignedUsers: finalAssignedUsers,
      teamMembers: processedTeamMembers,
      createdBy: req.user._id,
      // Slot system fields
      slotConfiguration: slotConfig,
      progressTracking: progressConfig,
      slotManagement: slotManagementConfig
    });
    
    // ALWAYS create slots for new projects
    try {
      const slotManagementService = (await import('../services/slotManagementService.js')).default;
      
      const slotResult = await slotManagementService.createMonthlySlotsForProject(
        project._id,
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        {
          count: slotConfig.totalSlots,
          createdBy: req.user._id
        }
      );
      
      // Verify correct number of slots were created
      const createdCount = slotResult.created?.length || 0;
      if (createdCount !== slotConfig.totalSlots) {
        logger.warn(`Slot count mismatch for project ${project._id}: Expected ${slotConfig.totalSlots}, got ${createdCount}`);
      } else {
        logger.info(`✅ Created ${createdCount} slots for project ${project._id}`);
      }
    } catch (slotError) {
      logger.error('Error creating slots for new project:', slotError);
      // Don't fail project creation if slot creation fails, but log it
    }

    // SIMPLIFIED: No department updates needed
    // Project Head is automatically added to their headOfProjects array via User model hooks

    // Populate and return
    const populatedProject = await Project.findById(project._id)
      .populate("client", "name email company")
      .populate("projectHead", "name email role")
      .populate("assignedUsers", "name email role")
      .populate("teamMembers.user", "name email role")
      .populate("teamMembers.assignedBy", "name email")
      .populate("createdBy", "name email");

    logger.info(`Project created: ${project._id} by ${req.user.email}`);

    // SEND NOTIFICATIONS TO PROJECT TEAM
    try {
      const creator = await User.findById(req.user._id).select('name');
      const creatorName = creator?.name || 'System';
      
      // Get all team members to notify (project head + assigned users)
      const teamMembersToNotify = [...new Set([projectHead, ...finalAssignedUsers])];
      
      if (teamMembersToNotify.length > 0) {
        await NotificationService.sendToMultiple(
          teamMembersToNotify,
          '🚀 New Project Created',
          `${creatorName} created a new project: "${name}"`,
          {
            type: 'project_created',
            data: {
              projectId: project._id.toString(),
              projectName: name,
              projectHead: projectHead,
              creatorName,
              startDate: startDate,
              priority: priority || 'medium',
            },
            actionUrl: `/projects/${project._id}`,
            senderId: req.user._id,
          }
        );
      }
      
      
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    
    
    
    logger.error("Error in createProject:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      errorName: error.name,
      timestamp: new Date().toISOString()
    });
  }
};

// Get all projects
export const getProjects = async (req, res) => {
  try {
    logger.info('getProjects called by:', req.user?.email, req.user?.role);
    
    const { search } = req.query;
    
    let query = {};
    
    // Admin, superadmin, hr, manager (or granted COMPANY scope) see all projects
    if (!canViewAllCompanyProjects(req.user)) {
      if (req.user.role === 'client') {
        const clientByEmail = await Client.findOne({ email: req.user.email }).select('_id').lean();

        if (!clientByEmail) {
          return res.status(200).json([]);
        }
        query = { client: clientByEmail._id };
      } else {
        query = buildProjectListQuery(req.user, query);
      }
    }
    
    // Add search filter
    if (search) {
      Object.assign(query, buildTextSearch(search, ['name', 'description']));
    }

    logger.info('Query:', query);
    
    // Optimized query WITHOUT pagination (backward compatible)
    // Removed work item stats calculation to avoid N+1 queries
    const projects = await Project.find(query)
      .populate(optimizedProjectPopulate())
      .select('name description status progress startDate endDate client department projectHead assignedUsers teamMembers slotConfiguration progressTracking slotManagement workItemStats createdAt') // Include all necessary fields
      .sort({ createdAt: -1 })
      .lean();

    logger.success(`Found ${projects.length} projects`);
    
    // Deduplicate assignedUsers and teamMembers in all projects
    projects.forEach(project => {
      stripPastMembersFromProject(project);

      if (project.assignedUsers && project.assignedUsers.length > 0) {
        const seenIds = new Set();
        project.assignedUsers = project.assignedUsers.filter(user => {
          const userId = user._id?.toString() || user.toString();
          if (seenIds.has(userId)) {
            return false;
          }
          seenIds.add(userId);
          return true;
        });
      }

      if (project.teamMembers && project.teamMembers.length > 0) {
        const seenTeamIds = new Set();
        project.teamMembers = project.teamMembers.filter(member => {
          const memberId = member.user?._id?.toString() || member.user?.toString();
          if (seenTeamIds.has(memberId)) {
            return false;
          }
          seenTeamIds.add(memberId);
          return true;
        });
      }
    });
    
    // Log first project's assignedUsers for debugging
    if (projects.length > 0) {
      logger.info('[getProjects] First project assignedUsers:', projects[0].assignedUsers);
      logger.info('[getProjects] First project teamMembers:', projects[0].teamMembers);
      logger.info('[getProjects] First project projectHead:', projects[0].projectHead);
    }
    
    // Return simple array (backward compatible)
    res.status(200).json(projects);
  } catch (error) {
    logger.error("Error in getProjects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update project status
export const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Authorization check for HoD: can only update status for their own projects
    if (userRole === 'hod') {
      const isProjectHead = project.projectHead?.toString() === userId.toString();
      const isInDepartment = project.department && req.user.department 
        ? project.department.toString() === req.user.department.toString()
        : false;
      
      if (!isProjectHead && !isInDepartment) {
        return res.status(403).json({ message: "You can only update status for your own projects" });
      }
    }

    const oldStatus = project.status;
    project.status = status;
    await project.save();

    // SEND NOTIFICATIONS FOR PROJECT STATUS CHANGE
    try {
      const updater = await User.findById(req.user._id).select('name');
      const updaterName = updater?.name || 'System';
      
      // Get all team members to notify
      const teamMembers = [...new Set([
        project.projectHead?.toString(),
        ...(project.assignedUsers?.map(user => user.toString()) || [])
      ])].filter(Boolean);
      
      if (teamMembers.length > 0) {
        await NotificationService.sendToMultiple(
          teamMembers,
          '🔄 Project Status Updated',
          `${updaterName} changed project "${project.name}" from "${oldStatus}" to "${status}"`,
          {
            type: 'project_status_changed',
            data: {
              projectId: project._id.toString(),
              projectName: project.name,
              oldStatus,
              newStatus: status,
              updaterName,
            },
            actionUrl: `/projects/${project._id}`,
            senderId: req.user._id,
          }
        );
      }
      
      
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }

    res.status(200).json({ message: "Project status updated", project });
  } catch (error) {
    logger.error("Error in updateProjectStatus:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Assign user to a project
export const assignUserToProject = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    const user = await User.findById(userId);

    if (!project || !user) {
      return res.status(404).json({ message: "Project or User not found" });
    }

    const userIdString = userId.toString();
    const isAlreadyAssigned = project.assignedUsers.some(
      (id) => id.toString() === userIdString
    );
    if (!isAlreadyAssigned) {
      project.assignedUsers.push(userId);
      await project.save();
    }

    res.status(200).json({ message: "User assigned to project", project });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Remove user from a project
export const removeUserFromProject = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.assignedUsers = project.assignedUsers.filter(
      (id) => id.toString() !== userId
    );

    await project.save();

    res.status(200).json({ message: "User removed from project", project });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get all projects assigned to the logged-in user
export const getProjectsForUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find(getPersonalProjectMembershipFilter(userId))
      .populate("client", "name email serviceCompany")
      .populate("department", "name")
      .populate("departments", "name")
      .populate("assignedUsers", "name email")
      .populate("teamMembers.user", "name email role")
      .populate("teamMembers.assignedBy", "name email")
      .populate("projectHead", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get all projects for a specific employee (for HR/Admin viewing)
export const getProjectsForEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Only HR, Admin, SuperAdmin, and Manager can view other employees' projects
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find projects where employee is assigned, is a team member, or is the project head
    const projects = await Project.find(getPersonalProjectMembershipFilter(employeeId))
      .populate("client", "name email serviceCompany")
      .populate("assignedUsers", "name email")
      .populate("teamMembers.user", "name email role")
      .populate("teamMembers.assignedBy", "name email")
      .populate("projectHead", "name email")
      .populate("departments", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get single project by ID (clients can only see their own)
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching project ${id} for user ${req.user.email} (${req.user.role})`);

    const project = await Project.findById(id)
      .populate("client", "name email serviceCompany")
      .populate("department", "name")
      .populate("departments", "name")
      .populate("projectHead", "name email designation status")
      .populate("assignedUsers", "name email role status")
      .populate("teamMembers.user", "name email role designation status")
      .populate("teamMembers.assignedBy", "name email")
      .populate("createdBy", "name email")
      .populate("tasks.assignedTo", "name email")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    stripPastMembersFromProject(project);

    // Deduplicate assignedUsers array
    if (project.assignedUsers && project.assignedUsers.length > 0) {
      const seenIds = new Set();
      project.assignedUsers = project.assignedUsers.filter(user => {
        const userId = user._id?.toString() || user.toString();
        if (seenIds.has(userId)) {
          return false;
        }
        seenIds.add(userId);
        return true;
      });
    }

    // Deduplicate teamMembers array
    if (project.teamMembers && project.teamMembers.length > 0) {
      const seenTeamIds = new Set();
      project.teamMembers = project.teamMembers.filter(member => {
        const memberId = member.user?._id?.toString() || member.user?.toString();
        if (seenTeamIds.has(memberId)) {
          return false;
        }
        seenTeamIds.add(memberId);
        return true;
      });
    }

    // Client access check
    if (req.user.role === "client") {
      const clientByEmail = await Client.findOne({ email: req.user.email }).select("_id").lean();
      if (!clientByEmail || project.client._id.toString() !== clientByEmail._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Employee access check (includes HoD) — personal project team only unless company viewer
    if (!canViewAllCompanyProjects(req.user) && req.user.role !== 'client') {
      const hasAccess = userHasProjectAccess(req.user, project);
      
      if (!hasAccess) {
        return res.status(403).json({
          message: "Access denied. You can only view projects you are assigned to.",
        });
      }
    }

    return res.status(200).json(project);
  } catch (error) {
    logger.error("Error in getProjectById:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update project (full update)
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Authorization check for HoD: can only edit their own projects (project head or department projects)
    if (userRole === 'hod') {
      const isProjectHead = project.projectHead?.toString() === userId.toString();
      const isInDepartment = project.department && req.user.department
        ? project.department.toString() === req.user.department.toString()
        : false;
      
      if (!isProjectHead && !isInDepartment) {
        return res.status(403).json({ message: "You can only edit your own projects" });
      }
    }

    // ENFORCE: Slot system is always enabled with 20 slots per month
    // Remove any slot configuration changes from request body
    if (req.body.slotConfiguration) {
      delete req.body.slotConfiguration;
    }
    if (req.body.progressTracking) {
      delete req.body.progressTracking;
    }
    if (req.body.enableSlotSystem !== undefined) {
      delete req.body.enableSlotSystem;
    }
    if (req.body.totalSlots !== undefined) {
      delete req.body.totalSlots;
    }

    // Update only allowed project fields
    const allowedFields = [
      'name', 'description', 'client', 'departments', 'projectHead', 
      'status', 'priority', 'budget', 'startDate', 'teamMembers'
    ];

    Object.keys(req.body || {}).forEach((k) => {
      if (allowedFields.includes(k)) {
        project[k] = req.body[k];
      }
    });

    // Ensure slot system is always enabled with 20 slots
    project.slotConfiguration = project.slotConfiguration || {};
    project.slotConfiguration.enableSlotSystem = true;
    project.slotConfiguration.totalSlots = 20; // Fixed 20 slots per month
    project.slotConfiguration.slotType = 'generic';
    project.slotConfiguration.autoCreateSlots = true;
    project.slotConfiguration.allowDynamicSlots = true;

    project.progressTracking = project.progressTracking || {};
    project.progressTracking.calculationMethod = 'slot-based';
    project.progressTracking.totalSlots = 20; // Fixed 20 slots per month

    await project.save();

    // Populate and return updated project
    const updatedProject = await Project.findById(id)
      .populate("client", "name email serviceCompany")
      .populate("departments", "name")
      .populate("department", "name")
      .populate("projectHead", "name email")
      .populate("assignedUsers", "name email")
      .populate("teamMembers.user", "name email role")
      .populate("teamMembers.assignedBy", "name email")
      .populate("createdBy", "name email");

    return res.status(200).json({ 
      message: "Project updated successfully", 
      project: updatedProject 
    });
  } catch (error) {
    logger.error("Error in updateProject:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to calculate project progress based on work assignments
export const calculateProjectProgress = async (projectId) => {
  try {
    const Slot = (await import('../models/slotModel.js')).default;
    
    // Get all work assignments for this project
    const allSlots = await Slot.find({ project: projectId });
    
    if (allSlots.length === 0) {
      return 0; // No work assignments yet
    }
    
    // Count completed work (status: Approved or Completed)
    const completedSlots = allSlots.filter(slot => 
      slot.status === 'Approved' || 
      slot.status === 'Completed' ||
      slot.designStatus === 'Approved' // Legacy support
    );
    
    // Calculate percentage
    const progress = Math.round((completedSlots.length / allSlots.length) * 100);
    
    return progress;
  } catch (error) {
    
    return 0;
  }
};

// Update project progress (manual or auto-calculate)
export const updateProjectProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, autoCalculate } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    let newProgress;
    
    // Auto-calculate progress based on work assignments
    if (autoCalculate) {
      newProgress = await calculateProjectProgress(id);
    } else {
      // Manual progress update
      if (typeof progress !== "number" || progress < 0 || progress > 100) {
        return res
          .status(400)
          .json({ message: "Progress must be a number between 0 and 100" });
      }
      newProgress = progress;
    }

    project.progress = newProgress;

    // Auto-update status based on progress
    if (newProgress === 0) project.status = "Pending";
    else if (newProgress > 0 && newProgress < 100) project.status = "In Progress";
    else if (newProgress === 100) project.status = "Completed";

    await project.save();

    return res
      .status(200)
      .json({ 
        message: autoCalculate ? "Project progress auto-calculated" : "Project progress updated", 
        project,
        progress: newProgress
      });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Add milestone
export const addMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status } = req.body;

    if (!title)
      return res.status(400).json({ message: "Milestone title is required" });

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.milestones.push({ title, description, dueDate, status });
    await project.save();

    return res.status(201).json({ message: "Milestone added", project });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Update milestone
export const updateMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const milestone = project.milestones.id(milestoneId);
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });

    Object.keys(req.body || {}).forEach((k) => {
      milestone[k] = req.body[k];
    });

    if (milestone.status === "completed" && !milestone.completedAt) {
      milestone.completedAt = new Date();
    }

    await project.save();

    return res.status(200).json({ message: "Milestone updated", project });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Add task
export const addTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assignedTo, status, priority, dueDate } =
      req.body;

    if (!title)
      return res.status(400).json({ message: "Task title is required" });

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.tasks.push({
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
    });
    await project.save();

    return res.status(201).json({ message: "Task added", project });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const { id, taskId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    Object.keys(req.body || {}).forEach((k) => {
      task[k] = req.body[k];
    });

    if (task.status === "completed" && !task.completedAt) {
      task.completedAt = new Date();
    }

    await project.save();

    return res.status(200).json({ message: "Task updated", project });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Add deliverable
export const addDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, fileUrl, status } = req.body;

    if (!title)
      return res.status(400).json({ message: "Deliverable title is required" });

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.deliverables.push({ title, description, fileUrl, status });
    await project.save();

    return res.status(201).json({ message: "Deliverable added", project });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Update deliverable
export const updateDeliverable = async (req, res) => {
  try {
    const { id, deliverableId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const deliverable = project.deliverables.id(deliverableId);
    if (!deliverable)
      return res.status(404).json({ message: "Deliverable not found" });

    Object.keys(req.body || {}).forEach((k) => {
      deliverable[k] = req.body[k];
    });

    if (deliverable.status === "delivered" && !deliverable.deliveredAt) {
      deliverable.deliveredAt = new Date();
    }

    await project.save();

    return res.status(200).json({ message: "Deliverable updated", project });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByIdAndDelete(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    return res.status(200).json({ message: "Project deleted" });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};


// Assign Project Head
export const assignProjectHead = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Find user and verify they are an employee
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "client") {
      return res.status(400).json({ message: "Clients cannot be assigned as project managers" });
    }

    // Remove from previous project manager's headOfProjects array
    if (project.projectHead) {
      await User.findByIdAndUpdate(project.projectHead, {
        $pull: { headOfProjects: projectId },
      });
    }

    // Assign project manager
    project.projectHead = userId;
    project.projectHeadAssignedBy = req.user._id;
    project.projectHeadAssignedAt = new Date();
    await project.save();

    // Update user's headOfProjects array
    await User.findByIdAndUpdate(userId, {
      $addToSet: { headOfProjects: projectId },
    });

    await project.populate("projectHead", "name email designation");
    await project.populate("projectHeadAssignedBy", "name email");

    res.status(200).json({
      message: "Project Manager assigned successfully",
      project,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove Project Head
export const removeProjectHead = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.projectHead = null;
    await project.save();

    res.status(200).json({
      message: "Project head removed successfully",
      project,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============================================
// HoP (Head of Project) Management - Enhanced
// ============================================

/**
 * Assign project to department
 * Only Admin/SuperAdmin can do this
 */
export const assignProjectToDepartment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { departmentId } = req.body;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: "Department ID is required",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Update project
    project.department = departmentId;
    project.departmentAssignedBy = req.user._id;
    project.departmentAssignedAt = new Date();
    await project.save();

    // Add project to department's projects array
    await Department.findByIdAndUpdate(departmentId, {
      $addToSet: { projects: projectId },
    });

    const updatedProject = await Project.findById(projectId)
      .populate("department", "name")
      .populate("departmentAssignedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Project assigned to department successfully",
      data: updatedProject,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error assigning project to department",
      error: error.message,
    });
  }
};

/**
 * Assign Head of Project (HoP)
 * Only HoD of the project's department can do this
 */
export const assignHoP = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const project = await Project.findById(projectId).populate("department");
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // SIMPLIFIED: Department check is now optional (just a warning, not blocking)
    // This allows HR/Admin to assign any employee as project manager
    if (
      project.department &&
      user.department &&
      user.department.toString() !== project.department._id.toString()
    ) {
      
      // Don't block - just log warning
    }

    // Remove from previous project manager's headOfProjects array
    if (project.projectHead) {
      await User.findByIdAndUpdate(project.projectHead, {
        $pull: { headOfProjects: projectId },
      });
    }

    // Update project
    project.projectHead = userId;
    project.projectHeadAssignedBy = req.user._id;
    project.projectHeadAssignedAt = new Date();
    await project.save();

    // Update user's headOfProjects array
    await User.findByIdAndUpdate(userId, {
      $addToSet: { headOfProjects: projectId },
    });

    const updatedProject = await Project.findById(projectId)
      .populate("projectHead", "name email designation")
      .populate("projectHeadAssignedBy", "name email")
      .populate("department", "name");

    res.status(200).json({
      success: true,
      message: "Project Manager assigned successfully",
      data: updatedProject,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error assigning Project Manager",
      error: error.message,
    });
  }
};

/**
 * Add team member to project
 * Only HoP can do this
 */
export const addTeamMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Validate userId is a valid MongoDB ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Ensure teamMembers array exists
    if (!project.teamMembers) {
      project.teamMembers = [];
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (isPastMember(user.status)) {
      return res.status(400).json({
        success: false,
        message: "Terminated or offboarded employees cannot be added to projects",
      });
    }

    // Check if user is already a team member
    const existingMember = project.teamMembers.find(
      (member) => (member.user?._id || member.user).toString() === userId.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a team member",
      });
    }

    // Also check if already in assignedUsers
    const userIdString = userId.toString();
    const isAlreadyAssigned = project.assignedUsers?.some(
      (id) => (id?._id || id).toString() === userIdString
    );
    
    if (isAlreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: "User is already assigned to this project",
      });
    }

    // Add team member
    project.teamMembers.push({
      user: userId,
      role: role || "other",
      assignedBy: req.user._id,
      assignedAt: new Date(),
    });

    // Also add to assignedUsers for backward compatibility
    if (!project.assignedUsers) {
      project.assignedUsers = [];
    }
    
    if (!isAlreadyAssigned) {
      project.assignedUsers.push(userId);
    }

    // Validate before saving
    const validationError = project.validateSync();
    if (validationError) {
      console.error("Validation error:", validationError);
      const errorMessages = Object.values(validationError.errors)
        .map(err => err.message)
        .join(', ');
      return res.status(400).json({
        success: false,
        message: "Validation error: " + errorMessages,
        details: validationError.errors,
      });
    }

    try {
      await project.save();
    } catch (saveError) {
      console.error("Save error:", saveError);
      return res.status(400).json({
        success: false,
        message: "Error saving project: " + saveError.message,
        details: saveError,
      });
    }

    // Update user's assignedProjects array
    await User.findByIdAndUpdate(userId, {
      $addToSet: { assignedProjects: projectId },
    });

    const updatedProject = await Project.findById(projectId)
      .populate("teamMembers.user", "name email designation")
      .populate("teamMembers.assignedBy", "name email")
      .populate("projectHead", "name email");

    res.status(200).json({
      success: true,
      message: "Team member added successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Error in addTeamMember:", {
      message: error.message,
      stack: error.stack,
      projectId: req.params.projectId,
      userId: req.body.userId,
      reqUser: req.user?._id
    });
    
    res.status(500).json({
      success: false,
      message: "Error adding team member",
      error: error.message,
    });
  }
};

/**
 * Remove team member from project
 * Only HoP can do this
 */
export const removeTeamMember = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Remove from teamMembers
    project.teamMembers = project.teamMembers.filter(
      (member) => member.user.toString() !== userId
    );

    // Remove from assignedUsers
    project.assignedUsers = project.assignedUsers.filter(
      (id) => id.toString() !== userId
    );

    await project.save();

    // Update user's assignedProjects array
    await User.findByIdAndUpdate(userId, {
      $pull: { assignedProjects: projectId },
    });

    res.status(200).json({
      success: true,
      message: "Team member removed successfully",
      data: project,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error removing team member",
      error: error.message,
    });
  }
};

/**
 * Get project team
 */
export const getProjectTeam = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate("teamMembers.user", "name email designation employeeId")
      .populate("teamMembers.assignedBy", "name email")
      .populate("projectHead", "name email designation");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        projectHead: project.projectHead,
        teamMembers: project.teamMembers,
        totalMembers: project.teamMembers.length,
      },
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error fetching project team",
      error: error.message,
    });
  }
};

/**
 * Get projects where user is HoP
 */
export const getMyLeadingProjects = async (req, res) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({ projectHead: userId })
      .populate("client", "name email serviceCompany")
      .populate("department", "name")
      .populate("teamMembers.user", "name email designation")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects,
      total: projects.length,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error fetching leading projects",
      error: error.message,
    });
  }
};

/**
 * Get projects in my department (for HoD)
 */
export const getMyDepartmentProjects = async (req, res) => {
  try {
    if (!canViewAllCompanyProjects(req.user)) {
      const projects = await Project.find(buildProjectListQuery(req.user, {}))
        .populate("client", "name email serviceCompany")
        .populate("projectHead", "name email designation")
        .populate("teamMembers.user", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: projects,
        total: projects.length,
      });
    }

    const user = await User.findById(req.user._id).populate("headOfDepartment");

    if (!user.isHeadOfDepartment || !user.headOfDepartment) {
      return res.status(403).json({
        success: false,
        message: "You are not a Head of Department",
      });
    }

    const projects = await Project.find({
      department: user.headOfDepartment._id,
    })
      .populate("client", "name email serviceCompany")
      .populate("projectHead", "name email designation")
      .populate("teamMembers.user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects,
      total: projects.length,
      department: user.headOfDepartment,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error fetching department projects",
      error: error.message,
    });
  }
};

// ==========================================
// Project Credentials Management
// ==========================================

export const getProjectCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id)
      .select('+credentials.password')
      .populate('projectHead', 'name email role')
      .populate('assignedUsers', 'name email role')
      .populate('teamMembers.user', 'name email role');
      
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Authorization: User must have access to project
    const hasAccess = userHasProjectAccess(req.user, project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Determine if user can view password
    let canViewPassword = false;
    const user = await User.findById(req.user.id).populate("department");
    
    // Allow viewing password if:
    // 1. User is superadmin or admin
    // 2. User is project head
    // 3. User is assigned to the project
    // 4. User is a team member of the project
    if (['superadmin', 'admin'].includes(user.role)) {
      canViewPassword = true;
    } else if (project.projectHead && project.projectHead._id.toString() === req.user.id) {
      canViewPassword = true;
    } else if (project.assignedUsers && project.assignedUsers.some(u => u._id.toString() === req.user.id)) {
      canViewPassword = true;
    } else if (project.teamMembers && project.teamMembers.some(tm => tm.user && tm.user._id.toString() === req.user.id)) {
      canViewPassword = true;
    }

    // Decrypt passwords
    const decryptedCredentials = project.credentials.map(cred => {
      const credObj = cred.toObject();
      credObj.password = canViewPassword ? decrypt(credObj.password) : "********";
      return credObj;
    });

    // Compile access users
    const accessUsersMap = new Map();
    if (project.projectHead) {
      accessUsersMap.set(project.projectHead._id.toString(), project.projectHead);
    }
    if (project.assignedUsers) {
      project.assignedUsers.forEach(u => accessUsersMap.set(u._id.toString(), u));
    }
    if (project.teamMembers) {
      project.teamMembers.forEach(tm => {
        if (tm.user) accessUsersMap.set(tm.user._id.toString(), tm.user);
      });
    }
    const accessUsers = Array.from(accessUsersMap.values());

    res.status(200).json({ 
      success: true, 
      data: decryptedCredentials, 
      canViewPassword,
      accessUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const addProjectCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const { platform, url, username, password, notes } = req.body;

    if (!platform || !username || !password) {
      return res.status(400).json({ message: "Platform, username, and password are required" });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Authorization
    const hasAccess = userHasProjectAccess(req.user, project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const encryptedPassword = encrypt(password);
    if (!encryptedPassword) {
      return res.status(500).json({ message: "Encryption failed" });
    }

    project.credentials.push({
      platform,
      url,
      username,
      password: encryptedPassword,
      notes,
      addedBy: req.user._id
    });

    await project.save();

    res.status(201).json({ success: true, message: "Credential added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const updateProjectCredential = async (req, res) => {
  try {
    const { id, credentialId } = req.params;
    const { platform, url, username, password, notes } = req.body;

    const project = await Project.findById(id).select('+credentials.password');
    if (!project) return res.status(404).json({ message: "Project not found" });

    const hasAccess = userHasProjectAccess(req.user, project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const credential = project.credentials.id(credentialId);
    if (!credential) return res.status(404).json({ message: "Credential not found" });

    if (platform) credential.platform = platform;
    if (url !== undefined) credential.url = url;
    if (username) credential.username = username;
    if (password) {
      const encryptedPassword = encrypt(password);
      if (!encryptedPassword) return res.status(500).json({ message: "Encryption failed" });
      credential.password = encryptedPassword;
    }
    if (notes !== undefined) credential.notes = notes;

    await project.save();
    res.status(200).json({ success: true, message: "Credential updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const deleteProjectCredential = async (req, res) => {
  try {
    const { id, credentialId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const hasAccess = userHasProjectAccess(req.user, project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    project.credentials.pull(credentialId);
    await project.save();

    res.status(200).json({ success: true, message: "Credential deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
