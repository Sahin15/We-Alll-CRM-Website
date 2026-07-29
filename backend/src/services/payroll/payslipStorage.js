import fs from "fs";
import path from "path";
import { generateSalarySlipPDF } from "../../utils/salarySlipPdfGenerator.js";
import {
  storeGeneratedDocument,
  toStorageMetadata,
} from "../storage/documentStorageService.js";

const LOCAL_SUBDIR = "uploads/salary-slips";
const S3_FOLDER = "salary-slips";

/**
 * Build a stable payslip filename.
 * @param {{ employee?: { employeeId?: string }, month: number, year: number }} slip
 * @returns {string}
 */
export function buildPayslipFileName(slip) {
  const empId = slip?.employee?.employeeId || slip?.employee?._id || "employee";
  return `salary-slip-${empId}-${slip.month}-${slip.year}.pdf`;
}

/**
 * Apply storage result onto a salary slip document (mutates; caller saves).
 * @param {import('mongoose').Document} slip
 * @param {import('../storage/documentStorageService.js').StoredDocumentResult} stored
 */
export function applyPayslipStorageToSlip(slip, stored) {
  slip.pdfUrl = stored.url;
  slip.pdfGeneratedAt = stored.generatedAt;
  slip.pdfStorage = toStorageMetadata(stored);
}

/**
 * Generate payslip PDF (local via PDFKit), then store via document storage
 * (S3 when configured, local fallback). Never fails solely due to S3 errors.
 *
 * @param {Object} slip - populated salary slip
 * @param {Object} [options]
 * @param {string|null} [options.generatedBy]
 * @param {number} [options.version]
 * @returns {Promise<{ stored: object, localPath: string }>}
 */
export async function generateAndStorePayslipPdf(slip, options = {}) {
  const { generatedBy = null, version = 1 } = options;
  const fileName = buildPayslipFileName(slip);
  const uploadsDir = path.join(process.cwd(), LOCAL_SUBDIR);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const tempPath = path.join(uploadsDir, fileName);
  await generateSalarySlipPDF(slip, tempPath);

  if (!fs.existsSync(tempPath)) {
    throw new Error("PDF generation failed — output file missing");
  }

  const buffer = fs.readFileSync(tempPath);
  const stored = await storeGeneratedDocument({
    buffer,
    fileName,
    mimeType: "application/pdf",
    folder: S3_FOLDER,
    localSubdir: LOCAL_SUBDIR,
    generatedBy,
    version,
    stableLocalName: fileName,
  });

  applyPayslipStorageToSlip(slip, stored);
  return { stored, localPath: stored.localPath };
}

/**
 * Resolve a filesystem path suitable for email attachment / streaming.
 * Prefers local metadata path, then regenerates if needed.
 *
 * @param {Object} slip
 * @param {Object} [options]
 * @param {string|null} [options.generatedBy]
 * @returns {Promise<string>} absolute local path
 */
export async function ensurePayslipLocalPdf(slip, options = {}) {
  const metaPath = slip?.pdfStorage?.path;
  if (metaPath) {
    const abs = path.join(
      process.cwd(),
      metaPath.replace(/^\//, "").replace(/^uploads/, "uploads")
    );
    if (fs.existsSync(abs)) {
      return abs;
    }
  }

  if (slip?.pdfUrl && slip.pdfUrl.startsWith("/uploads/")) {
    const abs = path.join(process.cwd(), slip.pdfUrl.replace(/^\//, ""));
    if (fs.existsSync(abs)) {
      return abs;
    }
  }

  const { localPath } = await generateAndStorePayslipPdf(slip, options);
  return localPath;
}

export default {
  buildPayslipFileName,
  applyPayslipStorageToSlip,
  generateAndStorePayslipPdf,
  ensurePayslipLocalPdf,
};
