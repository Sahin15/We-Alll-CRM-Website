import workloadService from "../services/workloadService.js";
import User from "../models/userModel.js";

/**
 * Get workload for a single employee
 * GET /api/workload/employee/:employeeId
 */
export const getEmployeeWorkload = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Authorization check
    // Employees can only view their own workload
    // HoP, HoD, Admin, Superadmin can view any employee's workload
    if (userRole === "employee" && employeeId !== userId) {
      return res.status(403).json({ 
        message: "You can only view your own workload" 
      });
    }
    
    // Get employee details
    const employee = await User.findById(employeeId)
      .select("_id name email designation avatar department");
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Calculate workload
    const workload = await workloadService.calculateWorkload(employeeId);
    
    res.status(200).json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        designation: employee.designation,
        avatar: employee.avatar
      },
      ...workload
    });
  } catch (error) {
    console.error("Error in getEmployeeWorkload:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get workload for all employees in a department
 * GET /api/workload/department/:departmentId
 */
export const getDepartmentWorkload = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const userRole = req.user.role;
    const userDepartment = req.user.department;
    
    // Authorization check
    // HoD can only view their own department
    // Admin, Superadmin, HR, Manager can view any department
    if (userRole === "hod" && departmentId !== userDepartment?.toString()) {
      return res.status(403).json({ 
        message: "You can only view workload for your own department" 
      });
    }
    
    if (!["admin", "superadmin", "hr", "manager", "hod"].includes(userRole)) {
      return res.status(403).json({ 
        message: "You don't have permission to view department workload" 
      });
    }
    
    // Get department workload
    const workloads = await workloadService.getDepartmentWorkload(departmentId);
    
    res.status(200).json({
      departmentId,
      employees: workloads,
      summary: {
        total: workloads.length,
        available: workloads.filter(w => w.capacity === "available").length,
        busy: workloads.filter(w => w.capacity === "busy").length,
        overloaded: workloads.filter(w => w.capacity === "overloaded").length
      }
    });
  } catch (error) {
    console.error("Error in getDepartmentWorkload:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get workload for all team members in a project
 * GET /api/workload/project/:projectId
 */
export const getProjectWorkload = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get project workload
    const workloads = await workloadService.getProjectWorkload(projectId);
    
    // Authorization check
    // Project head can view their project's workload
    // HoD can view projects in their department
    // Admin, Superadmin can view any project
    // For now, allow all authenticated users (can be restricted later)
    
    res.status(200).json({
      projectId,
      teamMembers: workloads,
      summary: {
        total: workloads.length,
        available: workloads.filter(w => w.capacity === "available").length,
        busy: workloads.filter(w => w.capacity === "busy").length,
        overloaded: workloads.filter(w => w.capacity === "overloaded").length
      }
    });
  } catch (error) {
    console.error("Error in getProjectWorkload:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get workload trends for an employee (30-day history)
 * GET /api/workload/trends/:employeeId
 */
export const getWorkloadTrends = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { days = 30 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Authorization check
    // Employees can only view their own trends
    // HoP, HoD, Admin, Superadmin can view any employee's trends
    if (userRole === "employee" && employeeId !== userId) {
      return res.status(403).json({ 
        message: "You can only view your own workload trends" 
      });
    }
    
    // Get employee details
    const employee = await User.findById(employeeId)
      .select("_id name email designation");
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Get workload trends
    const trends = await workloadService.getWorkloadTrends(employeeId, parseInt(days));
    
    // Analyze trends for recommendations
    const overloadedDays = trends.filter(t => t.capacity === "overloaded").length;
    const overloadPercentage = (overloadedDays / trends.length) * 100;
    
    const recommendation = overloadPercentage > 50 
      ? "Employee has been consistently overloaded. Consider redistributing work to other team members."
      : overloadPercentage > 30
      ? "Employee workload is high. Monitor closely and consider rebalancing if it continues."
      : "Employee workload is within normal range.";
    
    res.status(200).json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        designation: employee.designation
      },
      trends,
      analysis: {
        totalDays: trends.length,
        overloadedDays,
        overloadPercentage: Math.round(overloadPercentage),
        recommendation
      }
    });
  } catch (error) {
    console.error("Error in getWorkloadTrends:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get workload for multiple employees (batch request)
 * POST /api/workload/batch
 * Body: { employeeIds: [id1, id2, ...] }
 */
export const getBatchWorkload = async (req, res) => {
  try {
    const { employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ 
        message: "employeeIds array is required" 
      });
    }
    
    // Get employee details
    const employees = await User.find({
      _id: { $in: employeeIds }
    }).select("_id name email designation avatar");
    
    // Calculate workload for each employee
    const workloads = await Promise.all(
      employees.map(async (employee) => {
        const workload = await workloadService.calculateWorkload(employee._id);
        return {
          employee: {
            _id: employee._id,
            name: employee.name,
            email: employee.email,
            designation: employee.designation,
            avatar: employee.avatar
          },
          ...workload
        };
      })
    );
    
    res.status(200).json({
      workloads,
      summary: {
        total: workloads.length,
        available: workloads.filter(w => w.capacity === "available").length,
        busy: workloads.filter(w => w.capacity === "busy").length,
        overloaded: workloads.filter(w => w.capacity === "overloaded").length
      }
    });
  } catch (error) {
    console.error("Error in getBatchWorkload:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  getEmployeeWorkload,
  getDepartmentWorkload,
  getProjectWorkload,
  getWorkloadTrends,
  getBatchWorkload
};
