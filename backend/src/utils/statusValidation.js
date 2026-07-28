/**
 * Status Management Utility
 * Handles validation and business logic for work item status transitions
 */

import { ALL_WORK_ITEM_STATUSES, mapsToSlotComplete } from "./creativeStatusMap.js";

// Valid status values — legacy 4-stage + creative workflow + Cancelled
export const VALID_STATUSES = ALL_WORK_ITEM_STATUSES;

// Status colors for UI
export const STATUS_COLORS = {
  "To Do": "#6B7280",
  "In Progress": "#3B82F6",
  "Review": "#F59E0B",
  "Done": "#10B981",
  "Cancelled": "#EF4444",
  Backlog: "#9CA3AF",
  Assigned: "#60A5FA",
  "Submitted for Review": "#F59E0B",
  "Changes Requested": "#F97316",
  "Rework In Progress": "#3B82F6",
  "QA Review": "#A855F7",
  Approved: "#22C55E",
  Delivered: "#10B981",
  "Awaiting Posting": "#EAB308",
  Posted: "#14B8A6",
  Closed: "#6B7280",
};

// Status order for sorting
export const STATUS_ORDER = {
  Backlog: 0,
  "To Do": 1,
  Assigned: 1,
  "In Progress": 2,
  "Rework In Progress": 2,
  Review: 3,
  "Submitted for Review": 3,
  "Changes Requested": 3,
  "QA Review": 4,
  Approved: 5,
  Delivered: 6,
  "Awaiting Posting": 7,
  Posted: 8,
  Done: 9,
  Closed: 10,
  Cancelled: 11,
};

/**
 * Validate if a status value is valid
 */
export const isValidStatus = (status) => {
  return VALID_STATUSES.includes(status);
};

/**
 * Validate status transition.
 * Rules:
 *  - Cannot transition FROM "Cancelled" to anything (cancelled is terminal)
 *  - Cannot transition FROM "Done" to "Cancelled" (use soft-delete instead)
 *  - All other transitions are allowed (flexible workflow)
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
  if (!isValidStatus(newStatus)) {
    return {
      valid: false,
      message: `Invalid status: "${newStatus}". Must be one of: ${VALID_STATUSES.join(", ")}`,
    };
  }

  // Cancelled is a terminal state — cannot transition out of it
  if (currentStatus === "Cancelled" && newStatus !== "Cancelled") {
    return {
      valid: false,
      message: "A cancelled work item cannot be reactivated. Please create a new work item instead.",
    };
  }

  // Allow idempotent requests (same status → same status is fine)
  return {
    valid: true,
    message: "Status transition is valid",
  };
};

/**
 * Get next suggested status based on current status
 */
export const getNextStatus = (currentStatus) => {
  const statusFlow = {
    "To Do":       "In Progress",
    "In Progress": "Review",
    "Review":      "Done",
    "Done":        "Done",
    "Cancelled":   "Cancelled",
  };
  return statusFlow[currentStatus] || "In Progress";
};

/**
 * Check if work item is complete
 */
export const isComplete = (status) =>
  mapsToSlotComplete(status) || status === "Posted" || status === "Closed" || status === "Done";

/**
 * Check if work item is cancelled
 */
export const isCancelled = (status) => status === "Cancelled";

/**
 * Check if work item is in progress
 */
export const isInProgress = (status) => status === "In Progress";

/**
 * Check if work item is active (not done, not cancelled)
 */
export const isActive = (status) => !["Done", "Cancelled"].includes(status);

/**
 * Get Bootstrap badge variant for UI
 */
export const getStatusVariant = (status) => {
  const variants = {
    "To Do":       "secondary",
    "In Progress": "primary",
    "Review":      "warning",
    "Done":        "success",
    "Cancelled":   "danger",
  };
  return variants[status] || "secondary";
};

/**
 * Format status for display
 */
export const formatStatus = (status) => status || "To Do";

/**
 * Get all statuses
 */
export const getAllStatuses = () => [...VALID_STATUSES];

export default {
  VALID_STATUSES,
  STATUS_COLORS,
  STATUS_ORDER,
  isValidStatus,
  validateStatusTransition,
  getNextStatus,
  isComplete,
  isCancelled,
  isInProgress,
  isActive,
  getStatusVariant,
  formatStatus,
  getAllStatuses,
};
