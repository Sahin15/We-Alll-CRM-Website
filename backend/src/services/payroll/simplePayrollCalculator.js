/**
 * Simplified SMB payroll calculator (design: docs/PAYROLL_SIMPLIFIED_MODEL.md).
 * Pure functions — no DB I/O.
 *
 * Net = Monthly Salary − automatic deductions ± manual adjustments − TDS
 */

export const DEFAULT_DAY_DIVISOR = 30;

export const ADJUSTMENT_TYPES = Object.freeze([
  "bonus",
  "incentive",
  "advance_recovery",
  "penalty",
  "late_deduction",
  "absent_deduction",
  "manual_salary_deduction",
  "manual_salary_addition",
  "other",
]);

/** Types that reduce pay when amount is stored as positive magnitude. */
const DEDUCTION_TYPES = new Set([
  "advance_recovery",
  "penalty",
  "late_deduction",
  "absent_deduction",
  "manual_salary_deduction",
]);

/**
 * @param {number} monthlySalary
 * @param {number} [divisor=30]
 * @returns {number} rupees (rounded)
 */
export function perDaySalary(monthlySalary, divisor = DEFAULT_DAY_DIVISOR) {
  const monthly = Number(monthlySalary) || 0;
  const days = Number(divisor) > 0 ? Number(divisor) : DEFAULT_DAY_DIVISOR;
  return Math.round(monthly / days);
}

/**
 * @param {number} monthlySalary
 * @param {number} days
 * @param {number} [divisor=30]
 * @returns {number}
 */
export function amountForDays(monthlySalary, days, divisor = DEFAULT_DAY_DIVISOR) {
  const d = Number(days) || 0;
  return perDaySalary(monthlySalary, divisor) * d;
}

/**
 * Signed contribution of one adjustment to the running total.
 * @param {{ type: string, amount: number, direction?: 'credit'|'debit' }} adj
 * @returns {number}
 */
export function signedAdjustmentAmount(adj) {
  const raw = Math.abs(Number(adj?.amount) || 0);
  if (adj?.direction === "credit") return raw;
  if (adj?.direction === "debit") return -raw;
  if (DEDUCTION_TYPES.has(String(adj?.type || ""))) return -raw;
  return raw;
}

/**
 * @param {Array<{ type: string, amount: number, direction?: string, status?: string }>} adjustments
 * @param {{ approvedOnly?: boolean }} [options]
 * @returns {number}
 */
export function sumAdjustments(adjustments, options = {}) {
  const list = Array.isArray(adjustments) ? adjustments : [];
  const approvedOnly = options.approvedOnly !== false;
  return list.reduce((sum, adj) => {
    if (approvedOnly && adj.status && adj.status !== "approved") return sum;
    return sum + signedAdjustmentAmount(adj);
  }, 0);
}

/**
 * @param {object} input
 * @returns {object}
 */
export function computeSimpleNet(input = {}) {
  const monthlySalary = Math.max(0, Number(input.monthlySalary) || 0);
  const dayDivisor =
    Number(input.dayDivisor) > 0 ? Number(input.dayDivisor) : DEFAULT_DAY_DIVISOR;
  const automaticDeductions = Math.max(0, Number(input.automaticDeductions) || 0);
  const tdsAmount = Math.max(0, Number(input.tdsAmount) || 0);
  const adjustmentsTotal = sumAdjustments(input.adjustments || [], {
    approvedOnly: input.approvedOnly !== false,
  });

  const subtotalBeforeTds = monthlySalary - automaticDeductions + adjustmentsTotal;
  const netSalary = subtotalBeforeTds - tdsAmount;

  if (netSalary < 0 && !input.allowNegativeNet) {
    return {
      monthlySalary,
      perDaySalary: perDaySalary(monthlySalary, dayDivisor),
      automaticDeductions,
      adjustmentsTotal,
      subtotalBeforeTds,
      tdsAmount,
      netSalary,
      rejected: true,
      rejectReason: "Net salary cannot be negative",
    };
  }

  return {
    monthlySalary,
    perDaySalary: perDaySalary(monthlySalary, dayDivisor),
    automaticDeductions,
    adjustmentsTotal,
    subtotalBeforeTds,
    tdsAmount,
    netSalary: Math.round(netSalary),
    rejected: false,
    rejectReason: null,
  };
}

/**
 * @param {'none'|'one_day'|'two_days'|'custom'} choice
 * @param {number} monthlySalary
 * @param {number} [customAmount]
 * @param {number} [divisor]
 */
export function lateDeductionFromChoice(
  choice,
  monthlySalary,
  customAmount = 0,
  divisor = DEFAULT_DAY_DIVISOR
) {
  switch (choice) {
    case "none":
      return { amount: 0, applied: false };
    case "one_day":
      return { amount: amountForDays(monthlySalary, 1, divisor), applied: true };
    case "two_days":
      return { amount: amountForDays(monthlySalary, 2, divisor), applied: true };
    case "custom":
      return {
        amount: Math.max(0, Math.round(Number(customAmount) || 0)),
        applied: true,
      };
    default:
      return { amount: 0, applied: false };
  }
}
