/**
 * Creative workflow transition rules — single source of truth for guards.
 * @see docs/WORKFLOW/CREATIVE_STATE_MACHINE.md
 */

export const START_WORK_STATUSES = ["To Do", "Assigned", "Backlog"];

export const SUBMIT_REVIEW_STATUSES = ["In Progress", "Rework In Progress"];

export const REVIEW_STATUSES = ["Submitted for Review"];

export const QA_STATUSES = ["QA Review"];

export const REWORK_STATUSES = ["Changes Requested"];

export const DELIVER_STATUSES = ["Approved"];

export const POSTING_SUBMIT_STATUSES = ["Delivered", "Awaiting Posting"];

/**
 * @param {string} status
 * @param {string[]} allowed
 * @param {string} actionLabel
 */
export function assertStatusIn(status, allowed, actionLabel) {
  if (!allowed.includes(status)) {
    const err = new Error(
      `${actionLabel} is not allowed when status is "${status}". Expected: ${allowed.join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Statuses that cannot be set via generic PATCH for creative work items.
 * Cancelled is allowed separately with reason validation.
 */
export const CREATIVE_PATCH_BLOCKED_STATUSES = [
  "To Do",
  "Assigned",
  "Backlog",
  "In Progress",
  "Submitted for Review",
  "Changes Requested",
  "Rework In Progress",
  "QA Review",
  "Approved",
  "Delivered",
  "Awaiting Posting",
  "Posted",
  "Closed",
  "Done",
  "Review",
];

/**
 * Block backward transition from terminal delivery states when slotted.
 * @param {object} workItem
 * @param {string} newStatus
 */
export function assertNoBackwardFromDelivered(workItem, newStatus) {
  const from = workItem.status;
  const deliveredLike = ["Delivered", "Done", "Awaiting Posting", "Posted", "Closed"];
  if (!deliveredLike.includes(from)) return;
  if (from === newStatus) return;

  const hasSlot = Boolean(workItem.slotAssignment?.slotId);
  if (hasSlot) {
    const err = new Error(
      "Cannot change status after delivery for slotted creative work items. Use Creative Workflow actions."
    );
    err.statusCode = 400;
    throw err;
  }
}
