import { format } from "date-fns";
import { DATE_FORMAT, DATE_TIME_FORMAT } from "./constants";

// Format date
export const formatDate = (date, formatStr = DATE_FORMAT) => {
  if (!date) return "N/A";
  return format(new Date(date), formatStr);
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
