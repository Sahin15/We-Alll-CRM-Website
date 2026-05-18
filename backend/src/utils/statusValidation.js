/**
 * Status Management Utility
 * Handles validation and business logic for work item status transitions
 */

// Valid status values — 4-stage workflow + Cancelled
export const VALID_STATUSES = ["To Do", "In Progress", "Review", "Done", "Cancelled"];

// Status colors for UI
export const STATUS_COLORS = {
  "To Do":       "#6B7280", // Gray
  "In Progress": "#3B82F6", // Blue
  "Review":      "#F59E0B", // Amber
  "Done":        "#10B981", // Green
  "Cancelled":   "#EF4444", // Red
};

// Status order for sorting
export const STATUS_ORDER = {
  "To Do":       1,
  "In Progress": 2,
  "Review":      3,
  "Done":        4,
  "Cancelled":   5,
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
export const isComplete = (status) => status === "Done";

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
