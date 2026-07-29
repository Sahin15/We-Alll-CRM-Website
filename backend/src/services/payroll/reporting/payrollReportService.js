import SalarySlip from "../../../models/salarySlipModel.js";
import User from "../../../models/userModel.js";
import PayrollExportHistory from "../../../models/payrollExportHistoryModel.js";
import {
  storeGeneratedDocument,
  toStorageMetadata,
} from "../../storage/documentStorageService.js";
import { getBankExportFormat, listBankExportFormats } from "./bankExportFormats.js";
import { getComplianceRegisterBuilder } from "./complianceRegisterBuilders.js";
import {
  DEFAULT_BANK_EXPORT_STATUS,
  EXPORT_TYPES,
  EXPORT_STATUSES,
  buildExportManifest,
  REPORTING_LIFECYCLE_STATUSES,
} from "./exportManifest.js";

/**
 * Persist export audit row. Failures are logged and do not fail the download.
 * @param {Object} manifest
 * @returns {Promise<Object|null>} saved doc or null
 */
export async function recordExportHistory(manifest) {
  try {
    const doc = await PayrollExportHistory.create({
      exportType: manifest.exportType,
      payrollPeriod: manifest.payrollPeriod,
      payrollStatusFilter: manifest.payrollStatusFilter,
      employeeCount: manifest.employeeCount,
      totalAmount: manifest.totalAmount,
      generatedBy: manifest.generatedBy || undefined,
      generatedAt: manifest.generatedAt || new Date(),
      exportStatus: manifest.exportStatus,
      fileLocation: manifest.fileLocation || undefined,
      formatId: manifest.formatId || undefined,
      meta: manifest.meta || {},
    });
    return doc;
  } catch (error) {
    console.error("[payrollReport] recordExportHistory failed (non-blocking)", {
      exportType: manifest?.exportType,
      error: error?.message || error,
    });
    return null;
  }
}

/**
 * Best-effort store of CSV bytes for audit fileLocation.
 * @param {string} csv
 * @param {string} fileName
 * @param {string|null} generatedBy
 * @returns {Promise<{ url: string|null, storage: Object|null }>}
 */
async function storeExportFile(csv, fileName, generatedBy) {
  try {
    const stored = await storeGeneratedDocument({
      buffer: Buffer.from(csv, "utf8"),
      fileName,
      mimeType: "text/csv",
      folder: "payroll-exports",
      localSubdir: "uploads/payroll-exports",
      generatedBy,
      stableLocalName: fileName,
    });
    return { url: stored.url, storage: toStorageMetadata(stored) };
  } catch (error) {
    console.error("[payrollReport] storeExportFile failed (non-blocking)", {
      fileName,
      error: error?.message || error,
    });
    return { url: null, storage: null };
  }
}

/**
 * Load slips for a period/status with bank + government IDs.
 * @param {{ month: number, year: number, status: string }} params
 */
export async function loadSlipsForReporting({ month, year, status }) {
  const slips = await SalarySlip.find({
    month: Number(month),
    year: Number(year),
    status,
  })
    .populate({
      path: "employee",
      select:
        "name email employeeId designation department bankDetails governmentIds",
    })
    .lean();

  // accountNumber / gov IDs are select:false — hydrate explicitly
  for (const slip of slips) {
    if (!slip.employee?._id) continue;
    const full = await User.findById(slip.employee._id)
      .select("+bankDetails.accountNumber +governmentIds.panNumber +governmentIds.uanNumber +governmentIds.esicNumber")
      .lean();
    if (full?.bankDetails) {
      slip.employee.bankDetails = {
        ...(slip.employee.bankDetails || {}),
        ...full.bankDetails,
      };
    }
    if (full?.governmentIds) {
      slip.employee.governmentIds = {
        ...(slip.employee.governmentIds || {}),
        ...full.governmentIds,
      };
    }
  }

  return slips;
}

/**
 * @param {Object} params
 * @param {number} params.month
 * @param {number} params.year
 * @param {string} [params.status]
 * @param {string} [params.formatId]
 * @param {string|null} [params.generatedBy]
 */
