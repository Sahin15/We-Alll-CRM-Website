import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import Client from "../models/clientModel.js";
import Department from "../models/departmentModel.js";
import logger from '../utils/logger.js';
import { optimizedProjectPopulate, buildTextSearch } from '../utils/queryOptimizer.js';
import { canViewAllProjects } from '../utils/permissions.js';

// Helper function to check if user has access to a project
const userHasProjectAccess = async (userId, userRole, project) => {
  // Admin, superadmin, hr, manager have full access
  if (['admin', 'superadmin', 'hr', 'manager'].includes(userRole)) {
    return true;
  }

  // Get user details
  const user = await User.findById(userId);
  
  // Check if user is HoD of the project's department
  const isHoD = user.isHeadOfDepartment && 
                user.headOfDepartment && 
                project.department &&
                user.headOfDepartment.toString() === project.department.toString();
  
  // Check if user is HoP (project head)
  // Handle both populated and non-populated projectHead
  const projectHeadId = project.projectHead?._id || project.projectHead;
  const isHoP = projectHeadId && projectHeadId.toString() === userId.toString();
  
  // Check if user is assigned to the project
  const isAssigned = project.assignedUsers && 
                     project.assignedUsers.some(u => {
                       const uid = u._id || u;
                       return uid.toString() === userId.toString();
                     });
  
  console.log(`🔍 Access check for ${userId}:`, { isHoD, isHoP, isAssigned });
  
  return isHoD || isHoP || isAssigned;
};

