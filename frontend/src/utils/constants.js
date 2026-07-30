// API Base URL - Production-first approach
// In production, VITE_API_URL is set to https://wealll.cloud/api
// For mobile compatibility, we use relative URLs when possible
const getApiBaseUrl = () => {
  // If VITE_API_URL is explicitly set (production), use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production build without explicit URL, use relative path
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // Development fallback
  return 'http://localhost:5000/api';
};

export const API_URL = getApiBaseUrl();

// User Roles
export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  HR: "hr",
  ACCOUNTS: "accounts",
  CLIENT: "client",
  EMPLOYEE: "employee",
  HOD: "hod",
  MANAGER: "manager",
};

// Leave Types
export const LEAVE_TYPES = {
  MEDICAL: "medical",
  CASUAL: "casual",
};

// Leave Type Details
export const LEAVE_TYPE_DETAILS = {
  medical: {
    name: "Medical Leave",
    advanceNotice: 0,
    description: "For illness, medical appointments, or health issues (label only — counts from your 24-day earned balance)",
  },
  casual: {
    name: "Casual Leave",
    advanceNotice: 0,
    description: "For personal matters, family events, or planned time off (label only — counts from your 24-day earned balance)",
  },
  unpaid: {
    name: "Unpaid Leave",
    advanceNotice: 0,
    description: "Extended leave without pay (no limit)",
  },
};

/** Display label for stored leave records (includes legacy types). */
export const getLeaveTypeLabel = (leaveType) => {
  const type = String(leaveType || "").trim().toLowerCase();
  if (LEAVE_TYPE_DETAILS[type]) {
    return LEAVE_TYPE_DETAILS[type].name;
  }
  const legacyLabels = {
    personal: "Casual Leave",
    vacation: "Casual Leave",
    half_day: "Half Day",
  };
  return legacyLabels[type] || type;
};

// Leave Status
export const LEAVE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  HALF_DAY: "half-day",
  LATE: "late",
  ON_LEAVE: "on-leave",
};

// Project Status
export const PROJECT_STATUS = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

// User Status
export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
};

// Pagination
export const ITEMS_PER_PAGE = 10;

// Date Formats - Using DD/MM/YYYY format consistently with 24-hour time
export const DATE_FORMAT = "dd/MM/yyyy";
export const DATE_TIME_FORMAT = "dd/MM/yyyy HH:mm";

// Bootstrap Colors
export const COLORS = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  SUCCESS: "success",
  DANGER: "danger",
  WARNING: "warning",
  INFO: "info",
  LIGHT: "light",
  DARK: "dark",
};

// Status Badge Variants
export const STATUS_VARIANTS = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "secondary",
  active: "success",
  inactive: "secondary",
  suspended: "danger",
  present: "success",
  absent: "danger",
  "half-day": "warning",
  late: "warning",
  "on-leave": "info",
};

export default {
  API_URL,
  ROLES,
  LEAVE_TYPES,
  LEAVE_STATUS,
  ATTENDANCE_STATUS,
  PROJECT_STATUS,
  USER_STATUS,
  ITEMS_PER_PAGE,
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  COLORS,
  STATUS_VARIANTS,
};
