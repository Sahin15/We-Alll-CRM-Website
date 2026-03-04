// Validate work log text
export const validateWorkLog = (text) => {
  if (!text || typeof text !== "string") {
    return { valid: false, message: "Work log is required" };
  }

  const trimmed = text.trim();

  if (trimmed.length < 50) {
    return {
      valid: false,
      message: `Work log must be at least 50 characters (current: ${trimmed.length})`,
    };
  }

  if (trimmed.length > 2000) {
    return {
      valid: false,
      message: `Work log cannot exceed 2000 characters (current: ${trimmed.length})`,
    };
  }

  return { valid: true, message: "Valid" };
};

// Truncate work log for table display
export const truncateWorkLog = (text, length = 100) => {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
};

// Get status badge variant
export const getWorkLogStatusBadge = (status) => {
  switch (status) {
    case "submitted":
      return "primary";
    case "reviewed":
      return "success";
    case "draft":
      return "secondary";
    default:
      return "secondary";
  }
};

// Format work log date
export const formatWorkLogDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format work log date and time
export const formatWorkLogDateTime = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Check if user can edit work log
export const canEditWorkLog = (log, user) => {
  if (!log || !user) return false;

  // Admin/HR/Manager can always edit
  if (["admin", "superadmin", "hr", "manager"].includes(user.role)) {
    return true;
  }

  // Employee can edit their own log if not reviewed
  return (
    log.employee?._id === user._id &&
    log.status !== "reviewed"
  );
};

// Check if user can review work log
export const canReviewWorkLog = (log, user) => {
  if (!log || !user) return false;

  // Only admin/hr/manager can review
  if (!["admin", "superadmin", "hr", "manager"].includes(user.role)) {
    return false;
  }

  // Cannot review own log
  return log.employee?._id !== user._id;
};

// Get character count color
export const getCharCountColor = (count) => {
  if (count < 50) return "danger";
  if (count < 100) return "warning";
  return "success";
};

// Get character count message
export const getCharCountMessage = (count) => {
  if (count < 50) {
    return `${50 - count} more characters needed`;
  }
  return `${count} / 2000 characters`;
};