export async function exportBankNeftCsv({
  month,
  year,
  status = DEFAULT_BANK_EXPORT_STATUS,
  formatId = "generic_csv",
  generatedBy = null,
}) {
  if (!month || !year) {
    throw new Error("month and year are required");
  }

  const format = getBankExportFormat(formatId);
  const slips = await loadSlipsForReporting({ month, year, status });
  const built = format.build({ slips });

  const fileName = `bank-neft-${year}-${String(month).padStart(2, "0")}-${status}.${format.extension}`;
  const { url, storage } = await storeExportFile(built.csv, fileName, generatedBy);

  const exportStatus =
    built.skipped.length > 0 && built.employeeCount > 0
      ? EXPORT_STATUSES.PARTIAL
      : built.employeeCount === 0
        ? EXPORT_STATUSES.COMPLETED
        : EXPORT_STATUSES.COMPLETED;

  const manifest = buildExportManifest({
    exportType: EXPORT_TYPES.BANK_NEFT,
    month,
    year,
    payrollStatusFilter: status,
    employeeCount: built.employeeCount,
    totalAmount: built.totalAmount,
    generatedBy,
    exportStatus,
    fileLocation: url,
    formatId: format.id,
    meta: {
      skippedCount: built.skipped.length,
      skipped: built.skipped,
      storage,
      lifecycleNote:
        "Default status=approved (ready for payment). Future: exported → payment_processing → paid → reconciled.",
    },
  });

  const history = await recordExportHistory(manifest);

  return {
    csv: built.csv,
    contentType: format.contentType,
    fileName,
    skipped: built.skipped,
    manifest: {
      ...manifest,
      exportId: history?._id?.toString?.() || null,
    },
  };
}

/**
 * @param {Object} params
 * @param {'pf'|'esi'|'pt'|'tds'} params.registerId
 * @param {number} params.month
 * @param {number} params.year
 * @param {string} [params.status] - defaults to approved for consistency with bank export
 * @param {string|null} [params.generatedBy]
 */
export async function exportComplianceRegisterCsv({
  registerId,
  month,
  year,
  status = DEFAULT_BANK_EXPORT_STATUS,
  generatedBy = null,
}) {
  if (!month || !year) {
    throw new Error("month and year are required");
  }

  const entry = getComplianceRegisterBuilder(registerId);
  const slips = await loadSlipsForReporting({ month, year, status });
  const built = entry.build({ slips });

  const typeMap = {
    pf: EXPORT_TYPES.REGISTER_PF,
    esi: EXPORT_TYPES.REGISTER_ESI,
    pt: EXPORT_TYPES.REGISTER_PT,
    tds: EXPORT_TYPES.REGISTER_TDS,
  };

  const fileName = `register-${registerId}-${year}-${String(month).padStart(2, "0")}-${status}.csv`;
  const { url, storage } = await storeExportFile(built.csv, fileName, generatedBy);

  const manifest = buildExportManifest({
    exportType: typeMap[registerId],
    month,
    year,
    payrollStatusFilter: status,
    employeeCount: built.employeeCount,
    totalAmount: built.totalAmount,
    generatedBy,
    exportStatus: EXPORT_STATUSES.COMPLETED,
    fileLocation: url,
    formatId: `register_${registerId}_csv`,
    meta: { storage, registerId },
  });

  const history = await recordExportHistory(manifest);

  return {
    csv: built.csv,
    contentType: "text/csv; charset=utf-8",
    fileName,
    manifest: {
      ...manifest,
      exportId: history?._id?.toString?.() || null,
    },
  };
}

/**
 * List recent export history (audit API).
 * @param {{ month?: number, year?: number, limit?: number }} filters
 */
export async function listExportHistory(filters = {}) {
  const query = {};
  if (filters.month && filters.year) {
    query["payrollPeriod.month"] = Number(filters.month);
    query["payrollPeriod.year"] = Number(filters.year);
  }
  const limit = Math.min(Number(filters.limit) || 50, 200);
  return PayrollExportHistory.find(query)
    .sort({ generatedAt: -1 })
    .limit(limit)
    .populate("generatedBy", "name email employeeId")
    .lean();
}

export function getReportingCapabilities() {
  return {
    defaultBankExportStatus: DEFAULT_BANK_EXPORT_STATUS,
    lifecycleStatuses: REPORTING_LIFECYCLE_STATUSES,
    bankFormats: listBankExportFormats(),
    complianceRegisters: ["pf", "esi", "pt", "tds"],
  };
}

export default {
  exportBankNeftCsv,
  exportComplianceRegisterCsv,
  listExportHistory,
  recordExportHistory,
  loadSlipsForReporting,
  getReportingCapabilities,
};
