/**
 * PH-05: Fail closed when net salary would be negative.
 * Policy: reject generate / persist — do not clamp silently.
 */

export class NegativeNetError extends Error {
  /**
   * @param {number} totalEarnings
   * @param {number} totalDeductions
   * @param {number} netSalary
   */
  constructor(totalEarnings, totalDeductions, netSalary) {
    super(
      `Net salary would be negative (₹${netSalary}). Reduce deductions (LOP, advances, loans, statutory) or fix earnings before generating.`
    );
    this.name = "NegativeNetError";
    this.code = "NEGATIVE_NET_SALARY";
    this.httpStatus = 400;
    this.details = {
      totalEarnings,
      totalDeductions,
      netSalary,
    };
  }
}

/**
 * Sum earnings map the same way SalarySlip pre-save does.
 * @param {object} earnings
 * @returns {number}
 */
export function sumEarningsMap(earnings = {}) {
  let total =
    (Number(earnings.basicSalary) || 0) +
    (Number(earnings.hra) || 0) +
    (Number(earnings.specialAllowance) || 0) +
    (Number(earnings.transportAllowance) || 0) +
    (Number(earnings.medicalAllowance) || 0) +
    (Number(earnings.bonus) || 0) +
    (Number(earnings.overtime) || 0) +
    (Number(earnings.arrears) || 0) +
    (Number(earnings.reimbursements) || 0) +
    (Number(earnings.incentives) || 0);

  if (Array.isArray(earnings.otherAllowances)) {
    total += earnings.otherAllowances.reduce(
      (s, a) => s + (Number(a?.amount) || 0),
      0
    );
  }
  return total;
}

/**
 * @param {object} deductions
 * @returns {number}
 */
export function sumDeductionsMap(deductions = {}) {
  let total =
    (Number(deductions.providentFund) || 0) +
    (Number(deductions.professionalTax) || 0) +
    (Number(deductions.tds) || 0) +
    (Number(deductions.esi) || 0) +
    (Number(deductions.lossOfPay) || 0) +
    (Number(deductions.unpaidLeaveDeduction) || 0) +
    (Number(deductions.advances) || 0) +
    (Number(deductions.loans) || 0);

  if (Array.isArray(deductions.otherDeductions)) {
    total += deductions.otherDeductions.reduce(
      (s, d) => s + (Number(d?.amount) || 0),
      0
    );
  }
  return total;
}

/**
 * @param {object} earnings
 * @param {object} deductions
 * @returns {number} net when non-negative
 * @throws {NegativeNetError}
 */
export function assertNonNegativeNetFromMaps(earnings, deductions) {
  const totalEarnings = sumEarningsMap(earnings);
  const totalDeductions = sumDeductionsMap(deductions);
  const netSalary = totalEarnings - totalDeductions;
  if (netSalary < 0) {
    throw new NegativeNetError(totalEarnings, totalDeductions, netSalary);
  }
  return netSalary;
}

/**
 * Express helper
 * @param {import("express").Response} res
 * @param {unknown} error
 * @returns {boolean}
 */
export function sendNegativeNetError(res, error) {
  if (error instanceof NegativeNetError || error?.code === "NEGATIVE_NET_SALARY") {
    res.status(error.httpStatus || 400).json({
      success: false,
      message: error.message,
      code: "NEGATIVE_NET_SALARY",
      details: error.details || {},
    });
    return true;
  }
  return false;
}
