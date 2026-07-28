/**
 * Simple-mode payroll preview DTO builder + loader (SP-03).
 * Spec: docs/PAYROLL_SIMPLIFIED_MODEL.md — expandable sections for HR.
 */

import SalaryStructure from "../../models/salaryStructureModel.js";
import PayrollAdjustment from "../../models/payrollAdjustmentModel.js";
import LeaveImpactCalculator from "../leaveImpactCalculator.js";
import {
  computeSimpleNet,
  perDaySalary,
  amountForDays,
  signedAdjustmentAmount,
  DEFAULT_DAY_DIVISOR,
} from "./simplePayrollCalculator.js";

/**
 * Build read-only preview sections from plain inputs (unit-testable).
 *
 * @param {object} params
 * @param {object} params.structure - salary structure lean/doc
 * @param {Array} params.adjustments - payroll adjustments
 * @param {number} [params.automaticDeductions]
 * @param {Array<{ label: string, amount: number, detail?: string }>} [params.automaticLines]
 * @param {number} [params.tdsAmount]
 */
export function buildSimplePreviewDto({
  structure,
  adjustments = [],
  automaticDeductions = 0,
  automaticLines = [],
  tdsAmount,
}) {
  const mode = structure?.payrollMode || "legacy";
  if (mode !== "simple") {
    return {
      applicable: false,
      reason: "Employee structure is not in simple payroll mode",
      payrollMode: mode,
    };
  }

  const monthlySalary =
    structure.monthlySalary != null
      ? Number(structure.monthlySalary)
      : Number(structure.basicSalary) || 0;

  const dayRate = perDaySalary(monthlySalary);
  const autoTotal = Math.max(0, Number(automaticDeductions) || 0);

  const tds =
    tdsAmount != null
      ? Math.max(0, Number(tdsAmount) || 0)
      : structure.tdsEnabled
        ? Math.max(0, Number(structure.tds) || 0)
        : 0;

  const approvedAdjustments = (adjustments || []).filter(
    (a) => !a.status || a.status === "approved"
  );
  const pendingAdjustments = (adjustments || []).filter(
    (a) => a.status === "draft"
  );

  const totals = computeSimpleNet({
    monthlySalary,
    automaticDeductions: autoTotal,
    adjustments: approvedAdjustments,
    tdsAmount: tds,
  });

  const adjustmentLines = (adjustments || []).map((a) => ({
    id: a._id?.toString?.() || a.id || null,
    type: a.type,
    amount: Math.abs(Number(a.amount) || 0),
    signedAmount: signedAdjustmentAmount(a),
    status: a.status || "draft",
    reason: a.reason || "",
    remarks: a.remarks || "",
    includedInNet: a.status === "approved",
  }));

  return {
    applicable: true,
    payrollMode: "simple",
    employee: structure.employee?._id || structure.employee || null,
    month: null,
    year: null,
    dayDivisor: DEFAULT_DAY_DIVISOR,
    perDaySalary: dayRate,
    sections: {
      monthlySalary: {
        label: "Monthly Salary",
        amount: monthlySalary,
        detail:
          structure.effectiveFrom
            ? `Effective from ${new Date(structure.effectiveFrom).toISOString().slice(0, 10)}`
            : null,
      },
      automaticDeductions: {
        label: "Automatic Deductions",
        amount: autoTotal,
        lines:
          automaticLines.length > 0
            ? automaticLines
            : autoTotal > 0
              ? [{ label: "Attendance / LOP", amount: autoTotal }]
              : [],
      },
      manualAdjustments: {
        label: "Manual Adjustments",
        amount: totals.adjustmentsTotal,
        lines: adjustmentLines,
        pendingCount: pendingAdjustments.length,
        note:
          pendingAdjustments.length > 0
            ? "Draft adjustments are shown but not included in Net until approved"
            : null,
      },
      tds: {
        label: "TDS",
        enabled: Boolean(structure.tdsEnabled),
        amount: tds,
      },
      netSalary: {
        label: "Final Net Salary",
        amount: totals.rejected ? null : totals.netSalary,
        rejected: totals.rejected,
        rejectReason: totals.rejectReason,
      },
    },
    totals: {
      monthlySalary: totals.monthlySalary,
      automaticDeductions: totals.automaticDeductions,
      adjustmentsTotal: totals.adjustmentsTotal,
      subtotalBeforeTds: totals.subtotalBeforeTds,
      tdsAmount: totals.tdsAmount,
      netSalary: totals.rejected ? null : totals.netSalary,
      rejected: totals.rejected,
      rejectReason: totals.rejectReason,
    },
  };
}

