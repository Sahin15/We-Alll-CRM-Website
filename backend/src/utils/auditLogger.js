import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const auditLogPath = path.join(logsDir, "audit.log");

/**
 * Log audit events to file
 * @param {Object} event - Audit event details
 */
export const logAuditEvent = (event) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...event,
  };

  const logLine = JSON.stringify(logEntry) + "\n";

  fs.appendFile(auditLogPath, logLine, (err) => {
    if (err) {
      console.error("[AUDIT] Failed to write audit log:", err);
    }
  });

  // Also log to console in development (DISABLED - too verbose)
  if (process.env.NODE_ENV !== "production" && process.env.DEBUG_AUDIT === "true") {
    console.log("[AUDIT]", logEntry);
  }
};

/**
 * Middleware to log all authenticated requests
 */
export const auditMiddleware = (req, res, next) => {
  // Only log authenticated requests
  if (req.user) {
    const originalSend = res.send;

    res.send = function (data) {
      // Log after response is sent
      logAuditEvent({
        action: `${req.method} ${req.path}`,
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        userRole: req.user.role,
        ip: req.ip || req.connection.remoteAddress,
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
        query: req.query,
        body: sanitizeBody(req.body),
      });

      originalSend.call(this, data);
    };
  }

  next();
};

/**
 * Log specific security events
 */
export const logSecurityEvent = (type, details) => {
  logAuditEvent({
    type: "SECURITY_EVENT",
    eventType: type,
    ...details,
  });
};

/**
 * Log work item operations
 */
export const logWorkItemOperation = (operation, workItemId, userId, details = {}) => {
  logAuditEvent({
    type: "WORK_ITEM_OPERATION",
    operation,
    workItemId,
    userId,
    ...details,
  });
};

/**
 * Sanitize request body for logging (remove sensitive data)
 */
const sanitizeBody = (body) => {
  if (!body) return {};

  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = ["password", "token", "secret", "apiKey"];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
};
