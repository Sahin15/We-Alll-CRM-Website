/**
 * Map simplified payroll (SP-04) onto legacy SalarySlip earnings/deductions shape
 * so existing pre-save net math and PDFs keep working.
 */

import PayrollAdjustment from "../../models/payrollAdjustmentModel.js";
import {
  computeSimpleNet,
  signedAdjustmentAmount,
} from "./simplePayrollCalculator.js";

/**
 * @param {object} structure
 * @returns {boolean}
 */
export function isSimplePayrollStructure(structure) {
  return structure?.payrollMode === "simple";
}

/**
 * Pure mapper (no DB) — used by buildSimpleSlipPayload and unit tests.
 *
 * @param {object} options
 * @param {object} options.structure
 * @param {Array} options.adjustments - approved adjustments
 * @param {number} options.lossOfPay
 * @param {object} [options.extras]
 */
export function mapSimpleStructureToSlipFields({
  structure,
  adjustments = [],
  lossOfPay = 0,
  extras = {},
}) {
  const monthlySalary =
    structure.monthlySalary != null
      ? Number(structure.monthlySalary)
      : Number(structure.basicSalary) || 0;

  const tdsAmount = structure.tdsEnabled
    ? Math.max(0, Number(structure.tds) || 0)
    : 0;

  const automaticDeductions = Math.max(0, Math.round(Number(lossOfPay) || 0));

  const totals = computeSimpleNet({
    monthlySalary,
    automaticDeductions,
    adjustments,
    tdsAmount,
  });

  if (totals.rejected) {
    const err = new Error(
      totals.rejectReason || "Simple payroll net salary cannot be negative"
    );
    err.code = "SIMPLE_PAYROLL_NEGATIVE_NET";
    throw err;
  }

  let bonus = Math.max(0, Number(extras.bonus) || 0);
  let incentives = Math.max(0, Number(extras.incentives) || 0);
  let advances = Math.max(0, Number(extras.advances) || 0);
  const overtime = Math.max(0, Number(extras.overtime) || 0);
  const arrears = Math.max(0, Number(extras.arrears) || 0);
  const reimbursements = Math.max(0, Number(extras.reimbursements) || 0);
  const loans = Math.max(0, Number(extras.loans) || 0);

  /** @type {Array<{ name: string, amount: number, reason?: string }>} */
  const otherDeductions = [];
  /** @type {Array<{ name: string, amount: number }>} */
  const otherAllowances = [];

  for (const adj of adjustments) {
    const signed = signedAdjustmentAmount(adj);
    const mag = Math.abs(Number(adj.amount) || 0);
    if (signed >= 0) {
      if (adj.type === "bonus") bonus += mag;
      else if (adj.type === "incentive") incentives += mag;
      else {
        otherAllowances.push({
          name: adj.type || "adjustment",
          amount: mag,
        });
      }
    } else if (adj.type === "advance_recovery") {
      advances += mag;
    } else {
      otherDeductions.push({
        name: adj.type || "adjustment",
        amount: mag,
        reason: adj.reason || "",
      });
    }
  }

  return {
    earnings: {
      basicSalary: monthlySalary,
      hra: 0,
      specialAllowance: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      otherAllowances,
      bonus,
      overtime,
      arrears,
      reimbursements,
      incentives,
    },
    deductions: {
      providentFund: Number(structure.providentFund) || 0,
      professionalTax: Number(structure.professionalTax) || 0,
      tds: tdsAmount,
      esi: Number(structure.esi) || 0,
      lossOfPay: automaticDeductions,
      unpaidLeaveDeduction: 0,
      advances,
      loans,
      otherDeductions,
    },
    simpleMeta: {
      payrollMode: "simple",
      monthlySalary,
      adjustmentsApplied: adjustments.length,
      netSalary: totals.netSalary,
      automaticDeductions,
      tdsAmount,
    },
  };
}

/**
 * @param {object} options
 * @returns {Promise<{ earnings: object, deductions: object, simpleMeta: object }>}
 */
export async function buildSimpleSlipPayload({
  structure,
  employeeId,
  month,
  year,
  lossOfPay = 0,
  extras = {},
}) {
  const adjustments = await PayrollAdjustment.find({
    employee: employeeId,
    month: parseInt(month, 10),
    year: parseInt(year, 10),
    status: "approved",
  }).lean();

  return mapSimpleStructureToSlipFields({
    structure,
    adjustments,
    lossOfPay,
    extras,
  });
}
