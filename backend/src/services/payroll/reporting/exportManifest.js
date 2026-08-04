/**
 * Export manifest / history helpers.
 *
 * Planned payroll lifecycle (filterable by status string; not all exist on SalarySlip yet):
 * draft → generated → under_review → approved → exported → payment_processing → paid → reconciled
 *
 * Current SalarySlip enum still uses V1 values; reporting filters by string so
 * future statuses can be added without refactoring exporters.
 */

/** Statuses reporting may see today or in the future (documentation + soft validation). */
export const REPORTING_LIFECYCLE_STATUSES = Object.freeze([
  "draft",
  "generated",
  "under_review",
  "approved",
  "exported",
  "payment_processing",
  "paid",
  "reconciled",
  // V1 compatibility
  "sent",
  "viewed",
  "downloaded",
  "rejected",
]);

/** Default bank export status — finalized, ready for payment (not generated, not paid). */
export const DEFAULT_BANK_EXPORT_STATUS = "approved";

/**
 * PH-07: Bank NEFT may only filter these statuses (blocks generated/draft).
 * Includes V1 post-generate lifecycle (sent/viewed/downloaded) and approved/paid.
 */
export const BANK_NEFT_ALLOWED_STATUSES = Object.freeze([
  "approved",
  "sent",
  "viewed",
  "downloaded",
  "paid",
  "exported",
  "payment_processing",
]);

export class BankExportStatusError extends Error {
  /**
   * @param {string} status
   */
  constructor(status) {
    super(
      `Bank NEFT export cannot use status "${status}". Allowed: ${BANK_NEFT_ALLOWED_STATUSES.join(", ")}. Generate slips must be approved (or sent) before bank export.`
    );
    this.name = "BankExportStatusError";
    this.code = "BANK_EXPORT_STATUS";
    this.httpStatus = 400;
    this.details = {
      status,
      allowedStatuses: [...BANK_NEFT_ALLOWED_STATUSES],
    };
  }
}

/**
 * @param {string} status
 * @throws {BankExportStatusError}
 */
export function assertBankNeftExportStatus(status) {
  const s = String(status || "").trim();
  if (!BANK_NEFT_ALLOWED_STATUSES.includes(s)) {
    throw new BankExportStatusError(s || "(empty)");
  }
  return s;
}

export const EXPORT_TYPES = Object.freeze({
  BANK_NEFT: "bank_neft",
  REGISTER_PF: "register_pf",
  REGISTER_ESI: "register_esi",
  REGISTER_PT: "register_pt",
  REGISTER_TDS: "register_tds",
});

export const EXPORT_STATUSES = Object.freeze({
  COMPLETED: "completed",
  FAILED: "failed",
  PARTIAL: "partial",
});

/**
 * Build an export history / audit manifest (persisted by recordExportHistory).
 *
 * @param {Object} params
 * @param {string} params.exportType
 * @param {number} params.month
 * @param {number} params.year
 * @param {string} params.payrollStatusFilter
 * @param {number} params.employeeCount
 * @param {number} params.totalAmount
 * @param {string|null} params.generatedBy
 * @param {string} [params.exportStatus='completed']
 * @param {string|null} [params.fileLocation=null]
 * @param {string} [params.formatId]
 * @param {Object} [params.meta]
 * @returns {Object}
 */
export function buildExportManifest({
  exportType,
  month,
  year,
  payrollStatusFilter,
  employeeCount,
  totalAmount,
  generatedBy,
  exportStatus = EXPORT_STATUSES.COMPLETED,
  fileLocation = null,
  formatId = null,
  meta = {},
}) {
  return {
    exportType,
    payrollPeriod: { month: Number(month), year: Number(year) },
    payrollStatusFilter,
    employeeCount: Number(employeeCount) || 0,
    totalAmount: Number(totalAmount) || 0,
    generatedBy: generatedBy || null,
    generatedAt: new Date(),
    exportStatus,
    fileLocation,
    formatId,
    meta,
  };
}

export default {
  REPORTING_LIFECYCLE_STATUSES,
  DEFAULT_BANK_EXPORT_STATUS,
  BANK_NEFT_ALLOWED_STATUSES,
  BankExportStatusError,
  assertBankNeftExportStatus,
  EXPORT_TYPES,
  EXPORT_STATUSES,
  buildExportManifest,
};
