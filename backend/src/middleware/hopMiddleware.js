import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import { hasPermission } from "../authz/policyEngine.js";

/**
 * Check if user is Head of Project
 */
export const isHoP = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Check if user is HoP of any project
    const projects = await Project.find({ projectHead: userId });

    if (!projects || projects.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a Head of Project.",
      });
    }

    // Attach projects to request for later use
    req.hopProjects = projects;
    next();
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error checking HoP status",
      error: error.message,
    });
  }
};

/**
 * Check if user is HoP of a specific project
 */
export const isHoPOfProject = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const projectId = req.params.projectId || req.params.id || req.body.project;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      projectHead: userId,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not the Head of this Project.",
      });
    }

    req.hopProject = project;
    next();
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error checking HoP status",
      error: error.message,
    });
  }
};

/**
 * Check if user can manage project (Admin, SuperAdmin, HoP, or HoD)
 */
export const canManageProject = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const projectId = req.params.projectId || req.params.id || req.body.project;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    if (hasPermission(req.user, "projects.project.manage")) {
      const project = await Project.findById(projectId).populate("department");
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
      req.hopProject = project;
      req.canManage = true;
      req.manageRole = "grant";
      return next();
    }

    // Admin, superadmin, HR, and manager can always manage projects
    if (["admin", "superadmin", "hr", "manager"].includes(userRole)) {
      const project = await Project.findById(projectId).populate("department");
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
      req.hopProject = project;
      req.canManage = true;
      req.manageRole = userRole === "hr" ? "hr" : "admin";
      return next();
    }

    const project = await Project.findById(projectId).populate("department");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const uid = String(userId);

    // Check if user is HoP (supports ObjectId or string refs)
    const projectHeadId = String(project.projectHead?._id || project.projectHead || "");
    if (projectHeadId && projectHeadId === uid) {
      req.hopProject = project;
      req.canManage = true;
      req.manageRole = "hop";
      return next();
    }

    // Check if user is HoD of project's department
    if (project.department && project.department.head) {
      const deptHeadId = String(project.department.head._id || project.department.head);
      if (deptHeadId === uid) {
        req.hopProject = project;
        req.canManage = true;
        req.manageRole = "hod";
        return next();
      }
    }

    // Check if user is an active team member (for team management operations)
    const isTeamMember = project.assignedUsers?.some((assignedUser) =>
      String(assignedUser?._id || assignedUser) === uid
    ) || project.teamMembers?.some((member) => {
      if (member?.isActive === false) return false;
      return String(member.user?._id || member.user) === uid;
    });

    if (isTeamMember) {
      req.hopProject = project;
      req.canManage = true;
      req.manageRole = "team_member";
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. You don't have permission to manage this project.",
    });
  } catch (error) {
    console.error("Error in canManageProject:", error);
    
    res.status(500).json({
      success: false,
      message: "Error checking permissions",
      error: error.message,
    });
  }
};

/**
 * Check if user can create slots (must be HoP)
 */
export const canCreateSlots = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const projectId = req.body.project;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      projectHead: userId,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the Head of Project can create slots.",
      });
    }

    req.hopProject = project;
    next();
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error checking permissions",
      error: error.message,
    });
  }
};

export default {
  isHoP,
  isHoPOfProject,
  canManageProject,
  canCreateSlots,
};
