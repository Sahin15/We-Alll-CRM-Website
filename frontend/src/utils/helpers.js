import { format } from "date-fns";
import { DATE_FORMAT, DATE_TIME_FORMAT } from "./constants";

// Standard date format DD/MM/YYYY as required
export const getStandardDateFormat = () => {
  return 'dd/MM/yyyy'; // Always use DD/MM/YYYY format
};

// Format date with standard DD/MM/YYYY format
export const formatDate = (date, formatStr = null) => {
  if (!date) return "N/A";
  const standardFormat = formatStr || getStandardDateFormat();
  return format(new Date(date), standardFormat);
};

// Format date for display (uses standard DD/MM/YYYY format)
export const formatDateDisplay = (date) => {
  if (!date) return "N/A";
  return format(new Date(date), getStandardDateFormat());
};

// Format date time
export const formatDateTime = (date) => {
  if (!date) return "N/A";
  return format(new Date(date), DATE_TIME_FORMAT);
};

// Format time only (HH:mm) - 24-hour format for consistency with DD/MM/YYYY
export const formatTime = (date) => {
  if (!date) return "N/A";
  try {
    const dateObj = new Date(date);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return "Invalid Time";
  }
};

// Format time without seconds (HH:mm) - 24-hour format
export const formatTimeShort = (date) => {
  if (!date) return "N/A";
  try {
    const dateObj = new Date(date);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return "Invalid Time";
  }
};

// Capitalize first letter
export const capitalizeFirst = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Format currency
export const formatCurrency = (amount, currency = "INR") => {
  if (!amount) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
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
    cancelled: "danger",
    active: "success",
    inactive: "secondary",
    suspended: "danger",
    present: "success",
    absent: "danger",
    "half-day": "info",
    late: "warning",
    "on-leave": "primary",
    "no-data": "secondary",
    weekend: "secondary",
    holiday: "warning",
  };
  return variants[statusLower] || "secondary";
};

// Get status color for calendar and table views (consistent styling)
export const getStatusColor = (status) => {
  const statusLower = status?.toLowerCase();
  const colors = {
    present: { bg: 'success', text: 'white' },
    late: { bg: 'warning', text: 'dark' },
    'half-day': { bg: 'info', text: 'white' },
    absent: { bg: 'danger', text: 'white' },
    'on-leave': { bg: 'primary', text: 'white' },
    'no-data': { bg: 'secondary', text: 'white' },
    weekend: { bg: 'light', text: 'muted' },
    holiday: { bg: 'warning', text: 'dark' },
    cancelled: { bg: 'danger', text: 'white' },
    'to do': { bg: 'secondary', text: 'white' },
    'in progress': { bg: 'primary', text: 'white' },
    review: { bg: 'warning', text: 'dark' },
    done: { bg: 'success', text: 'white' },
  };
  return colors[statusLower] || { bg: 'danger', text: 'white' };
};

// Format hours in HH.MM format (1.30 for 1 hour 30 minutes, not 1.50)
// Example: 1.5 hours = 1 hour 30 minutes = 1.30
export const formatHours = (decimalHours) => {
  if (!decimalHours && decimalHours !== 0) return "0.00";
  
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  // Minutes are shown as actual minutes (0-59), not as decimal
  // 30 minutes = .30, 45 minutes = .45, 15 minutes = .15
  return `${hours}.${String(minutes).padStart(2, '0')}`;
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
  formatHours,
  capitalizeFirst,
  formatCurrency,
  getInitials,
  truncate,
  getErrorMessage,
  hasPermission,
  daysBetween,
  getStatusVariant,
  getStatusColor,
  isValidEmail,
  isValidPhone,
};
