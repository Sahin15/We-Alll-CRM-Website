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

    // Allow updating draft and active structures
    // For active structures, we'll create a new version instead of modifying the current one
    if (structure.status === "superseded") {
      return res.status(400).json({
        message: "Cannot update superseded salary structures.",
      });
    }

    // If updating an active structure, create a new one instead
    if (structure.status === "active") {
      // Create a new structure with the updated values
      const newStructure = new SalaryStructure({
        employee: structure.employee,
        effectiveFrom: req.body.effectiveFrom || structure.effectiveFrom,
        basicSalary: req.body.basicSalary || structure.basicSalary,
        hra: req.body.hra !== undefined ? req.body.hra : structure.hra,
        specialAllowance: req.body.specialAllowance !== undefined ? req.body.specialAllowance : structure.specialAllowance,
        transportAllowance: req.body.transportAllowance !== undefined ? req.body.transportAllowance : structure.transportAllowance,
        medicalAllowance: req.body.medicalAllowance !== undefined ? req.body.medicalAllowance : structure.medicalAllowance,
        otherAllowances: req.body.otherAllowances || structure.otherAllowances,
        providentFund: req.body.providentFund !== undefined ? req.body.providentFund : structure.providentFund,
        professionalTax: req.body.professionalTax !== undefined ? req.body.professionalTax : structure.professionalTax,
        tds: req.body.tds !== undefined ? req.body.tds : structure.tds,
        esi: req.body.esi !== undefined ? req.body.esi : structure.esi,
        otherDeductions: req.body.otherDeductions || structure.otherDeductions,
        notes: req.body.notes || structure.notes,
        createdBy: req.user.id,
        status: "draft", // New structure starts as draft
      });

      await newStructure.save();
      await newStructure.populate("employee", "name email employeeId designation department");

      return res.status(200).json({
        message: "New salary structure version created. Please activate it to replace the current active structure.",
        salaryStructure: newStructure,
      });
    }

    // For draft structures, update directly
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
    
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete salary structure (only drafts)
export const deleteSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;
    
    
    

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid salary structure ID" });
    }

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      
      return res.status(404).json({ message: "Salary structure not found" });
    }

    

    // Only allow deleting draft structures, unless user is admin/superadmin
    if (structure.status !== "draft" && !['admin', 'superadmin'].includes(req.user?.role)) {
      return res.status(400).json({
        message: "Cannot delete active or superseded salary structures. Only draft structures can be deleted.",
      });
    }

    
    await SalaryStructure.findByIdAndDelete(id);
    

    res.status(200).json({
      message: "Salary structure deleted successfully",
    });
  } catch (error) {
    
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
    
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
