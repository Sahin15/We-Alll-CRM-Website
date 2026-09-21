import PayrollAdjustment from "../models/payrollAdjustmentModel.js";
import User from "../models/userModel.js";
import {
  ADJUSTMENT_TYPES,
  lateDeductionFromChoice,
} from "../services/payroll/simplePayrollCalculator.js";
import SalaryStructure from "../models/salaryStructureModel.js";
import {
  applyLeaveBalanceDeduction,
  getPayrollAbsentContext,
  resolveDatesForLeaveDeduction,
  reverseLeaveBalanceDeduction,
} from "../services/payroll/payrollLeaveBalanceService.js";
import { getISTDateKey } from "../utils/timezone.js";

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

    const periodMonth = parseInt(month, 10);
    const periodYear = parseInt(year, 10);

    if (type === "absent_deduction") {
      const leaveCover = await PayrollAdjustment.findOne({
        employee,
        month: periodMonth,
        year: periodYear,
        type: "leave_balance_deduction",
        status: { $in: ["draft", "approved"] },
      }).lean();
      if (leaveCover) {
        return res.status(400).json({
          success: false,
          error:
            "Earned leave deduction already covers this month. Void it before creating a salary absence deduction.",
        });
      }
    }

    const doc = await PayrollAdjustment.create({
      employee,
      month: periodMonth,
      year: periodYear,
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
 * POST /api/payroll/adjustments/deduct-leave-balance
 * Cover absent days from earned leave instead of salary deduction.
 */
export const createLeaveBalanceDeduction = async (req, res) => {
  try {
    const { employee, month, year, days, reason, remarks } = req.body;

    if (!employee || !month || !year) {
      return res.status(400).json({
        success: false,
        error: "employee, month, and year are required",
      });
    }

    const emp = await User.findById(employee).select("_id employmentType");
    if (!emp) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    const periodMonth = parseInt(month, 10);
    const periodYear = parseInt(year, 10);

    const existing = await PayrollAdjustment.findOne({
      employee,
      month: periodMonth,
      year: periodYear,
      type: "leave_balance_deduction",
      status: { $in: ["draft", "approved"] },
    }).lean();

    if (existing) {
      return res.status(400).json({
        success: false,
        error:
          "A leave balance deduction already exists for this employee and month. Void it first to create a new one.",
      });
    }

    const salaryCover = await PayrollAdjustment.findOne({
      employee,
      month: periodMonth,
      year: periodYear,
      type: "absent_deduction",
      status: { $in: ["draft", "approved"] },
    }).lean();

    if (salaryCover) {
      return res.status(400).json({
        success: false,
        error:
          "A salary absence deduction already exists for this month. Void it before deducting from earned leave.",
      });
    }

    const context = await getPayrollAbsentContext(employee, periodMonth, periodYear);

    const requestedDays =
      days != null && days !== ""
        ? Number(days)
        : Math.min(context.coverableDays || 1, context.maxLeaveDeductible || 0);

    if (!(requestedDays > 0) || Number.isNaN(requestedDays)) {
      return res.status(400).json({
        success: false,
        error: "Enter a valid number of leave days to deduct",
      });
    }

    if (!context.balance.eligibleForPaidLeave) {
      return res.status(400).json({
        success: false,
        error: "Employee is not eligible for earned leave balance",
      });
    }

    if (requestedDays > context.maxLeaveDeductible) {
      return res.status(400).json({
        success: false,
        error: `Cannot deduct ${requestedDays} day(s). Earned leave remaining: ${context.maxLeaveDeductible}.`,
      });
    }

    const resolvedDates = resolveDatesForLeaveDeduction(
      periodMonth,
      periodYear,
      requestedDays,
      context.absentDates
    ).map((d) => getISTDateKey(d));

    if (resolvedDates.length < requestedDays) {
      return res.status(400).json({
        success: false,
        error: `Could not assign ${requestedDays} day(s) in this month. Try fewer days.`,
      });
    }

    const defaultReason = `Earned leave balance deducted for ${requestedDays} day(s) instead of salary (${periodMonth}/${periodYear})`;
    const finalReason = String(reason || defaultReason).trim();

    const result = await applyLeaveBalanceDeduction({
      employeeId: employee,
      month: periodMonth,
      year: periodYear,
      days: requestedDays,
      absentDates: resolvedDates,
      approvedBy: req.user.id,
      reason: finalReason,
    });

    try {
      const doc = await PayrollAdjustment.create({
      employee,
      month: periodMonth,
      year: periodYear,
      type: "leave_balance_deduction",
      amount: 0,
      leaveDays: result.daysDeducted,
      direction: null,
      reason: finalReason,
      remarks: remarks || "",
      status: "approved",
      createdBy: req.user.id,
      approvedBy: req.user.id,
      approvedAt: new Date(),
      payrollMeta: {
        absentDates: resolvedDates,
        perDaySalary: context.perDaySalary,
        salarySaved: context.perDaySalary * result.daysDeducted,
        createdLeaveIds: result.createdLeaveIds,
        daysDeducted: result.daysDeducted,
        attendanceSnapshots: result.attendanceSnapshots,
      },
      auditTrail: [
        {
          action: "created_leave_balance_deduction",
          performedBy: req.user.id,
          reason: finalReason,
          newValue: {
            leaveDays: result.daysDeducted,
            absentDates: resolvedDates,
            createdLeaveIds: result.createdLeaveIds,
          },
        },
      ],
    });

      res.status(201).json({ success: true, data: doc });
    } catch (persistError) {
      await reverseLeaveBalanceDeduction({
        createdLeaveIds: result.createdLeaveIds,
        attendanceSnapshots: result.attendanceSnapshots,
      });
      throw persistError;
    }
  } catch (error) {
    console.error("createLeaveBalanceDeduction:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create leave balance deduction",
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

    if (doc.type === "leave_balance_deduction") {
      if (doc.status === "approved") {
        return res.status(400).json({ success: false, error: "Adjustment is already approved" });
      }

      if (!doc.payrollMeta?.createdLeaveIds?.length) {
        const result = await applyLeaveBalanceDeduction({
          employeeId: doc.employee,
          month: doc.month,
          year: doc.year,
          days: doc.leaveDays,
          absentDates: doc.payrollMeta?.absentDates || [],
          approvedBy: req.user.id,
          reason: doc.reason,
        });

        doc.payrollMeta = {
          ...(doc.payrollMeta || {}),
          createdLeaveIds: result.createdLeaveIds,
          daysDeducted: result.daysDeducted,
          attendanceSnapshots: result.attendanceSnapshots,
        };
        doc.leaveDays = result.daysDeducted;
      }
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

    if (
      doc.type === "leave_balance_deduction" &&
      doc.payrollMeta?.createdLeaveIds?.length
    ) {
      await reverseLeaveBalanceDeduction({
        createdLeaveIds: doc.payrollMeta.createdLeaveIds,
        attendanceSnapshots: doc.payrollMeta.attendanceSnapshots || [],
      });
    }

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
