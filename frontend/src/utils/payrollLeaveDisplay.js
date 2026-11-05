const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** @param {{ leaveType?: string, source?: string }} leave */
export function isPayrollLedgerLeave(leave) {
  if (leave?.leaveType === "payroll_earned_deduction") return true;
  return leave?.source === "payroll";
}

/**
 * @param {{ payrollPeriodMonth?: number, payrollPeriodYear?: number, reason?: string }} leave
 * @returns {string}
 */
export function formatPayrollLeavePeriod(leave) {
  const m = leave?.payrollPeriodMonth;
  const y = leave?.payrollPeriodYear;
  if (m >= 1 && m <= 12 && y) {
    return `${MONTH_NAMES[m - 1]} ${y}`;
  }
  const reason = String(leave?.reason || "");
  const tag = reason.match(/\[Payroll\s+(\d{1,2})\/(\d{4})\]/i);
  if (tag) {
    const monthNum = parseInt(tag[1], 10);
    const yearNum = parseInt(tag[2], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${MONTH_NAMES[monthNum - 1]} ${yearNum}`;
    }
  }
  const paren = reason.match(/\((\d{1,2})\/(\d{4})\)/);
  if (paren) {
    const monthNum = parseInt(paren[1], 10);
    const yearNum = parseInt(paren[2], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${MONTH_NAMES[monthNum - 1]} ${yearNum}`;
    }
  }
  return "Payroll period";
}

export function getPayrollLeaveTypeLabel() {
  return "Earned leave (payroll)";
}
