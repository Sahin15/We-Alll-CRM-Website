import mongoose from "mongoose";
import SalaryStructure from "../models/salaryStructureModel.js";
import User from "../models/userModel.js";

// Create new salary structure
export const createSalaryStructure = async (req, res) => {
  try {
    const {
      employee,
      effectiveFrom,
      basicSalary,
      hra,
      specialAllowance,
      transportAllowance,
      medicalAllowance,
      otherAllowances,
      providentFund,
      professionalTax,
      tds,
      esi,
      otherDeductions,
      notes,
    } = req.body;

    // Validate employee exists
    const employeeExists = await User.findById(employee);
    if (!employeeExists) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if there's an active structure for this employee
    const activeStructure = await SalaryStructure.findOne({
      employee,
      status: "active",
    });

    // If creating a new active structure, supersede the old one
    if (activeStructure && req.body.status === "active") {
      activeStructure.status = "superseded";
      activeStructure.effectiveTo = new Date(effectiveFrom);
      await activeStructure.save();
    }

    // Create new structure
    const salaryStructure = await SalaryStructure.create({
      employee,
      effectiveFrom,
      basicSalary,
      hra,
      specialAllowance,
      transportAllowance,
      medicalAllowance,
      otherAllowances,
      providentFund,
      professionalTax,
      tds,
      esi,
      otherDeductions,
      notes,
      createdBy: req.user.id,
      status: req.body.status || "draft",
    });

    await salaryStructure.populate("employee", "name email employeeId designation department");

    res.status(201).json({
      message: "Salary structure created successfully",
      salaryStructure,
    });
  } catch (error) {
    console.error("Error creating salary structure:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all salary structures (HR/Admin)
export const getAllSalaryStructures = async (req, res) => {
  try {
    const { status, employee, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (employee) filter.employee = employee;

    const skip = (page - 1) * limit;

    const structures = await SalaryStructure.find(filter)
      .populate("employee", "name email employeeId designation department")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SalaryStructure.countDocuments(filter);

    res.status(200).json({
      structures,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching salary structures:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get salary structure by ID
export const getSalaryStructureById = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await SalaryStructure.findById(id)
      .populate("employee", "name email employeeId designation department")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");

    if (!structure) {
      return res.status(404).json({ message: "Salary structure not found" });
    }

    res.status(200).json(structure);
  } catch (error) {
    console.error("Error fetching salary structure:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get active salary structure for an employee
export const getActiveSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const structure = await SalaryStructure.getActiveStructure(employeeId);

    if (!structure) {
      return res.status(404).json({ 
        message: "No active salary structure found for this employee" 
      });
    }

    res.status(200).json(structure);
  } catch (error) {
    console.error("Error fetching active salary structure:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update salary structure
export const updateSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({ message: "Salary structure not found" });
    }

    // Only allow updating draft structures
    if (structure.status !== "draft") {
      return res.status(400).json({
        message: "Cannot update active or superseded salary structures. Create a new revision instead.",
      });
    }

    // Update fields
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined && key !== "employee") {
        structure[key] = req.body[key];
      }
    });

    await structure.save();
    await structure.populate("employee", "name email employeeId designation department");

    res.status(200).json({
      message: "Salary structure updated successfully",
      salaryStructure: structure,
    });
  } catch (error) {
    console.error("Error updating salary structure:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Activate salary structure
export const activateSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({ message: "Salary structure not found" });
    }

    if (structure.status === "active") {
      return res.status(400).json({ message: "Structure is already active" });
    }

    // Supersede any existing active structure for this employee
    const activeStructure = await SalaryStructure.findOne({
      employee: structure.employee,
      status: "active",
    });

    if (activeStructure) {
      activeStructure.status = "superseded";
      activeStructure.effectiveTo = new Date(structure.effectiveFrom);
      await activeStructure.save();
    }

    // Activate the structure
    structure.status = "active";
    structure.approvedBy = req.user.id;
    await structure.save();

    await structure.populate("employee", "name email employeeId designation department");

    res.status(200).json({
      message: "Salary structure activated successfully",
      salaryStructure: structure,
    });
  } catch (error) {
    console.error("Error activating salary structure:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete ALL salary structures (superadmin/admin only — irreversible)
export const deleteAllSalaryStructures = async (req, res) => {
  try {
    const result = await SalaryStructure.deleteMany({});
    res.status(200).json({
      message: `Deleted ${result.deletedCount} salary structure(s) successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all salary structures:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete salary structure (only drafts)
export const deleteSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log("Delete request for salary structure ID:", id);
    console.log("User role:", req.user.role);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid salary structure ID" });
    }

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      console.log("Salary structure not found:", id);
      return res.status(404).json({ message: "Salary structure not found" });
    }

    console.log("Found structure:", {
      id: structure._id,
      status: structure.status,
      employee: structure.employee
    });

    // Only allow deleting draft structures
    if (structure.status !== "draft") {
      console.log("Cannot delete non-draft structure. Status:", structure.status);
      return res.status(400).json({
        message: "Cannot delete active or superseded salary structures. Only draft structures can be deleted.",
      });
    }

    console.log("Deleting salary structure:", id);
    await SalaryStructure.findByIdAndDelete(id);
    console.log("Salary structure deleted successfully");

    res.status(200).json({
      message: "Salary structure deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting salary structure:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get salary structure history for an employee
export const getSalaryStructureHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const structures = await SalaryStructure.find({ employee: employeeId })
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ effectiveFrom: -1 });

    res.status(200).json(structures);
  } catch (error) {
    console.error("Error fetching salary structure history:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
