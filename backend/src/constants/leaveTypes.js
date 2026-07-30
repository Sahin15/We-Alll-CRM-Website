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

export function getLeaveDayCount(leaveType, startDate, endDate) {
  if (leaveType === "half_day") {
    return 0.5;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}
