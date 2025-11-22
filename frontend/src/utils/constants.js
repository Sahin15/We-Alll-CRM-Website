// API Base URL
export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
  VACATION: "vacation",
  SICK: "sick",
  PERSONAL: "personal",
  MATERNITY: "maternity",
  PATERNITY: "paternity",
  UNPAID: "unpaid",
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

// Date Formats
export const DATE_FORMAT = "MMM dd, yyyy";
export const DATE_TIME_FORMAT = "MMM dd, yyyy HH:mm";

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
