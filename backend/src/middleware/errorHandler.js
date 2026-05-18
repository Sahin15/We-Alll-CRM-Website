/**
 * Centralized Error Handler Middleware
 * Eliminates duplicate try-catch-error patterns across 40+ controllers
 */

/**
 * Async handler wrapper to catch errors automatically
 * Usage: router.get('/endpoint', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Send success response
 */
export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send error response
 */
export const sendError = (res, message = 'Server error', statusCode = 500, error = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error && { error: error.message }),
  });
};

/**
 * Send paginated response
 */
export const sendPaginatedSuccess = (res, data, pagination, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

/**
 * Validation error response
 */
export const sendValidationError = (res, message = 'Validation error', errors = null) => {
  res.status(400).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

/**
 * Not found error response
 */
export const sendNotFound = (res, message = 'Resource not found') => {
  res.status(404).json({
    success: false,
    message,
  });
};

/**
 * Unauthorized error response
 */
export const sendUnauthorized = (res, message = 'Unauthorized') => {
  res.status(401).json({
    success: false,
    message,
  });
};

/**
 * Forbidden error response
 */
export const sendForbidden = (res, message = 'Forbidden') => {
  res.status(403).json({
    success: false,
    message,
  });
};

/**
 * Global error handler middleware
 * Place this at the end of all route definitions
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return sendValidationError(res, 'Validation error', err.errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return sendValidationError(res, `${field} already exists`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendUnauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return sendUnauthorized(res, 'Token expired');
  }

  // Default error
  sendError(res, err.message || 'Server error', err.statusCode || 500, err);
};

export default {
  asyncHandler,
  sendSuccess,
  sendError,
  sendPaginatedSuccess,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  globalErrorHandler,
};
