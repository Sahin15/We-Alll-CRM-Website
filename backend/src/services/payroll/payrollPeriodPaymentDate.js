import PayrollPeriod from "../../models/payrollPeriodModel.js";

/**
 * @param {unknown} value
 * @returns {Date|null}
 */
export function parseSalaryPaymentDate(value) {
  if (value == null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("Invalid salary payment date");
    err.code = "INVALID_PAYMENT_DATE";
    throw err;
  }
  return d;
}

/**
 * Ensure a payroll period row exists for month/year (open status if created).
 *
 * @param {number} year
 * @param {number} month
 * @param {import("mongoose").Types.ObjectId|string} [openedBy]
 * @returns {Promise<import("mongoose").Document>}
 */
export async function ensurePayrollPeriod(year, month, openedBy) {
  const y = Number(year);
  const m = Number(month);
  let period = await PayrollPeriod.findByYearMonth(y, m);
  if (!period) {
    period = await PayrollPeriod.create({
      year: y,
      month: m,
      status: "open",
      openedBy: openedBy || undefined,
    });
  }
  return period;
}
