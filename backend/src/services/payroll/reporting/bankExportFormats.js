/**
 * Bank export format registry.
 * Payroll business logic never builds CSV strings directly — formats plug in here.
 *
 * Future bank-specific formats (SBI, HDFC, ICICI, Axis, …) register alongside
 * `generic_csv` without changing the Payroll Engine or report controller.
 */

import { rowsToCsv } from "./csvUtils.js";

/**
 * @typedef {Object} BankExportBuildInput
 * @property {Array<Object>} slips - Salary slips with populated employee (+ bankDetails)
 */

/**
 * @typedef {Object} BankExportBuildResult
 * @property {string[]} headers
 * @property {Array<Record<string, unknown>>} rows
 * @property {string} csv
 * @property {Array<Object>} skipped - slips omitted (missing bank data)
 * @property {number} totalAmount
 * @property {number} employeeCount
 */

/**
 * Build a generic NEFT-ready CSV (not bank-proprietary).
 * @param {BankExportBuildInput} input
 * @returns {BankExportBuildResult}
 */
export function buildGenericBankCsv({ slips }) {
  const headers = [
    "employeeId",
    "beneficiaryName",
    "accountNumber",
    "ifscCode",
    "bankName",
    "amount",
    "remark",
  ];

  const rows = [];
  const skipped = [];
  let totalAmount = 0;

  for (const slip of slips || []) {
    const employee = slip.employee || {};
    const bank = employee.bankDetails || {};
    const accountNumber = bank.accountNumber;
    const ifscCode = bank.ifscCode;
    const amount = Number(slip.netSalary) || 0;

    if (!accountNumber || !ifscCode) {
      skipped.push({
        slipId: slip._id?.toString?.() || slip._id,
        employeeId: employee.employeeId || null,
        name: employee.name || null,
        reason: !accountNumber ? "missing_account_number" : "missing_ifsc",
      });
      continue;
    }

    const beneficiaryName =
      bank.accountHolderName || employee.name || "Unknown";
    const remark = `Salary ${slip.payPeriod || `${slip.month}-${slip.year}`}`;

    rows.push({
      employeeId: employee.employeeId || "",
      beneficiaryName,
      accountNumber,
      ifscCode,
      bankName: bank.bankName || "",
      amount: amount.toFixed(2),
      remark,
    });
    totalAmount += amount;
  }

  return {
    headers,
    rows,
    csv: rowsToCsv(headers, rows),
    skipped,
    totalAmount: Math.round(totalAmount * 100) / 100,
    employeeCount: rows.length,
  };
}

/** @type {Record<string, { id: string, label: string, contentType: string, extension: string, build: Function }>} */
export const BANK_EXPORT_FORMATS = {
  generic_csv: {
    id: "generic_csv",
    label: "Generic bank CSV (NEFT-ready)",
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
    build: buildGenericBankCsv,
  },
  // Extension point — register without touching payroll calculations:
  // sbi_neft: { id: 'sbi_neft', label: 'SBI NEFT', ... build: buildSbiNeft },
  // hdfc_neft: { ... },
};

/**
 * @param {string} [formatId='generic_csv']
 */
export function getBankExportFormat(formatId = "generic_csv") {
  const format = BANK_EXPORT_FORMATS[formatId];
  if (!format) {
    const known = Object.keys(BANK_EXPORT_FORMATS).join(", ");
    throw new Error(`Unknown bank export format "${formatId}". Known: ${known}`);
  }
  return format;
}

/**
 * List registered formats (for future UI / API discovery).
 * @returns {Array<{ id: string, label: string, extension: string }>}
 */
export function listBankExportFormats() {
  return Object.values(BANK_EXPORT_FORMATS).map((f) => ({
    id: f.id,
    label: f.label,
    extension: f.extension,
  }));
}

export default {
  BANK_EXPORT_FORMATS,
  getBankExportFormat,
  listBankExportFormats,
  buildGenericBankCsv,
};
