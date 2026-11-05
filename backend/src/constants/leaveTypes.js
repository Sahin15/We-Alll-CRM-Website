export const ANNUAL_EARNED_LEAVE_LIMIT = 24;
export const MONTHLY_EARNED_LEAVE_RATE = 2;

/** Types employees can apply for today */
export const ACTIVE_PAID_LEAVE_TYPES = ["medical", "casual", "half_day"];
export const ACTIVE_LEAVE_TYPES = [...ACTIVE_PAID_LEAVE_TYPES, "unpaid"];

/** Stored on older leave records — still readable, mapped to balance categories */
export const LEGACY_LEAVE_TYPES = ["personal", "vacation"];

export const ALL_STORED_LEAVE_TYPES = [
  ...ACTIVE_LEAVE_TYPES,
  ...LEGACY_LEAVE_TYPES,
  "work_from_home",
  /** HR payroll earned-balance ledger — not a calendar leave */
  "payroll_earned_deduction",
];

export function normalizeLeaveTypeForCreate(leaveType) {
  const type = String(leaveType || "").trim().toLowerCase();
  if (type === "personal" || type === "vacation") {
    return "casual";
  }
  return type;
}

export function getLeaveBalanceCategory(leaveType) {
  const type = String(leaveType || "").trim().toLowerCase();
  if (type === "medical") return "medical";
  if (type === "casual") return "casual";
  if (type === "personal" || type === "vacation" || type === "half_day") {
    return "casual";
  }
  return null;
}

export function isPaidLeaveType(leaveType) {
  const type = normalizeLeaveTypeForCreate(leaveType);
  return ACTIVE_PAID_LEAVE_TYPES.includes(type);
}

/**
 * Payroll "cover absence from earned leave" records must reduce earned.used
 * even when the covered calendar day is before intern → full-time conversion.
 * @param {{ source?: string, reason?: string }} leave
 * @returns {boolean}
 */
export function isPayrollEarnedLeaveDeduction(leave) {
  if (leave?.source === "payroll") return true;
  const reason = String(leave?.reason || "");
  return (
    /\[Payroll\s+\d+\/\d+\]/i.test(reason) ||
    /Earned leave (balance )?deducted/i.test(reason)
  );
}

/**
 * @param {string} leaveType
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {number} [explicitDays] - required for payroll_earned_deduction
 */
export function getLeaveDayCount(leaveType, startDate, endDate, explicitDays) {
  if (leaveType === "payroll_earned_deduction") {
    return Math.max(0, Number(explicitDays) || 0);
  }
  if (leaveType === "half_day") {
    return 0.5;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

/** @param {{ leaveType?: string, source?: string }} leave */
export function isPayrollLedgerLeave(leave) {
  if (leave?.leaveType === "payroll_earned_deduction") return true;
  return leave?.source === "payroll";
}
