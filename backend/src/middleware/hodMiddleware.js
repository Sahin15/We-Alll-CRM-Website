import Department from "../models/departmentModel.js";
import Project from "../models/projectModel.js";

/**
 * Check if user is Head of Department
 */
export const isHoD = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Check if user is HoD of any department
    const department = await Department.findOne({ head: userId, status: "active" });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a Head of Department.",
      });
    }

    // Attach department to request for later use
    req.hodDepartment = department;
    next();
  } catch (error) {
    console.error("Error in isHoD middleware:", error);
    res.status(500).json({
      success: false,
      message: "Error checking HoD status",
      error: error.message,
    });
  }
};

/**
 * Check if user is HoD of a specific department
 */
export const isHoDOfDepartment = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const departmentId = req.params.departmentId || req.body.department;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: "Department ID is required",
      });
    }

    const department = await Department.findOne({
      _id: departmentId,
      head: userId,
      status: "active",
    });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not the Head of this Department.",
      });
    }

    req.hodDepartment = department;
    next();
  } catch (error) {
    console.error("Error in isHoDOfDepartment middleware:", error);
    res.status(500).json({
      success: false,
      message: "Error checking HoD status",
      error: error.message,
    });
  }
};

/**
 * Check if user can assign HoP (must be HoD of project's department, or admin/superadmin)
 */
export const canAssignHoP = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const projectId = req.params.projectId || req.params.id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Get project with department
    const project = await Project.findById(projectId).populate("department");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Admin and superadmin can always assign HoP
    if (["admin", "superadmin"].includes(userRole)) {
      req.project = project;
      return next();
    }

    if (!project.department) {
      return res.status(400).json({
        success: false,
        message: "Project is not assigned to any department",
      });
    }

    // Check if user is HoD of the project's department
    const department = await Department.findOne({
      _id: project.department._id,
      head: userId,
      status: "active",
    });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the Head of Department can assign Head of Project.",
      });
    }

    req.project = project;
    req.hodDepartment = department;
    next();
  } catch (error) {
    console.error("Error in canAssignHoP middleware:", error);
    res.status(500).json({
      success: false,
      message: "Error checking permissions",
      error: error.message,
    });
  }
};

export default {
  isHoD,
  isHoDOfDepartment,
  canAssignHoP,
};
