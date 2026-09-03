/**
 * PH-01: Map dual-run persistable engine output into SalarySlip earnings/deductions.
 */

import {
  dualRunPayroll,
  selectPersistableTotals,
} from "./payrollEngine.js";
import { resolveAttendanceMoneyDeductions } from "./payrollCorrectnessHelpers.js";

const EXTRA_EARNING_CODES = {
  BONUS: "bonus",
  OVERTIME: "overtime",
  ARREARS: "arrears",
  REIMBURSEMENTS: "reimbursements",
  INCENTIVES: "incentives",
};

const EXTRA_DEDUCTION_CODES = {
  LOP: "lossOfPay",
  ADVANCE: "advances",
  LOAN: "loans",
};

/**
 * Map V2 earningsLines / deductionLines into flat V1 slip fields.
 *
 * @param {object} v2Detail - buildV2Result output
 * @param {object} [fallbackEarnings]
 * @param {object} [fallbackDeductions]
 * @returns {{ earnings: object, deductions: object }}
 */
export function mapV2DetailToSlipFields(
  v2Detail,
  fallbackEarnings = {},
  fallbackDeductions = {}
) {
  const earnings = {
    basicSalary: 0,
    hra: 0,
    specialAllowance: 0,
    transportAllowance: 0,
    medicalAllowance: 0,
    otherAllowances: [],
    bonus: 0,
    overtime: 0,
    arrears: 0,
    reimbursements: 0,
    incentives: 0,
  };

  const deductions = {
    providentFund: 0,
    professionalTax: 0,
    tds: 0,
    esi: 0,
    lossOfPay: 0,
    unpaidLeaveDeduction: 0,
    advances: 0,
    loans: 0,
    otherDeductions: [],
  };

  for (const line of v2Detail?.earningsLines || []) {
    const code = line.code;
    const amount = Number(line.amount) || 0;
    if (code === "OTHER_EARNING") {
      earnings.otherAllowances.push({
        name: line.name || "Other Allowance",
        amount,
        isTaxable: line.taxable !== false,
      });
      continue;
    }
    if (EXTRA_EARNING_CODES[code]) {
      earnings[EXTRA_EARNING_CODES[code]] = amount;
      continue;
    }
    if (line.v1Field && Object.prototype.hasOwnProperty.call(earnings, line.v1Field)) {
      earnings[line.v1Field] = amount;
      continue;
    }
    // Catalog codes without v1Field on the line — match common codes
    const byCode = {
      BASIC: "basicSalary",
      HRA: "hra",
      SPECIAL_ALLOWANCE: "specialAllowance",
      TRANSPORT_ALLOWANCE: "transportAllowance",
      MEDICAL_ALLOWANCE: "medicalAllowance",
    };
    if (byCode[code]) {
      earnings[byCode[code]] = amount;
    } else if (amount) {
      earnings.otherAllowances.push({
        name: line.name || code,
        amount,
        isTaxable: line.taxable !== false,
      });
    }
  }

  for (const line of v2Detail?.deductionLines || []) {
    const code = line.code;
    const amount = Number(line.amount) || 0;
    if (code === "OTHER_DEDUCTION") {
      deductions.otherDeductions.push({
        name: line.name || "Other Deduction",
        amount,
      });
      continue;
    }
    if (EXTRA_DEDUCTION_CODES[code]) {
      deductions[EXTRA_DEDUCTION_CODES[code]] = amount;
      continue;
    }
    if (line.v1Field && Object.prototype.hasOwnProperty.call(deductions, line.v1Field)) {
      deductions[line.v1Field] = amount;
      continue;
    }
    const byCode = {
      PF_EE: "providentFund",
      PROFESSIONAL_TAX: "professionalTax",
      TDS: "tds",
      ESI_EE: "esi",
    };
    if (byCode[code]) {
      deductions[byCode[code]] = amount;
    } else if (amount) {
      deductions.otherDeductions.push({
        name: line.name || code,
        amount,
      });
    }
  }

  // R1: never double-count unpaid leave money
  deductions.unpaidLeaveDeduction = 0;

  // Preserve any fallback extras that V2 omitted at zero
  if (!earnings.bonus && fallbackEarnings.bonus) {
    earnings.bonus = fallbackEarnings.bonus;
  }
  if (!deductions.advances && fallbackDeductions.advances) {
    deductions.advances = fallbackDeductions.advances;
  }

  return { earnings, deductions };
}

/**
 * Run dual-run, log, and choose earnings/deductions for persistence (PH-01).
 * When flag is off, keeps the pre-built V1 fallback maps (pro-rata path unchanged).
 * When flag is on, maps V2 lines into slip fields so nets match selectPersistableTotals.
 *
 * @param {object} params
 * @param {object} params.structure
 * @param {object} params.overrides - dualRunPayroll overrides
 * @param {object} params.fallbackEarnings
 * @param {object} params.fallbackDeductions
 * @returns {{ earnings: object, deductions: object, persistable: object, dual: object }}
 */
export function resolveSlipFieldsFromEngine({
  structure,
  overrides,
  fallbackEarnings,
  fallbackDeductions,
}) {
  const dual = dualRunPayroll(structure, overrides);
  const persistable = selectPersistableTotals(dual);

  if (!dual.diff.withinTolerance) {
    console.warn(
      `[payroll-dual-run] mismatch netDiff=${dual.diff.netSalary}`,
      dual.diff
    );
  } else {
    console.info(
      `[payroll-dual-run] match source=${persistable.source} net=${persistable.totals.netSalary}`
    );
  }

  if (persistable.source === "v2") {
    const mapped = mapV2DetailToSlipFields(
      persistable.detail,
      fallbackEarnings,
      fallbackDeductions
    );
    return {
      earnings: mapped.earnings,
      deductions: mapped.deductions,
      persistable,
      dual,
    };
  }

  // Flag off: keep caller V1 maps (includes pro-rata). Align LOP with R1 helper.
  const attendanceMoney = resolveAttendanceMoneyDeductions(
    fallbackDeductions.lossOfPay
  );
  return {
    earnings: fallbackEarnings,
    deductions: {
      ...fallbackDeductions,
      lossOfPay: attendanceMoney.lossOfPay,
      unpaidLeaveDeduction: attendanceMoney.unpaidLeaveDeduction,
    },
    persistable,
    dual,
  };
}
