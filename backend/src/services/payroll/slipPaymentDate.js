import { parseSalaryPaymentDate } from "./payrollPeriodPaymentDate.js";

/**
 * @param {number|string} month
 * @param {number|string} year
 */
export function parsePayPeriodMonthYear(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!m || !y || m < 1 || m > 12) {
    const err = new Error("Valid month (1-12) and year are required");
    err.code = "INVALID_PAY_PERIOD";
    throw err;
  }
  return { month: m, year: y };
}

/**
 * Resolve payslip payment date (never uses the off-by-one `new Date(year, month, 1)` bug).
 *
 * @param {object} options
 * @param {string|Date} [options.paymentDate] - explicit from request
 * @param {number} options.year - pay period year
 * @param {number} options.month - pay period month 1-12
 * @param {Date|string|null} [options.periodSalaryPaymentDate] - from PayrollPeriod
 * @returns {Date}
 */
export function resolveSlipPaymentDate({
  paymentDate,
  year,
  month,
  periodSalaryPaymentDate,
}) {
  const { month: m, year: y } = parsePayPeriodMonthYear(month, year);

  if (paymentDate != null && paymentDate !== "") {
    const parsed = parseSalaryPaymentDate(paymentDate);
    if (parsed) return parsed;
  }

  if (periodSalaryPaymentDate) {
    const fromPeriod = new Date(periodSalaryPaymentDate);
    if (!Number.isNaN(fromPeriod.getTime())) {
      return fromPeriod;
    }
  }

  if (process.env.REQUIRE_PERIOD_PAYMENT_DATE === "true") {
    const err = new Error(
      "Salary payment date is required. Set it on the Payroll tab for this pay period."
    );
    err.code = "PAYMENT_DATE_REQUIRED";
    throw err;
  }

  return new Date(y, m - 1, 1);
}

/**
 * Date-only display for slips (UTC calendar parts — avoids IST shift on stored UTC midnights).
 *
 * @param {string|Date} value
 * @param {string} [locale]
 * @returns {string}
 */
export function formatSlipPaymentDateDisplay(value, locale = "en-IN") {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(d);
}
