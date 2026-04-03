import Department from "../models/departmentModel.js";
import User from "../models/userModel.js";
import logger from '../utils/logger.js';

// Simple in-memory cache for departments (they rarely change)
let departmentCache = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const clearDepartmentCache = () => {
  departmentCache = null;
  cacheTime = null;
};

// Create new department
export const createDepartment = async (req, res) => {
  try {
    const { name, description, head } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const department = await Department.create({
      name,
      description,
      head,
    });

    clearDepartmentCache(); // Clear cache when department is created
    
    res.status(201).json({
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    logger.error("Error in createDepartment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all departments (with caching - optimized)
export const getDepartments = async (req, res) => {
  try {
    // Check cache
    if (departmentCache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
      logger.info('Returning cached departments');
      return res.status(200).json(departmentCache);
    }
    
    logger.info('Fetching departments from database');
    
    const departments = await Department.find()
      .select('name description head status type')
      .populate("head", "name email")
      .lean();

    // Get actual employee counts by querying User model
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await User.countDocuments({ department: dept._id });
        return {
          ...dept,
          employees: [], // Keep empty array for backward compatibility
          employeeCount: employeeCount // Add actual count
        };
      })
    );

    // Update cache
    departmentCache = departmentsWithCounts;
    cacheTime = Date.now();

    res.status(200).json(departmentsWithCounts);
  } catch (error) {
    logger.error("Error in getDepartments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get only operational departments (for client assignment)
export const getOperationalDepartments = async (req, res) => {
  try {
    logger.info('Fetching operational departments from database');
    
    const departments = await Department.find({ type: 'operational', status: 'active' })
      .select('name description head status employees type')
      .populate("head", "name email")
      .lean();

    res.status(200).json(departments);
  } catch (error) {
    logger.error("Error in getOperationalDepartments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get department by ID
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("head", "name email")
      .lean();

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Query employees directly from User model for accurate data
    const employees = await User.find({ department: req.params.id })
      .select("name email position")
      .lean();

    // Add employees to department object
    department.employees = employees;

    res.status(200).json(department);
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const { name, description, head, status } = req.body;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, description, head, status },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    clearDepartmentCache(); // Clear cache when department is updated
    
    res.status(200).json({
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    logger.error("Error in updateDepartment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete department
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Add employee to department
export const addEmployeeToDepartment = async (req, res) => {
  try {
    const { departmentId, userId } = req.params;

    const department = await Department.findById(departmentId);
    const user = await User.findById(userId);

    if (!department || !user) {
      return res.status(404).json({ message: "Department or User not found" });
    }

    if (!department.employees.includes(userId)) {
      department.employees.push(userId);
      await department.save();

      // Update user's department
      user.department = departmentId;
      await user.save();
    }

    res.status(200).json({
      message: "Employee added to department successfully",
      department,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Remove employee from department
export const removeEmployeeFromDepartment = async (req, res) => {
  try {
    const { departmentId, userId } = req.params;

    const department = await Department.findById(departmentId);
    const user = await User.findById(userId);

    if (!department || !user) {
      return res.status(404).json({ message: "Department or User not found" });
    }

    department.employees = department.employees.filter(
      (id) => id.toString() !== userId
    );
    await department.save();

    // Remove department from user
    user.department = null;
    await user.save();

    res.status(200).json({
      message: "Employee removed from department successfully",
      department,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Bulk assign employees to department
export const bulkAssignEmployees = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res
        .status(400)
        .json({ message: "Employee IDs array is required" });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Add employees to department
    const uniqueEmployeeIds = [
      ...new Set([
        ...department.employees.map((e) => e.toString()),
        ...employeeIds,
      ]),
    ];
    department.employees = uniqueEmployeeIds;
    await department.save();

    // Update all users' department field
    await User.updateMany(
      { _id: { $in: employeeIds } },
      { department: departmentId }
    );

    const updatedDepartment = await Department.findById(departmentId)
      .populate("head", "name email")
      .populate("employees", "name email position");

    res.status(200).json({
      message: "Employees assigned successfully",
      department: updatedDepartment,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Set department head
export const setDepartmentHead = async (req, res) => {
  try {
    const { departmentId, userId } = req.params;

    const department = await Department.findById(departmentId);
    const user = await User.findById(userId);

    if (!department || !user) {
      return res.status(404).json({ message: "Department or User not found" });
    }

    department.head = userId;
    await department.save();

    const updatedDepartment = await Department.findById(departmentId)
      .populate("head", "name email")
      .populate("employees", "name email position");

    res.status(200).json({
      message: "Department head set successfully",
      department: updatedDepartment,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get department analytics
export const getDepartmentAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    

    const department = await Department.findById(id)
      .populate("head", "name email");

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    

    // Query employees directly from User model instead of relying on department.employees array
    // This ensures we always get the current state without sync issues
    const employees = await User.find({ department: id })
      .select("name email position role status")
      .lean();

    // Calculate analytics
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(
      (e) => e.status === "active"
    ).length;
    const inactiveEmployees = totalEmployees - activeEmployees;

    // Role distribution
    const roleDistribution = employees.reduce((acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1;
      return acc;
    }, {});

    // Position distribution
    const positionDistribution = employees.reduce((acc, emp) => {
      const position = emp.position || "Not Assigned";
      acc[position] = (acc[position] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      department: {
        id: department._id,
        name: department.name,
        description: department.description,
        status: department.status,
        head: department.head,
      },
      stats: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        hasHead: !!department.head,
      },
      roleDistribution,
      positionDistribution,
      employees: employees,
    };

    res.status(200).json(analytics);
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get all departments analytics summary
export const getAllDepartmentsAnalytics = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("head", "name email")
      .lean();

    // Get employee counts for each department by querying User model
    const summary = await Promise.all(
      departments.map(async (dept) => {
        const employees = await User.find({ department: dept._id })
          .select("status")
          .lean();

        return {
          id: dept._id,
          name: dept.name,
          status: dept.status,
          totalEmployees: employees.length,
          activeEmployees: employees.filter((e) => e.status === "active").length,
          hasHead: !!dept.head,
          headName: dept.head?.name || "Not Assigned",
        };
      })
    );

    const overallStats = {
      totalDepartments: departments.length,
      activeDepartments: departments.filter((d) => d.status === "active").length,
      totalEmployees: summary.reduce((sum, d) => sum + d.totalEmployees, 0),
      departmentsWithHead: departments.filter((d) => d.head).length,
    };

    res.status(200).json({
      overallStats,
      departments: summary,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================
// HoD (Head of Department) Management
// ============================================

/**
 * Assign Head of Department
 * Only Admin/SuperAdmin/HR can assign HoD
 */
export const assignHoD = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find department and user
    const department = await Department.findById(departmentId);
    const user = await User.findById(userId);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is in the department
    if (!department.employees.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "User must be a member of the department first",
      });
    }

    // Remove HoD status from previous head if exists
    if (department.head) {
      const previousHead = await User.findById(department.head);
      if (previousHead) {
        previousHead.isHeadOfDepartment = false;
        previousHead.headOfDepartment = null;
        await previousHead.save();
      }
    }

    // Update department
    department.head = userId;
    department.headAssignedBy = req.user._id;
    department.headAssignedAt = new Date();
    await department.save();

    // Update user
    user.isHeadOfDepartment = true;
    user.headOfDepartment = departmentId;
    await user.save();

    const updatedDepartment = await Department.findById(departmentId)
      .populate("head", "name email designation")
      .populate("headAssignedBy", "name email")
      .populate("employees", "name email designation");

    res.status(200).json({
      success: true,
      message: "Head of Department assigned successfully",
      data: updatedDepartment,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error assigning Head of Department",
      error: error.message,
    });
  }
};

/**
 * Remove Head of Department
 */
export const removeHoD = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    if (!department.head) {
      return res.status(400).json({
        success: false,
        message: "Department has no Head assigned",
      });
    }

    // Update user
    const user = await User.findById(department.head);
    if (user) {
      user.isHeadOfDepartment = false;
      user.headOfDepartment = null;
      await user.save();
    }

    // Update department
    department.head = null;
    department.headAssignedBy = null;
    department.headAssignedAt = null;
    await department.save();

    res.status(200).json({
      success: true,
      message: "Head of Department removed successfully",
      data: department,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error removing Head of Department",
      error: error.message,
    });
  }
};

/**
 * Get all projects in a department
 * Accessible by HoD
 */
export const getDepartmentProjects = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId)
      .populate({
        path: "projects",
        populate: [
          { path: "projectHead", select: "name email designation" },
          { path: "client", select: "name email" },
          { path: "teamMembers.user", select: "name email designation" },
        ],
      })
      .populate("head", "name email designation");

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        department: {
          _id: department._id,
          name: department.name,
          head: department.head,
        },
        projects: department.projects,
        totalProjects: department.projects.length,
      },
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error fetching department projects",
      error: error.message,
    });
  }
};

/**
 * Get department members
 */
export const getDepartmentMembers = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId)
      .populate("head", "name email designation")
      .lean();

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Query employees directly from User model
    const members = await User.find({ department: departmentId })
      .select("name email designation employeeId status")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        department: {
          _id: department._id,
          name: department.name,
          head: department.head,
        },
        members: members,
        totalMembers: members.length,
      },
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error fetching department members",
      error: error.message,
    });
  }
};

/**
 * Get department statistics
 * For HoD dashboard
 */
export const getDepartmentStats = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId)
      .populate("projects")
      .lean();

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Query employees directly from User model
    const employees = await User.find({ department: departmentId })
      .select("name status")
      .lean();

    // Calculate stats
    const totalMembers = employees.length;
    const activeMembers = employees.filter(
      (e) => e.status === "active"
    ).length;
    const totalProjects = department.projects.length;
    const activeProjects = department.projects.filter(
      (p) => p.status === "In Progress" || p.status === "Active"
    ).length;
    const completedProjects = department.projects.filter(
      (p) => p.status === "Completed"
    ).length;

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        totalProjects,
        activeProjects,
        completedProjects,
        pendingProjects: totalProjects - activeProjects - completedProjects,
      },
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error fetching department statistics",
      error: error.message,
    });
  }
};
