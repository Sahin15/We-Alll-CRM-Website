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
};

// Leave Types
export const LEAVE_TYPES = {
  PERSONAL: "personal",
  MEDICAL: "medical", 
  VACATION: "vacation",
};

// Leave Type Details
export const LEAVE_TYPE_DETAILS = {
  personal: {
    name: "Personal Leave",
    total: 12,
    advanceNotice: 3,
    description: "Personal matters, family events, etc."
  },
  medical: {
    name: "Medical Leave", 
    total: 6,
    advanceNotice: 0,
    description: "Illness, medical appointments, health issues"
  },
  vacation: {
    name: "Vacation Leave",
    total: 6, 
    advanceNotice: 30,
    description: "Planned holidays, travel, recreation"
  },
  half_day: {
    name: "Half Day",
    total: 0,
    advanceNotice: 0,
    description: "Leave for half of the working day (counts as 0.5 day)"
  },
  unpaid: {
    name: "Unpaid Leave",
    total: 0,
    advanceNotice: 7,
    description: "Extended leave without pay (no limit)"
  }
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
