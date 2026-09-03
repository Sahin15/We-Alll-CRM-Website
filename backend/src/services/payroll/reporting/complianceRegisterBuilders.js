/**
 * Compliance register CSV builders (PF / ESI / PT / TDS).
 * Employer contributions and filing-portal formats are out of Milestone 8 scope.
 */

import { rowsToCsv } from "./csvUtils.js";

/**
 * @param {Object} slip
 * @returns {{ employee: Object, gov: Object, deductions: Object }}
 */
function employeeCtx(slip) {
  const employee = slip.employee || {};
  return {
    employee,
    gov: employee.governmentIds || {},
    deductions: slip.deductions || {},
  };
}

/**
 * @param {Array<Object>} slips
 * @returns {{ csv: string, employeeCount: number, totalAmount: number, headers: string[], rows: Object[] }}
 */
export function buildPfRegister({ slips }) {
  const headers = [
    "employeeId",
    "employeeName",
    "uanNumber",
    "month",
    "year",
    "grossSalary",
    "basicSalary",
    "employeePf",
    "payPeriod",
  ];
  const rows = [];
  let totalAmount = 0;

  for (const slip of slips || []) {
    const { employee, gov, deductions } = employeeCtx(slip);
    const employeePf = Number(deductions.providentFund) || 0;
    totalAmount += employeePf;
    rows.push({
      employeeId: employee.employeeId || "",
      employeeName: employee.name || "",
      uanNumber: gov.uanNumber || "",
      month: slip.month,
      year: slip.year,
      grossSalary: Number(slip.totalEarnings) || 0,
      basicSalary: Number(slip.earnings?.basicSalary) || 0,
      employeePf,
      payPeriod: slip.payPeriod || "",
    });
  }

  return {
    headers,
    rows,
    csv: rowsToCsv(headers, rows),
    employeeCount: rows.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * @param {Array<Object>} slips
 */
export function buildEsiRegister({ slips }) {
  const headers = [
    "employeeId",
    "employeeName",
    "esicNumber",
    "month",
    "year",
    "grossSalary",
    "employeeEsi",
    "payPeriod",
  ];
  const rows = [];
  let totalAmount = 0;

  for (const slip of slips || []) {
    const { employee, gov, deductions } = employeeCtx(slip);
    const employeeEsi = Number(deductions.esi) || 0;
    totalAmount += employeeEsi;
    rows.push({
      employeeId: employee.employeeId || "",
      employeeName: employee.name || "",
      esicNumber: gov.esicNumber || "",
      month: slip.month,
      year: slip.year,
      grossSalary: Number(slip.totalEarnings) || 0,
      employeeEsi,
      payPeriod: slip.payPeriod || "",
    });
  }

  return {
    headers,
    rows,
    csv: rowsToCsv(headers, rows),
    employeeCount: rows.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * @param {Array<Object>} slips
 */
export function buildPtRegister({ slips }) {
  const headers = [
    "employeeId",
    "employeeName",
    "month",
    "year",
    "grossSalary",
    "professionalTax",
    "payPeriod",
  ];
  const rows = [];
  let totalAmount = 0;

  for (const slip of slips || []) {
    const { employee, deductions } = employeeCtx(slip);
    const professionalTax = Number(deductions.professionalTax) || 0;
    totalAmount += professionalTax;
    rows.push({
      employeeId: employee.employeeId || "",
      employeeName: employee.name || "",
      month: slip.month,
      year: slip.year,
      grossSalary: Number(slip.totalEarnings) || 0,
      professionalTax,
      payPeriod: slip.payPeriod || "",
    });
  }

  return {
    headers,
    rows,
    csv: rowsToCsv(headers, rows),
    employeeCount: rows.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * @param {Array<Object>} slips
 */
export function buildTdsRegister({ slips }) {
  const headers = [
    "employeeId",
    "employeeName",
    "panNumber",
    "month",
    "year",
    "grossSalary",
    "tds",
    "ytdTds",
    "payPeriod",
  ];
  const rows = [];
  let totalAmount = 0;

  for (const slip of slips || []) {
    const { employee, gov, deductions } = employeeCtx(slip);
    const tds = Number(deductions.tds) || 0;
    totalAmount += tds;
    rows.push({
      employeeId: employee.employeeId || "",
      employeeName: employee.name || "",
      panNumber: gov.panNumber || "",
      month: slip.month,
      year: slip.year,
      grossSalary: Number(slip.totalEarnings) || 0,
      tds,
      ytdTds: Number(slip.ytd?.tds) || 0,
      payPeriod: slip.payPeriod || "",
    });
  }

  return {
    headers,
    rows,
    csv: rowsToCsv(headers, rows),
    employeeCount: rows.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

export const COMPLIANCE_REGISTER_BUILDERS = {
  pf: { id: "pf", label: "PF register", build: buildPfRegister },
  esi: { id: "esi", label: "ESI register", build: buildEsiRegister },
  pt: { id: "pt", label: "Professional tax register", build: buildPtRegister },
  tds: { id: "tds", label: "TDS register", build: buildTdsRegister },
};

/**
 * @param {string} registerId
 */
export function getComplianceRegisterBuilder(registerId) {
  const entry = COMPLIANCE_REGISTER_BUILDERS[registerId];
  if (!entry) {
    const known = Object.keys(COMPLIANCE_REGISTER_BUILDERS).join(", ");
    throw new Error(`Unknown compliance register "${registerId}". Known: ${known}`);
  }
  return entry;
}

export default {
  buildPfRegister,
  buildEsiRegister,
  buildPtRegister,
  buildTdsRegister,
  COMPLIANCE_REGISTER_BUILDERS,
  getComplianceRegisterBuilder,
};
