import Project from "../models/projectModel.js";
import User from "../models/userModel.js";

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
    console.error("Error in isHoP middleware:", error);
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
    console.error("Error in isHoPOfProject middleware:", error);
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

    // Admin, superadmin, and HR can always manage projects
    if (["admin", "superadmin", "hr"].includes(userRole)) {
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

    // Check if user is HoP
    if (project.projectHead && project.projectHead.toString() === userId.toString()) {
      req.hopProject = project;
      req.canManage = true;
      req.manageRole = "hop";
      return next();
    }

    // Check if user is HoD of project's department
    if (project.department && project.department.head) {
      if (project.department.head.toString() === userId.toString()) {
        req.hopProject = project;
        req.canManage = true;
        req.manageRole = "hod";
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. You don't have permission to manage this project.",
    });
  } catch (error) {
    console.error("Error in canManageProject middleware:", error);
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
    console.error("Error in canCreateSlots middleware:", error);
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
