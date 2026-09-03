/**
 * Helpers for building SalaryPreview salaryBreakdown in simple payroll mode.
 * Pure where possible — used by generatePreview and unit tests.
 */

/**
 * Sum earnings or deductions object (arrays of { amount } supported).
 * @param {object} bag
 * @returns {number}
 */
export function sumMoneyBag(bag = {}) {
  return Object.values(bag).reduce((sum, val) => {
    if (Array.isArray(val)) {
      return (
        sum + val.reduce((arrSum, item) => arrSum + (Number(item.amount) || 0), 0)
      );
    }
    return sum + (Number(val) || 0);
  }, 0);
}

/**
 * @param {{ earnings: object, deductions: object }} payload
 * @returns {{ earnings: object, deductions: object, grossSalary: number, totalDeductions: number, netSalary: number }}
 */
export function finalizePreviewBreakdown({ earnings, deductions }) {
  const grossSalary = sumMoneyBag(earnings);
  const totalDeductions = sumMoneyBag(deductions);
  return {
    earnings,
    deductions,
    grossSalary,
    totalDeductions,
    netSalary: grossSalary - totalDeductions,
  };
}