// Create new project
export const createProject = async (req, res) => {
  try {
    console.log('=== CREATE PROJECT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user?.email, req.user?.role);
    
    const { 
      name, 
      client, 
      departments, // New: multiple departments
      department,  // Legacy: single department (for backward compatibility)
      description, 
      startDate,
      endDate, 
      budget,
      status,
      priority,
      projectHead, // Now optional
      assignedUsers,
      teamMembers // New: team members with roles from frontend
    } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ message: "Project name is required" });
    }

    // Handle both single and multiple departments
    let finalDepartments = [];
    if (departments && Array.isArray(departments) && departments.length > 0) {
      finalDepartments = departments;
    } else if (department) {
      finalDepartments = [department];
    }

    if (finalDepartments.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one service/department is required" });
    }

    // Check HOD permissions - HOD can only create projects for their own department
    if (req.user.role === 'hod') {
      const user = await User.findById(req.user.id).select('headOfDepartment isHeadOfDepartment');
      
      if (!user.isHeadOfDepartment || !user.headOfDepartment) {
        return res.status(403).json({ 
          message: "You are not assigned as Head of Department" 
        });
      }

      // Check if all selected departments include the HOD's department
      const hodDepartmentId = user.headOfDepartment.toString();
      const hasOwnDepartment = finalDepartments.some(deptId => deptId === hodDepartmentId);
      
      if (!hasOwnDepartment) {
        return res.status(403).json({ 
          message: "HOD can only create projects that include their own department" 
        });
      }

      // HOD can only select their own department (restrict to single department)
      if (finalDepartments.length > 1 || finalDepartments[0] !== hodDepartmentId) {
        return res.status(403).json({ 
          message: "HOD can only create projects for their own department" 
        });
      }
    }

    // Admin, HR, SuperAdmin can create projects for any departments
    console.log(`User ${req.user.email} (${req.user.role}) creating project for departments:`, finalDepartments);

    // Prepare assigned users array
    let finalAssignedUsers = assignedUsers || [];
    
    // If projectHead is provided and not already in assignedUsers, add them
    if (projectHead && !finalAssignedUsers.includes(projectHead)) {
      finalAssignedUsers.push(projectHead);
    }

    // Process team members and add them to assignedUsers
    let processedTeamMembers = [];
    if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
      processedTeamMembers = teamMembers.map(member => ({
        user: member.user,
        role: member.role || 'other',
        departmentName: member.departmentName,
        assignedBy: req.user._id,
        assignedAt: new Date(),
        isActive: true,
        workCapacity: 100,
        specialization: 'general'
      }));

      // Add team members to assignedUsers for backward compatibility
      teamMembers.forEach(member => {
        if (member.user && !finalAssignedUsers.includes(member.user)) {
          finalAssignedUsers.push(member.user);
        }
      });
    }

    console.log('Creating project with createdBy:', req.user._id, req.user.email);
    console.log('Team members to be assigned:', processedTeamMembers.length);
    
    const project = await Project.create({
      name,
      client: client || null,
      departments: finalDepartments, // New: multiple departments
      department: finalDepartments[0], // Legacy: set first department for backward compatibility
      description: description || '',
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budget || 0,
      status: status || "Pending",
      priority: priority || "medium",
      projectHead: projectHead || null, // Optional
      assignedUsers: finalAssignedUsers,
      teamMembers: processedTeamMembers, // Add team members with roles
      createdBy: req.user._id, // Track who created the project
    });
    
    console.log('Project created with ID:', project._id, 'createdBy:', project.createdBy);

    // Add project to all selected departments' projects arrays
    for (const deptId of finalDepartments) {
      await Department.findByIdAndUpdate(deptId, {
        $addToSet: { projects: project._id },
      });
    }

    // Populate and return
    const populatedProject = await Project.findById(project._id)
      .populate("client", "name email")
      .populate("departments", "name") // New: populate multiple departments
      .populate("department", "name")  // Legacy: keep for backward compatibility
      .populate("projectHead", "name email")
      .populate("assignedUsers", "name email")
      .populate("teamMembers.user", "name email role") // Populate team members
      .populate("teamMembers.assignedBy", "name email")
      .populate("createdBy", "name email");

    console.log('Populated project createdBy:', populatedProject.createdBy);
    logger.info(`Project created: ${project._id} by ${req.user.email}`);

    res.status(201).json({
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    console.error("Error in createProject:", error);
    logger.error("Error in createProject:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all projects
export const getProjects = async (req, res) => {
  try {
    logger.info('getProjects called by:', req.user?.email, req.user?.role);
    
    const { search } = req.query;
    
    let query = {};
    
    // Admin, superadmin, hr, hod, manager can see all projects
    if (!canViewAllProjects(req.user.role)) {
      // Check if user is HoD (Head of Department)
      const user = await User.findById(req.user.id).select('isHeadOfDepartment headOfDepartment').lean();
      const isHoD = user?.isHeadOfDepartment && user?.headOfDepartment;
      
      // HoDs can see their department's projects (HoD role or employee with HoD flag)
      if ((req.user.role === "employee" || req.user.role === "hod") && isHoD) {
        query = {
          $or: [
            { assignedUsers: req.user.id },
            { department: user.headOfDepartment }, // Legacy single department
            { departments: user.headOfDepartment }, // New multiple departments
            { projectHead: req.user.id }
          ]
        };
      }
      // Regular employees can see projects they are assigned to OR projects they lead
      else if (req.user.role === "employee" || req.user.role === "hod") {
        query = {
          $or: [
            { assignedUsers: req.user.id },
            { projectHead: req.user.id }
          ]
        };
      }
      // Clients can only see their own projects
      else if (req.user.role === "client") {
        const clientByEmail = await Client.findOne({ email: req.user.email }).select("_id").lean();
        
        if (!clientByEmail) {
          return res.status(200).json([]);
        }
        query = { client: clientByEmail._id };
      }
    }
    
    // Add search filter
    if (search) {
      Object.assign(query, buildTextSearch(search, ['name', 'description']));
    }
    
    logger.info('Query:', query);
    
    // Optimized query WITHOUT pagination (backward compatible)
    const projects = await Project.find(query)
      .populate(optimizedProjectPopulate())
      .sort({ createdAt: -1 })
      .lean();
    
    if (projects.length > 0) {
      console.log('📊 Raw project from DB:', {
        name: projects[0].name,
        assignedUsers: projects[0].assignedUsers,
        assignedUsersLength: projects[0].assignedUsers?.length
      });
    }

    // Add work item statistics to each project
    const WorkItem = (await import('../models/workItemModel.js')).default;
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const workItems = await WorkItem.find({ project: project._id }).select('status').lean();
        const totalItems = workItems.length;
        const doneItems = workItems.filter(item => item.status === 'Done').length;
        
        return {
          ...project,
          workItemStats: {
            total: totalItems,
            done: doneItems
          }
        };
      })
    );

    logger.success(`Found ${projects.length} projects with stats`);
    
    // Debug: Log first project to verify assignedUsers
    if (projectsWithStats.length > 0) {
      console.log('📊 Sample project being returned:', {
        name: projectsWithStats[0].name,
        assignedUsers: projectsWithStats[0].assignedUsers,
        assignedUsersCount: projectsWithStats[0].assignedUsers?.length,
        assignedUsersType: typeof projectsWithStats[0].assignedUsers,
        isArray: Array.isArray(projectsWithStats[0].assignedUsers)
      });
    }
    
    // Additional check: verify all projects have assignedUsers
    const projectsWithMembers = projectsWithStats.filter(p => p.assignedUsers && p.assignedUsers.length > 0);
    console.log(`📊 Projects with members: ${projectsWithMembers.length} out of ${projectsWithStats.length}`);
    
    // Return simple array (backward compatible)
    res.status(200).json(projectsWithStats);
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

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.status = status;
    await project.save();

    res.status(200).json({ message: "Project status updated", project });
  } catch (error) {
    console.error("Error in updateProjectStatus:", error.message);
    res.status(500).json({ message: "Server error" });
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

    if (!project.assignedUsers.includes(userId)) {
      project.assignedUsers.push(userId);
      await project.save();
    }

    res.status(200).json({ message: "User assigned to project", project });
  } catch (error) {
    console.error("Error in assignUserToProject:", error.message);
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
    console.error("Error in removeUserFromProject:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all projects assigned to the logged-in user
export const getProjectsForUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({ assignedUsers: userId })
      .populate("client", "name email")
      .populate("assignedUsers", "name email");

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error in getProjectsForUser:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single project by ID (clients can only see their own)
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching project ${id} for user ${req.user.email} (${req.user.role})`);

    const project = await Project.findById(id)
      .populate("client", "name email")
      .populate("department", "name")
      .populate("projectHead", "name email designation")
      .populate("assignedUsers", "name email role")
      .populate("createdBy", "name email")
      .populate("tasks.assignedTo", "name email")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Client access check
    if (req.user.role === "client") {
      const clientByEmail = await Client.findOne({ email: req.user.email }).select("_id").lean();
      if (!clientByEmail || project.client._id.toString() !== clientByEmail._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Employee access check (includes HoD)
    if (!canViewAllProjects(req.user.role) && (req.user.role === "employee" || req.user.role === "hod")) {
      const hasAccess = await userHasProjectAccess(req.user.id, req.user.role, project);
      
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

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    Object.keys(req.body || {}).forEach((k) => {
      project[k] = req.body[k];
    });

    await project.save();

    return res.status(200).json({ message: "Project updated", project });
  } catch (error) {
    console.error("Error in updateProject:", error.message);
    return res.status(500).json({ message: "Server error" });
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
    console.error('Error calculating project progress:', error);
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
    console.error("Error in updateProjectProgress:", error.message);
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
    console.error("Error in addMilestone:", error.message);
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
    console.error("Error in updateMilestone:", error.message);
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
    console.error("Error in addTask:", error.message);
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
    console.error("Error in updateTask:", error.message);
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
    console.error("Error in addDeliverable:", error.message);
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
    console.error("Error in updateDeliverable:", error.message);
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
    console.error("Error in deleteProject:", error.message);
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
      return res.status(400).json({ message: "Clients cannot be assigned as project heads" });
    }

    // Assign project head
    project.projectHead = userId;
    await project.save();

    await project.populate("projectHead", "name email designation");

    res.status(200).json({
      message: "Project head assigned successfully",
      project,
    });
  } catch (error) {
    console.error("Error in assignProjectHead:", error);
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
    console.error("Error in removeProjectHead:", error);
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
    console.error("Error in assignProjectToDepartment:", error);
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

    // Verify user is in the department
    if (
      project.department &&
      user.department &&
      user.department.toString() !== project.department._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "User must be a member of the project's department",
      });
    }

    // Remove from previous HoP's headOfProjects array
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
      message: "Head of Project assigned successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Error in assignHoP:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning Head of Project",
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

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const project = await Project.findById(projectId);
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

    // Check if user is already a team member
    const existingMember = project.teamMembers.find(
      (member) => member.user.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a team member",
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
    if (!project.assignedUsers.includes(userId)) {
      project.assignedUsers.push(userId);
    }

    await project.save();

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
    console.error("Error in addTeamMember:", error);
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
    console.error("Error in removeTeamMember:", error);
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
    console.error("Error in getProjectTeam:", error);
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
      .populate("client", "name email")
      .populate("department", "name")
      .populate("teamMembers.user", "name email designation")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects,
      total: projects.length,
    });
  } catch (error) {
    console.error("Error in getMyLeadingProjects:", error);
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
      .populate("client", "name email")
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
    console.error("Error in getMyDepartmentProjects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department projects",
      error: error.message,
    });
  }
};