/**
 * Load structure + adjustments (+ optional leave impact) and build preview.
 *
 * SMB default: automatic deductions are NOT applied to Net. Attendance/leave
 * is returned as `attendanceReport` so HR can create manual adjustments.
 *
 * @param {object} options
 * @param {string} options.employeeId
 * @param {number} options.month
 * @param {number} options.year
 * @param {number} [options.automaticDeductions] - override auto total (applied only if set)
 * @param {boolean} [options.applyAutomaticDeductions=false] - when true, apply leave LOP to Net
 * @param {boolean} [options.includeLeaveImpact=true] - load attendance/leave for the report
 */
export async function getSimplePayrollPreview({
  employeeId,
  month,
  year,
  automaticDeductions: autoOverride,
  applyAutomaticDeductions = false,
  includeLeaveImpact = true,
}) {
  const structure = await SalaryStructure.findOne({
    employee: employeeId,
    status: "active",
  }).lean();

  if (!structure) {
    return {
      applicable: false,
      reason: "No active salary structure found",
    };
  }

  const adjustments = await PayrollAdjustment.find({
    employee: employeeId,
    month: parseInt(month, 10),
    year: parseInt(year, 10),
    status: { $in: ["draft", "approved"] },
  })
    .sort({ createdAt: 1 })
    .lean();

  const monthly =
    structure.payrollMode === "simple" && structure.monthlySalary != null
      ? Number(structure.monthlySalary)
      : Number(structure.grossSalary || structure.basicSalary) || 0;
  const dayRate = perDaySalary(monthly);

  /** @type {object|null} */
  let attendanceReport = null;
  let suggestedLopAmount = 0;
  let suggestedLopDays = 0;

  if (includeLeaveImpact) {
    try {
      const calc = new LeaveImpactCalculator();
      const impact = await calc.calculateLeaveDeduction(employeeId, month, year, {
        ...structure,
        grossSalary: monthly,
      });
      suggestedLopAmount = Math.round(Number(impact?.deductionAmount) || 0);
      suggestedLopDays = Number(impact?.unpaidLeaves) || 0;
      attendanceReport = {
        unpaidLeaveDays: suggestedLopDays,
        paidLeaveDays: Number(impact?.paidLeaves) || 0,
        suggestedDeduction: suggestedLopAmount,
        perDaySalary: dayRate,
        detail:
          suggestedLopDays > 0
            ? `${suggestedLopDays} unpaid day(s) × ${dayRate} (suggestion only — not applied)`
            : "No unpaid leave suggested for this period",
        note: "Deductions are manual. Review attendance and add an adjustment if needed.",
      };
    } catch (err) {
      console.warn(
        "[simplePayrollPreview] leave impact failed:",
        err.message
      );
      attendanceReport = {
        unpaidLeaveDays: 0,
        paidLeaveDays: 0,
        suggestedDeduction: 0,
        perDaySalary: dayRate,
        detail: "Attendance/leave data unavailable",
        note: "Deductions are manual. Add an adjustment if HR decides to deduct.",
        error: err.message,
      };
    }
  }

  let automaticDeductions = 0;
  /** @type {Array<{ label: string, amount: number, detail?: string }>} */
  let automaticLines = [];

  if (autoOverride != null && autoOverride !== "") {
    automaticDeductions = Math.max(0, Number(autoOverride) || 0);
    if (automaticDeductions > 0) {
      automaticLines.push({
        label: "Manual override",
        amount: automaticDeductions,
        detail: "automaticDeductions query override",
      });
    }
  } else if (applyAutomaticDeductions && suggestedLopAmount > 0) {
    automaticDeductions = suggestedLopAmount;
    automaticLines.push({
      label: "Loss of pay / unpaid leave",
      amount: suggestedLopAmount,
      detail: `${suggestedLopDays} day(s) × ₹${dayRate}`,
    });
  }

  const dto = buildSimplePreviewDto({
    structure,
    adjustments,
    automaticDeductions,
    automaticLines,
  });

  if (dto.applicable) {
    dto.month = parseInt(month, 10);
    dto.year = parseInt(year, 10);
    dto.employee = employeeId;
    dto.attendanceReport = attendanceReport;
    dto.applyAutomaticDeductions = Boolean(
      applyAutomaticDeductions ||
        (autoOverride != null && autoOverride !== "" && Number(autoOverride) > 0)
    );
  }

  return dto;
}

export { amountForDays };
