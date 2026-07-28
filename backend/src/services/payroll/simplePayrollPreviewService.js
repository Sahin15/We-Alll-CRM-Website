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
 * @param {object} options
 * @param {string} options.employeeId
 * @param {number} options.month
 * @param {number} options.year
 * @param {number} [options.automaticDeductions] - override auto total
 * @param {boolean} [options.includeLeaveImpact=true]
 */
export async function getSimplePayrollPreview({
  employeeId,
  month,
  year,
  automaticDeductions: autoOverride,
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
  } else if (includeLeaveImpact) {
    try {
      const calc = new LeaveImpactCalculator();
      const monthly =
        structure.payrollMode === "simple" && structure.monthlySalary != null
          ? Number(structure.monthlySalary)
          : Number(structure.grossSalary || structure.basicSalary) || 0;
      const impact = await calc.calculateLeaveDeduction(employeeId, month, year, {
        ...structure,
        grossSalary: monthly,
      });
      const lopAmount = Math.round(Number(impact?.deductionAmount) || 0);
      const lopDays = Number(impact?.unpaidLeaves) || 0;
      automaticDeductions = lopAmount;
      if (lopAmount > 0) {
        automaticLines.push({
          label: "Loss of pay / unpaid leave",
          amount: lopAmount,
          detail: `${lopDays} day(s) × ₹${perDaySalary(monthly)}`,
        });
      }
    } catch (err) {
      console.warn(
        "[simplePayrollPreview] leave impact failed, using 0:",
        err.message
      );
    }
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
  }

  return dto;
}

export { amountForDays };
