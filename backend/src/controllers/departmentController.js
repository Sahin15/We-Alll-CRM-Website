import Department from "../models/departmentModel.js";
import User from "../models/userModel.js";

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

    res.status(201).json({
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Error in createDepartment:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all departments
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("head", "name email")
      .populate("employees", "name email position");

    res.status(200).json(departments);
  } catch (error) {
    console.error("Error in getDepartments:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get department by ID
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("head", "name email")
      .populate("employees", "name email position");

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.status(200).json(department);
  } catch (error) {
    console.error("Error in getDepartmentById:", error.message);
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

    res.status(200).json({
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    console.error("Error in updateDepartment:", error.message);
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
    console.error("Error in deleteDepartment:", error.message);
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
    console.error("Error in addEmployeeToDepartment:", error.message);
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
    console.error("Error in removeEmployeeFromDepartment:", error.message);
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
    console.error("Error in bulkAssignEmployees:", error.message);
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
    console.error("Error in setDepartmentHead:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get department analytics
export const getDepartmentAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id)
      .populate("head", "name email")
      .populate("employees", "name email position role status");

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Calculate analytics
    const totalEmployees = department.employees.length;
    const activeEmployees = department.employees.filter(
      (e) => e.status === "active"
    ).length;
    const inactiveEmployees = totalEmployees - activeEmployees;

    // Role distribution
    const roleDistribution = department.employees.reduce((acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1;
      return acc;
    }, {});

    // Position distribution
    const positionDistribution = department.employees.reduce((acc, emp) => {
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
      employees: department.employees,
    };

    res.status(200).json(analytics);
  } catch (error) {
    console.error("Error in getDepartmentAnalytics:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all departments analytics summary
export const getAllDepartmentsAnalytics = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("head", "name email")
      .populate("employees", "name email position role status");

    const summary = departments.map((dept) => ({
      id: dept._id,
      name: dept.name,
      status: dept.status,
      totalEmployees: dept.employees.length,
      activeEmployees: dept.employees.filter((e) => e.status === "active")
        .length,
      hasHead: !!dept.head,
      headName: dept.head?.name || "Not Assigned",
    }));

    const overallStats = {
      totalDepartments: departments.length,
      activeDepartments: departments.filter((d) => d.status === "active")
        .length,
      totalEmployees: departments.reduce(
        (sum, d) => sum + d.employees.length,
        0
      ),
      departmentsWithHead: departments.filter((d) => d.head).length,
    };

    res.status(200).json({
      overallStats,
      departments: summary,
    });
  } catch (error) {
    console.error("Error in getAllDepartmentsAnalytics:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
