import PayrollAdjustment from "../models/payrollAdjustmentModel.js";
import User from "../models/userModel.js";
import {
  ADJUSTMENT_TYPES,
  lateDeductionFromChoice,
} from "../services/payroll/simplePayrollCalculator.js";
import SalaryStructure from "../models/salaryStructureModel.js";

/**
 * GET /api/payroll/adjustments?employee=&month=&year=&status=
 */
export const listAdjustments = async (req, res) => {
  try {
    const { employee, month, year, status } = req.query;
    const filter = {};
    if (employee) filter.employee = employee;
    if (month) filter.month = parseInt(month, 10);
    if (year) filter.year = parseInt(year, 10);
    if (status) filter.status = status;

    const items = await PayrollAdjustment.find(filter)
      .populate("employee", "name email employeeId")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("listAdjustments:", error);
    res.status(500).json({ success: false, error: "Failed to list adjustments" });
  }
};

/**
 * POST /api/payroll/adjustments
 */
export const createAdjustment = async (req, res) => {
  try {
    const {
      employee,
      month,
      year,
      type,
      amount,
      direction,
      reason,
      remarks,
    } = req.body;

    if (!employee || !month || !year || !type || amount == null || !reason) {
      return res.status(400).json({
        success: false,
        error: "employee, month, year, type, amount, and reason are required",
      });
    }

    if (!ADJUSTMENT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Allowed: ${ADJUSTMENT_TYPES.join(", ")}`,
      });
    }

    const emp = await User.findById(employee).select("_id");
    if (!emp) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    const doc = await PayrollAdjustment.create({
      employee,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      type,
      amount: Math.abs(Number(amount) || 0),
      direction: direction || null,
      reason: String(reason).trim(),
      remarks: remarks || "",
      status: "draft",
      createdBy: req.user.id,
      auditTrail: [
        {
          action: "created",
          performedBy: req.user.id,
          reason: String(reason).trim(),
          newValue: { type, amount: Math.abs(Number(amount) || 0) },
        },
      ],
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    console.error("createAdjustment:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create adjustment",
    });
  }
};

/**
 * POST /api/payroll/adjustments/late-recommendation
 * Body: { employee, month, year, choice, customAmount?, reason?, monthlySalary? }
 */
export const createLateDeductionFromChoice = async (req, res) => {
  try {
    const {
      employee,
      month,
      year,
      choice,
      customAmount,
      reason,
      monthlySalary: monthlyOverride,
    } = req.body;

    if (!employee || !month || !year || !choice) {
      return res.status(400).json({
        success: false,
        error: "employee, month, year, and choice are required",
      });
    }

    if (choice === "custom" && !["admin", "superadmin", "hr", "manager", "accounts"].includes(req.user.role)) {
      // Soft gate — full permission key can replace later
    }

    let monthly = Number(monthlyOverride);
    if (!(monthly >= 0) || Number.isNaN(monthly)) {
      const structure = await SalaryStructure.findOne({
        employee,
        status: "active",
      }).lean();
      monthly =
        structure?.payrollMode === "simple" && structure?.monthlySalary != null
          ? Number(structure.monthlySalary)
          : Number(structure?.basicSalary) || 0;
    }

    const built = lateDeductionFromChoice(choice, monthly, customAmount);
    if (!built.applied) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No deduction applied",
      });
    }

    const doc = await PayrollAdjustment.create({
      employee,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      type: "late_deduction",
      amount: built.amount,
      direction: "debit",
      reason:
        reason ||
        `Late attendance policy: ${choice} (monthly ${monthly})`,
      status: "draft",
      createdBy: req.user.id,
      auditTrail: [
        {
          action: "created_from_late_policy",
          performedBy: req.user.id,
          reason: choice,
          newValue: { choice, amount: built.amount, monthlySalary: monthly },
        },
      ],
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    console.error("createLateDeductionFromChoice:", error);
    res.status(500).json({ success: false, error: "Failed to create late deduction" });
  }
};

/**
 * POST /api/payroll/adjustments/:id/approve
 */
export const approveAdjustment = async (req, res) => {
  try {
    const doc = await PayrollAdjustment.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Adjustment not found" });
    }
    if (doc.status === "void") {
      return res.status(400).json({ success: false, error: "Cannot approve a void adjustment" });
    }

    const prev = doc.status;
    doc.status = "approved";
    doc.approvedBy = req.user.id;
    doc.approvedAt = new Date();
    doc.auditTrail.push({
      action: "approved",
      performedBy: req.user.id,
      reason: req.body?.reason || "",
      previousValue: { status: prev },
      newValue: { status: "approved" },
    });
    await doc.save();

    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error("approveAdjustment:", error);
    res.status(500).json({ success: false, error: "Failed to approve adjustment" });
  }
};

/**
 * POST /api/payroll/adjustments/:id/void
 */
export const voidAdjustment = async (req, res) => {
  try {
    const doc = await PayrollAdjustment.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Adjustment not found" });
    }
    const reason = String(req.body?.reason || "").trim();
    if (!reason) {
      return res.status(400).json({ success: false, error: "reason is required to void" });
    }

    const prev = { status: doc.status, amount: doc.amount };
    doc.status = "void";
    doc.auditTrail.push({
      action: "voided",
      performedBy: req.user.id,
      reason,
      previousValue: prev,
      newValue: { status: "void" },
    });
    await doc.save();

    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error("voidAdjustment:", error);
    res.status(500).json({ success: false, error: "Failed to void adjustment" });
  }
};
