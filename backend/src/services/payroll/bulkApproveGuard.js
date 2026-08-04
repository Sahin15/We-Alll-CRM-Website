/**
 * PH-13: Restrict payroll bulkApprove (stage-skip) so it is not a default bypass.
 *
 * Enabled only when PAYROLL_ALLOW_BULK_APPROVE=true AND caller is admin/superadmin
 * AND confirmBypass is explicit. Default is OFF (including production).
 */

const BULK_APPROVE_ROLES = Object.freeze(["admin", "superadmin"]);
const MIN_BYPASS_COMMENT_LEN = 10;

export class BulkApproveForbiddenError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: string, httpStatus?: number, details?: object }} [opts]
   */
  constructor(message, opts = {}) {
    super(message);
    this.name = "BulkApproveForbiddenError";
    this.code = opts.code || "BULK_APPROVE_FORBIDDEN";
    this.httpStatus = opts.httpStatus || 403;
    this.details = opts.details || {};
  }
}

/**
 * @returns {boolean}
 */
export function isPayrollBulkApproveEnabled() {
  return String(process.env.PAYROLL_ALLOW_BULK_APPROVE || "")
    .trim()
    .toLowerCase() === "true";
}

/**
 * @param {{ role?: string }|null|undefined} user
 * @returns {boolean}
 */
export function isBulkApprovePrivilegedRole(user) {
  const role = String(user?.role || "")
    .trim()
    .toLowerCase();
  return BULK_APPROVE_ROLES.includes(role);
}

/**
 * @param {{ role?: string }|null|undefined} user
 */
export function getBulkApproveCapabilities(user) {
  const enabled = isPayrollBulkApproveEnabled();
  const privileged = isBulkApprovePrivilegedRole(user);
  return {
    bulkApproveEnabled: enabled,
    bulkApproveAllowed: enabled && privileged,
    bulkApproveRoles: [...BULK_APPROVE_ROLES],
    minBypassCommentLength: MIN_BYPASS_COMMENT_LEN,
  };
}

/**
 * @param {{
 *   user: { role?: string, _id?: string, id?: string },
 *   confirmBypass?: boolean,
 *   comments?: string,
 * }} input
 * @throws {BulkApproveForbiddenError}
 */
export function assertBulkApproveAllowed({
  user,
  confirmBypass = false,
  comments = "",
} = {}) {
  if (!isPayrollBulkApproveEnabled()) {
    throw new BulkApproveForbiddenError(
      "Bulk approve (skip remaining stages) is disabled. Set PAYROLL_ALLOW_BULK_APPROVE=true only for emergency use, then approve stage-by-stage.",
      {
        code: "BULK_APPROVE_DISABLED",
        details: { enabled: false },
      }
    );
  }

  if (!isBulkApprovePrivilegedRole(user)) {
    throw new BulkApproveForbiddenError(
      `Bulk approve requires one of: ${BULK_APPROVE_ROLES.join(", ")}.`,
      {
        code: "BULK_APPROVE_ROLE",
        details: {
          role: user?.role || null,
          allowedRoles: [...BULK_APPROVE_ROLES],
        },
      }
    );
  }

  if (confirmBypass !== true) {
    throw new BulkApproveForbiddenError(
      "Bulk approve requires confirmBypass: true (explicit stage-skip acknowledgement).",
      {
        code: "BULK_APPROVE_CONFIRM",
        details: { confirmBypassRequired: true },
      }
    );
  }

  const reason = String(comments || "").trim();
  if (reason.length < MIN_BYPASS_COMMENT_LEN) {
    throw new BulkApproveForbiddenError(
      `Bulk approve requires a bypass reason of at least ${MIN_BYPASS_COMMENT_LEN} characters.`,
      {
        code: "BULK_APPROVE_REASON",
        httpStatus: 400,
        details: { minLength: MIN_BYPASS_COMMENT_LEN },
      }
    );
  }

  return true;
}
