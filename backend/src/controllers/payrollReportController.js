import {
  exportBankNeftCsv,
  exportComplianceRegisterCsv,
  listExportHistory,
  getReportingCapabilities,
} from "../services/payroll/reporting/payrollReportService.js";
import {
  DEFAULT_BANK_EXPORT_STATUS,
  BankExportStatusError,
} from "../services/payroll/reporting/exportManifest.js";
import {
  assertPeriodAllows,
  sendPeriodGateError,
} from "../services/payroll/payrollPeriodGates.js";

/**
 * Parse month/year/status query for exports.
 * @param {import('express').Request} req
 */
function parsePeriodQuery(req) {
  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  const status =
    typeof req.query.status === "string" && req.query.status.trim()
      ? req.query.status.trim()
      : DEFAULT_BANK_EXPORT_STATUS;
  const formatId =
    typeof req.query.format === "string" && req.query.format.trim()
      ? req.query.format.trim()
      : "generic_csv";

  return { month, year, status, formatId };
}

function sendCsv(res, { csv, contentType, fileName, manifest, skipped }) {
  res.setHeader("Content-Type", contentType || "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileName}"`
  );
  if (manifest?.exportId) {
    res.setHeader("X-Payroll-Export-Id", String(manifest.exportId));
  }
  if (skipped?.length) {
    res.setHeader("X-Payroll-Export-Skipped", String(skipped.length));
  }
  res.status(200).send(csv);
}

/**
 * GET /api/payroll/reports/capabilities
 */
export const getCapabilities = async (_req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: getReportingCapabilities(),
    });
  } catch (error) {
    console.error("[payrollReport] getCapabilities", error);
    res.status(500).json({ success: false, error: "Failed to load capabilities" });
  }
};

/**
 * GET /api/payroll/reports/bank-neft.csv?month=&year=&status=&format=
 */
export const downloadBankNeftCsv = async (req, res) => {
  try {
    const { month, year, status, formatId } = parsePeriodQuery(req);
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: "Valid month (1-12) and year are required",
      });
    }

    await assertPeriodAllows("export", year, month);

    const result = await exportBankNeftCsv({
      month,
      year,
      status,
      formatId,
      generatedBy: req.user?.id || req.user?._id || null,
    });

    return sendCsv(res, result);
  } catch (error) {
    if (sendPeriodGateError(res, error)) return;
    if (error instanceof BankExportStatusError || error?.code === "BANK_EXPORT_STATUS") {
      return res.status(error.httpStatus || 400).json({
        success: false,
        error: error.message,
        code: "BANK_EXPORT_STATUS",
        details: error.details || {},
      });
    }
    console.error("[payrollReport] downloadBankNeftCsv", error);
    if (String(error.message || "").includes("Unknown bank export format")) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error.message || "Failed to export bank CSV",
    });
  }
};

/**
 * GET /api/payroll/reports/registers/:registerId.csv?month=&year=&status=
 */
export const downloadComplianceRegisterCsv = async (req, res) => {
  try {
    const registerId = String(req.params.registerId || "")
      .replace(/\.csv$/i, "")
      .toLowerCase();
    const { month, year, status } = parsePeriodQuery(req);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: "Valid month (1-12) and year are required",
      });
    }

    await assertPeriodAllows("export", year, month);

    const result = await exportComplianceRegisterCsv({
      registerId,
      month,
      year,
      status,
      generatedBy: req.user?.id || req.user?._id || null,
    });

    return sendCsv(res, result);
  } catch (error) {
    if (sendPeriodGateError(res, error)) return;
    console.error("[payrollReport] downloadComplianceRegisterCsv", error);
    if (String(error.message || "").includes("Unknown compliance register")) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error.message || "Failed to export register CSV",
    });
  }
};

/**
 * GET /api/payroll/reports/exports?month=&year=&limit=
 */
export const getExportHistory = async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

    const rows = await listExportHistory({ month, year, limit });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("[payrollReport] getExportHistory", error);
    res.status(500).json({ success: false, error: "Failed to list export history" });
  }
};
