import Department from "../models/departmentModel.js";
import Project from "../models/projectModel.js";

/**
 * Check if user is Head of Department
 */
export const isHoD = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const userIdStr = String(userId);

    // Prefer Department.head (source of truth), with ObjectId/string-safe match
    let department = await Department.findOne({
      status: "active",
      $or: [{ head: userId }, { head: userIdStr }],
    });

    // Fallback: user flagged as HoD with headOfDepartment set
    if (!department && req.user.isHeadOfDepartment && req.user.headOfDepartment) {
      const deptId = req.user.headOfDepartment._id || req.user.headOfDepartment;
      department = await Department.findOne({
        _id: deptId,
        status: "active",
      });
    }

    // Fallback: role hod + primary department
    if (!department && req.user.role === "hod" && req.user.department) {
      const deptId = req.user.department._id || req.user.department;
      department = await Department.findOne({
        _id: deptId,
        status: "active",
        $or: [{ head: userId }, { head: userIdStr }],
      });
    }

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a Head of Department.",
      });
    }

    req.hodDepartment = department;
    next();
  } catch (error) {
    
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
    const departmentId =
      req.params.departmentId || req.params.id || req.body.department;

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
    
    res.status(500).json({
      success: false,
      message: "Error checking permissions",
      error: error.message,
    });
  }
};

/**
 * Allow admin department view OR HoD access to their own department record.
 * Used on GET /departments/:id so dashboards can load HoD context without team.department.view.
 *
 * @param {import('express').RequestHandler} deptViewMiddleware
 * @returns {import('express').RequestHandler}
 */
export const allowDeptViewOrHoDOfDepartment = (deptViewMiddleware) => {
  return async (req, res, next) => {
    try {
      const departmentId =
        req.params.departmentId || req.params.id || req.body.department;

      if (departmentId) {
        const department = await Department.findOne({
          _id: departmentId,
          head: req.user._id,
          status: "active",
        });

        if (department) {
          req.hodDepartment = department;
          return next();
        }
      }

      return deptViewMiddleware(req, res, next);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error checking department access",
        error: error.message,
      });
    }
  };
};

export default {
  isHoD,
  isHoDOfDepartment,
  canAssignHoP,
  allowDeptViewOrHoDOfDepartment,
};
