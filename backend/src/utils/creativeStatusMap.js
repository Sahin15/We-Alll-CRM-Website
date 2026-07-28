/**
 * Creative workflow status helpers and slot-mapping rules.
 * @see docs/WORKFLOW/CREATIVE_STATE_MACHINE.md
 */

export const CREATIVE_STATUSES = [
  "Backlog",
  "Assigned",
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
  "Cancelled",
];

export const LEGACY_STATUSES = [
  "To Do",
  "In Progress",
  "Review",
  "Done",
  "Cancelled",
];

/** All statuses allowed on WorkItem.status after creative expansion */
export const ALL_WORK_ITEM_STATUSES = Array.from(
  new Set([...LEGACY_STATUSES, ...CREATIVE_STATUSES])
);

/**
 * Slot complete: legacy Done OR creative Delivered
 * @param {string} status
 * @returns {boolean}
 */
export function mapsToSlotComplete(status) {
  return status === "Done" || status === "Delivered";
}

/**
 * Slot release candidate: Cancelled only
 * @param {string} status
 * @returns {boolean}
 */
export function mapsToSlotRelease(status) {
  return status === "Cancelled";
}

/**
 * @param {object} workItem
 * @returns {boolean}
 */
export function isCreativeWorkflow(workItem) {
  if (!workItem) return false;
  if (workItem.workflowMode === "creative") return true;
  const type = workItem.workflowType || workItem.departmentWorkflowType;
  return type === "design" || type === "design-advanced" || type === "video-production";
}
