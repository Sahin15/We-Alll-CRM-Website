/**
 * Shared leave → payroll impact codes (Milestone 5).
 * Single source of truth for paid vs unpaid leave classification.
 */

/** Explicit unpaid / LOP leave type codes (lowercase). */
export const UNPAID_LEAVE_IMPACT_CODES = Object.freeze([
  "unpaid",
  "loss_of_pay",
  "lop",
  "lwp",
  "leave_without_pay",
  "extended_sick",
  "personal",
]);

/**
 * @param {string} leaveType
 * @returns {"paid"|"unpaid"}
 */
export function getLeavePayImpact(leaveType) {
  const normalized = String(leaveType || "").trim().toLowerCase();
  if (!normalized) return "paid";
  if (UNPAID_LEAVE_IMPACT_CODES.includes(normalized)) {
    return "unpaid";
  }
  return "paid";
}

/**
 * @param {string} leaveType
 * @returns {boolean}
 */
export function isLeaveTypePaid(leaveType) {
  return getLeavePayImpact(leaveType) === "paid";
}
