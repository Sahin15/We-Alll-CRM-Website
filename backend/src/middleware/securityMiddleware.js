import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

// Rate limiting for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute (reduced window for better UX)
  max: 100, // Limit each IP to 100 requests per minute (increased for development)
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again later",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development for localhost
    return process.env.NODE_ENV === 'development' && 
           (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  },
});

// Stricter rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts, please try again later",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for work item creation
export const createWorkItemLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 work items per minute
  message: {
    success: false,
    error: {
      code: "CREATE_RATE_LIMIT_EXCEEDED",
      message: "Too many work items created, please slow down",
    },
  },
});

// MongoDB query sanitization
// Note: Using onSanitize callback only (no direct sanitization) due to Express 5 compatibility
export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = mongoSanitize.sanitize(req.body, { replaceWith: "_" });
    }
    
    // Sanitize params
    if (req.params) {
      req.params = mongoSanitize.sanitize(req.params, { replaceWith: "_" });
    }
    
    // Note: Skip query sanitization to avoid Express 5 compatibility issues
    // Query parameters are validated separately in validators
    
    next();
  } catch (error) {
    console.error("[SECURITY] Sanitization error:", error);
    next();
  }
};

// Input validation helper
export const validateRequest = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const { validationResult } = await import("express-validator");
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
            value: err.value,
          })),
        },
      });
    }

    next();
  };
};
