import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import SalaryStructureTemplate from "../models/salaryStructureTemplateModel.js";
import SalaryStructure from "../models/salaryStructureModel.js";
import User from "../models/userModel.js";
import Department from "../models/departmentModel.js";
import { mergeActiveEmployeeFilter } from "../utils/employeeQueryUtils.js";

const router = express.Router();

const PAYROLL_STRUCTURE_ROLES = ["admin", "superadmin", "hr", "manager"];

// Get all templates
router.get("/", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const templates = await SalaryStructureTemplate.find()
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(templates);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get template by ID
router.get("/:id", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const template = await SalaryStructureTemplate.findById(req.params.id)
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.json(template);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create new template
router.post("/", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const {
      name,
      department,
      designation,
      basicSalary,
      hra,
      specialAllowance,
      transportAllowance,
      medicalAllowance,
      providentFund,
      professionalTax,
      tds,
      esi,
      hraPercentage,
      pfPercentage,
      notes,
      effectiveFrom
    } = req.body;

    // Validate required fields
    if (!name || !department || !designation || !basicSalary) {
      return res.status(400).json({ 
        message: "Name, department, designation, and basic salary are required" 
      });
    }

    // Check if department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({ message: "Invalid department" });
    }

    // Find the highest version for this template name
    const existingTemplate = await SalaryStructureTemplate.findOne({ name })
      .sort({ version: -1 });
    
    const nextVersion = existingTemplate ? existingTemplate.version + 1 : 1;

    // Create template
    const template = new SalaryStructureTemplate({
      name,
      department,
      designation,
      basicSalary,
      hra: hra || 0,
      specialAllowance: specialAllowance || 0,
      transportAllowance: transportAllowance || 0,
      medicalAllowance: medicalAllowance || 0,
      providentFund: providentFund || 0,
      professionalTax: professionalTax || 0,
      tds: tds || 0,
      esi: esi || 0,
      hraPercentage: hraPercentage || 0,
      pfPercentage: pfPercentage || 0,
      notes,
      effectiveFrom: effectiveFrom || new Date(),
      createdBy: req.user._id,
      version: nextVersion,
      isActive: true
    });

    await template.save();
    await template.populate('department', 'name');
    await template.populate('createdBy', 'name email');

    res.status(201).json(template);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update template
router.put("/:id", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const template = await SalaryStructureTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const {
      name,
      department,
      designation,
      basicSalary,
      hra,
      specialAllowance,
      transportAllowance,
      medicalAllowance,
      providentFund,
      professionalTax,
      tds,
      esi,
      hraPercentage,
      pfPercentage,
      notes
    } = req.body;

    // Check if department exists
    if (department) {
      const departmentExists = await Department.findById(department);
      if (!departmentExists) {
        return res.status(400).json({ message: "Invalid department" });
      }
    }

    // Update template
    const updatedTemplate = await SalaryStructureTemplate.findByIdAndUpdate(
      req.params.id,
      {
        name: name || template.name,
        department: department || template.department,
        designation: designation || template.designation,
        basicSalary: basicSalary || template.basicSalary,
        hra: hra !== undefined ? hra : template.hra,
        specialAllowance: specialAllowance !== undefined ? specialAllowance : template.specialAllowance,
        transportAllowance: transportAllowance !== undefined ? transportAllowance : template.transportAllowance,
        medicalAllowance: medicalAllowance !== undefined ? medicalAllowance : template.medicalAllowance,
        providentFund: providentFund !== undefined ? providentFund : template.providentFund,
        professionalTax: professionalTax !== undefined ? professionalTax : template.professionalTax,
        tds: tds !== undefined ? tds : template.tds,
        esi: esi !== undefined ? esi : template.esi,
        hraPercentage: hraPercentage !== undefined ? hraPercentage : template.hraPercentage,
        pfPercentage: pfPercentage !== undefined ? pfPercentage : template.pfPercentage,
        notes: notes !== undefined ? notes : template.notes,
        version: template.version + 1,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('department', 'name').populate('createdBy', 'name email');

    res.json(updatedTemplate);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Apply template to specific employees
router.post("/:id/apply", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const { employeeIds, effectiveDate } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: "Employee IDs are required" });
    }

    const template = await SalaryStructureTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const employeeId of employeeIds) {
      try {
        // Check if employee exists
        const employee = await User.findById(employeeId);
        if (!employee) {
          results.failed.push({ employeeId, reason: "Employee not found" });
          continue;
        }

        // Deactivate existing salary structures
        await SalaryStructure.updateMany(
          { employee: employeeId, isActive: true },
          { isActive: false, updatedAt: new Date() }
        );

        // Create new salary structure from template
        const salaryStructure = new SalaryStructure({
          employee: employeeId,
          basicSalary: template.basicSalary,
          hra: template.hra,
          specialAllowance: template.specialAllowance,
          transportAllowance: template.transportAllowance,
          medicalAllowance: template.medicalAllowance,
          providentFund: template.providentFund,
          professionalTax: template.professionalTax,
          tds: template.tds,
          esi: template.esi,
          grossSalary: template.grossSalary,
          effectiveFrom: effectiveDate ? new Date(effectiveDate) : new Date(),
          createdBy: req.user._id,
          isActive: true,
          templateId: template._id
        });

        await salaryStructure.save();
        results.success.push({ employeeId, employee: employee.name });
      } catch (error) {
        results.failed.push({ employeeId, reason: error.message });
      }
    }

    res.json({
      message: `Template applied: ${results.success.length} successful, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Bulk apply template to department/designation
router.post("/:id/bulk-apply", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const { department, designation, effectiveDate } = req.body;

    const template = await SalaryStructureTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Build query for employees
    const query = mergeActiveEmployeeFilter({ role: "employee" });
    if (department) query.department = department;
    if (designation) query.designation = { $regex: designation, $options: 'i' };

    const employees = await User.find(query);

    if (employees.length === 0) {
      return res.status(400).json({ message: "No employees found matching criteria" });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const employee of employees) {
      try {
        // Deactivate existing salary structures
        await SalaryStructure.updateMany(
          { employee: employee._id, isActive: true },
          { isActive: false, updatedAt: new Date() }
        );

        // Create new salary structure from template
        const salaryStructure = new SalaryStructure({
          employee: employee._id,
          basicSalary: template.basicSalary,
          hra: template.hra,
          specialAllowance: template.specialAllowance,
          transportAllowance: template.transportAllowance,
          medicalAllowance: template.medicalAllowance,
          providentFund: template.providentFund,
          professionalTax: template.professionalTax,
          tds: template.tds,
          esi: template.esi,
          grossSalary: template.grossSalary,
          effectiveFrom: effectiveDate ? new Date(effectiveDate) : new Date(),
          createdBy: req.user._id,
          isActive: true,
          templateId: template._id
        });

        await salaryStructure.save();
        results.success.push({ employeeId: employee._id, employee: employee.name });
      } catch (error) {
        results.failed.push({ employeeId: employee._id, reason: error.message });
      }
    }

    res.json({
      message: `Bulk template applied: ${results.success.length} successful, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete template
router.delete("/:id", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const template = await SalaryStructureTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Check if template is being used
    const usageCount = await SalaryStructure.countDocuments({ templateId: req.params.id });
    if (usageCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete template. It is currently used by ${usageCount} salary structure(s)` 
      });
    }

    await SalaryStructureTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get template usage statistics
router.get("/:id/usage-stats", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const template = await SalaryStructureTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const usageCount = await SalaryStructure.countDocuments({ templateId: req.params.id });
    const activeUsage = await SalaryStructure.countDocuments({ 
      templateId: req.params.id, 
      isActive: true 
    });

    const usageByDepartment = await SalaryStructure.aggregate([
      { $match: { templateId: template._id } },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      {
        $lookup: {
          from: 'departments',
          localField: 'employeeData.department',
          foreignField: '_id',
          as: 'departmentData'
        }
      },
      { $unwind: { path: '$departmentData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$departmentData.name',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      template: template.name,
      totalUsage: usageCount,
      activeUsage: activeUsage,
      usageByDepartment
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get template version history
router.get("/:id/versions", protect, authorizeRoles(...PAYROLL_STRUCTURE_ROLES), requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_STRUCTURE_ROLES }), async (req, res) => {
  try {
    const template = await SalaryStructureTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Get all versions of this template (same name)
    const versions = await SalaryStructureTemplate.find({ name: template.name })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('department', 'name')
      .sort({ version: -1 });

    res.json(versions);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;