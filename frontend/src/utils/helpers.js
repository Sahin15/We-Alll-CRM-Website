import { format } from "date-fns";
import { DATE_FORMAT, DATE_TIME_FORMAT } from "./constants";

// Get user's preferred date format from localStorage
export const getUserDateFormat = () => {
  try {
    const prefs = localStorage.getItem('displayPreferences');
    if (prefs) {
      const { dateFormat } = JSON.parse(prefs);
      // Convert format string to date-fns format
      const formatMap = {
        'MM/DD/YYYY': 'MM/dd/yyyy',
        'DD/MM/YYYY': 'dd/MM/yyyy',
        'YYYY-MM-DD': 'yyyy-MM-dd'
      };
      return formatMap[dateFormat] || 'MM/dd/yyyy';
    }
  } catch (error) {
    console.error('Error reading date format preference:', error);
  }
  return 'MM/dd/yyyy'; // Default format
};

// Format date with user preference
export const formatDate = (date, formatStr = null) => {
  if (!date) return "N/A";
  const userFormat = formatStr || getUserDateFormat();
  return format(new Date(date), userFormat);
};

// Format date for display (uses user preference)
export const formatDateDisplay = (date) => {
  if (!date) return "N/A";
  return format(new Date(date), getUserDateFormat());
};

// Format date time
export const formatDateTime = (date) => {
  if (!date) return "N/A";
  return format(new Date(date), DATE_TIME_FORMAT);
};

// Capitalize first letter
export const capitalizeFirst = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Format currency
export const formatCurrency = (amount, currency = "USD") => {
  if (!amount) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Truncate text
export const truncate = (text, length = 50) => {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
};

// Get error message from error object
export const getErrorMessage = (error) => {
  return error.response?.data?.message || error.message || "An error occurred";
};

// Check if user has permission
export const hasPermission = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
};

// Calculate days between dates
export const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Get badge variant based on status
export const getStatusVariant = (status) => {
  const statusLower = status?.toLowerCase();
  const variants = {
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
  return variants[statusLower] || "secondary";
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone
export const isValidPhone = (phone) => {
  const phoneRegex =
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

export default {
  formatDate,
  formatDateTime,
  capitalizeFirst,
  formatCurrency,
  getInitials,
  truncate,
  getErrorMessage,
  hasPermission,
  daysBetween,
  getStatusVariant,
  isValidEmail,
  isValidPhone,
};
