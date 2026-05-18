/**
 * Centralized Date Formatting Utility
 * Eliminates duplicate date formatting code across controllers
 */

const DATE_FORMAT = 'DD/MM/YYYY';
const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
const TIME_FORMAT = 'HH:mm';

/**
 * Format date to DD/MM/YYYY
 */
export const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format date and time to DD/MM/YYYY HH:mm
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '';
  }
};

/**
 * Format time to HH:mm (24-hour format)
 */
export const formatTime = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

/**
 * Format currency to Indian Rupees
 */
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '₹0.00';
  }
};

/**
 * Format currency with symbol
 */
export const formatCurrencyWithSymbol = (amount, symbol = '₹') => {
  if (!amount && amount !== 0) return `${symbol}0.00`;
  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${symbol}${formatted}`;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${symbol}0.00`;
  }
};

/**
 * Parse date string to Date object
 */
export const parseDate = (dateString) => {
  if (!dateString) return null;
  try {
    return new Date(dateString);
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Get date range for a month
 */
export const getMonthDateRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
};

/**
 * Get date range for a year
 */
export const getYearDateRange = (year) => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);
  return { start, end };
};

/**
 * Check if date is today
 */
export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is in the past
 */
export const isPast = (date) => {
  return new Date(date) < new Date();
};

/**
 * Check if date is in the future
 */
export const isFuture = (date) => {
  return new Date(date) > new Date();
};

export default {
  formatDate,
  formatDateTime,
  formatTime,
  formatCurrency,
  formatCurrencyWithSymbol,
  parseDate,
  getMonthDateRange,
  getYearDateRange,
  isToday,
  isPast,
  isFuture,
};
