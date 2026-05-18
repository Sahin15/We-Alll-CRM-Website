/**
 * Centralized Validation Utility
 * Eliminates duplicate validation logic across 20+ controllers
 */

/**
 * Check if request status is pending
 */
export const isPending = (status) => status === 'pending';

/**
 * Check if request can be approved (must be pending)
 */
export const canApprove = (status) => status === 'pending';

/**
 * Check if request can be rejected (must be pending)
 */
export const canReject = (status) => status === 'pending';

/**
 * Validate status transition
 */
export const validateStatusTransition = (currentStatus, newStatus, allowedTransitions = {}) => {
  const transitions = {
    pending: ['approved', 'rejected'],
    approved: ['rejected'],
    rejected: ['pending'],
    ...allowedTransitions,
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Validate request is pending
 */
export const validatePendingStatus = (request, fieldName = 'request') => {
  if (request.status !== 'pending') {
    return {
      valid: false,
      message: `${fieldName} is already ${request.status}`,
    };
  }
  return { valid: true };
};

/**
 * Validate amount is positive
 */
export const validatePositiveAmount = (amount) => {
  if (!amount || amount <= 0) {
    return {
      valid: false,
      message: 'Amount must be greater than 0',
    };
  }
  return { valid: true };
};

/**
 * Validate date is not in future
 */
export const validateNotFutureDate = (date) => {
  if (new Date(date) > new Date()) {
    return {
      valid: false,
      message: 'Date cannot be in the future',
    };
  }
  return { valid: true };
};

/**
 * Validate date range
 */
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return {
      valid: false,
      message: 'Start date must be before end date',
    };
  }
  return { valid: true };
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(', ')}`,
    };
  }
  return { valid: true };
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      message: 'Invalid email format',
    };
  }
  return { valid: true };
};

/**
 * Validate phone number format
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    return {
      valid: false,
      message: 'Invalid phone number format',
    };
  }
  return { valid: true };
};

/**
 * Validate string length
 */
export const validateStringLength = (str, minLength, maxLength) => {
  if (str.length < minLength || str.length > maxLength) {
    return {
      valid: false,
      message: `String must be between ${minLength} and ${maxLength} characters`,
    };
  }
  return { valid: true };
};

/**
 * Validate enum value
 */
export const validateEnum = (value, allowedValues) => {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      message: `Value must be one of: ${allowedValues.join(', ')}`,
    };
  }
  return { valid: true };
};

export default {
  isPending,
  canApprove,
  canReject,
  validateStatusTransition,
  validatePendingStatus,
  validatePositiveAmount,
  validateNotFutureDate,
  validateDateRange,
  validateRequiredFields,
  validateEmail,
  validatePhone,
  validateStringLength,
  validateEnum,
};
