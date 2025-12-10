/**
 * Status Management Utility
 * Handles validation and business logic for work item status transitions
 */

// Valid status values
export const VALID_STATUSES = ["To Do", "In Progress", "Review", "Done"];

// Status colors for UI (can be used by frontend)
export const STATUS_COLORS = {
  "To Do": "#6B7280",      // Gray
  "In Progress": "#3B82F6", // Blue
  "Review": "#F59E0B",      // Yellow/Orange
  "Done": "#10B981",        // Green
};

// Status order for sorting
export const STATUS_ORDER = {
  "To Do": 1,
  "In Progress": 2,
  "Review": 3,
  "Done": 4,
};

/**
 * Validate if a status value is valid
 * @param {string} status - Status to validate
 * @returns {boolean} - True if valid
 */
export const isValidStatus = (status) => {
  return VALID_STATUSES.includes(status);
};

/**
 * Validate status transition
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - New status to transition to
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
  // Check if new status is valid
  if (!isValidStatus(newStatus)) {
    return {
      valid: false,
      message: `Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(", ")}`,
    };
  }
  
  // Check if status is actually changing
  if (currentStatus === newStatus) {
    return {
      valid: false,
      message: "Status is already set to this value",
    };
  }
  
  // All transitions are allowed (flexible workflow)
  // You can add specific business rules here if needed
  // For example:
  // - Can't go from "Done" back to "To Do"
  // - Must go through "Review" before "Done"
  // etc.
  
  return {
    valid: true,
    message: "Status transition is valid",
  };
};

/**
 * Get next suggested status based on current status
 * @param {string} currentStatus - Current status
 * @returns {string} - Suggested next status
 */
export const getNextStatus = (currentStatus) => {
  const statusFlow = {
    "To Do": "In Progress",
    "In Progress": "Review",
    "Review": "Done",
    "Done": "Done", // Already done
  };
  
  return statusFlow[currentStatus] || "In Progress";
};

/**
 * Check if work item is complete
 * @param {string} status - Work item status
 * @returns {boolean} - True if complete
 */
export const isComplete = (status) => {
  return status === "Done";
};

/**
 * Check if work item is in progress
 * @param {string} status - Work item status
 * @returns {boolean} - True if in progress
 */
export const isInProgress = (status) => {
  return status === "In Progress" || status === "Review";
};

/**
 * Get status badge variant for UI
 * @param {string} status - Work item status
 * @returns {string} - Bootstrap variant (success, primary, warning, secondary)
 */
export const getStatusVariant = (status) => {
  const variants = {
    "To Do": "secondary",
    "In Progress": "primary",
    "Review": "warning",
    "Done": "success",
  };
  
  return variants[status] || "secondary";
};

/**
 * Format status for display
 * @param {string} status - Work item status
 * @returns {string} - Formatted status
 */
export const formatStatus = (status) => {
  return status || "To Do";
};

/**
 * Get all statuses
 * @returns {Array} - Array of all valid statuses
 */
export const getAllStatuses = () => {
  return [...VALID_STATUSES];
};

export default {
  VALID_STATUSES,
  STATUS_COLORS,
  STATUS_ORDER,
  isValidStatus,
  validateStatusTransition,
  getNextStatus,
  isComplete,
  isInProgress,
  getStatusVariant,
  formatStatus,
  getAllStatuses,
};
