/**
 * Payroll Engine (Milestone 4).
 * Builds V1-compatible and V2 component-mapped payroll totals, then dual-runs them.
 */

import { getDefaultSalaryComponents } from "./salaryComponentCatalog.js";
import { structureComponentsAsCatalog } from "./structureComponentSync.js";
import {
  isEmployerStatutoryEnabled,
  buildEmployerContributionLines,
  computeCtcWithEmployer,
} from "./employerStatutory.js";
import { evaluateFormula } from "./formula/formulaEngine.js";
import {
  DUAL_RUN_TOLERANCE,
  PAYROLL_ENGINE_VERSION,
  isPayrollV2EngineEnabled,
} from "./payrollEngineConfig.js";
import {
  DEFAULT_ATTENDANCE_PAY_RULES,
  summarizeAttendanceForPayroll,
  buildAttendancePayrollAdjustments,
} from "./payrollAttendanceRules.js";

/**
 * @param {object} structure - SalaryStructure-like plain object
 * @param {object} [overrides]
 * @returns {object}
 */
export function buildV1Result(structure, overrides = {}) {
  const bonus = Number(overrides.bonus) || 0;
  const overtime = Number(overrides.overtime) || 0;
  const arrears = Number(overrides.arrears) || 0;
  const reimbursements = Number(overrides.reimbursements) || 0;
  const incentives = Number(overrides.incentives) || 0;
  const advances = Number(overrides.advances) || 0;
  const loans = Number(overrides.loans) || 0;
  const lossOfPay = Math.round(Number(overrides.lossOfPay) || 0);

  const otherAllowances = Array.isArray(structure.otherAllowances)
    ? structure.otherAllowances
    : [];
  const otherDeductions = Array.isArray(structure.otherDeductions)
    ? structure.otherDeductions
    : [];

  const earnings = {
    basicSalary: Number(structure.basicSalary) || 0,
    hra: Number(structure.hra) || 0,
    specialAllowance: Number(structure.specialAllowance) || 0,
    transportAllowance: Number(structure.transportAllowance) || 0,
    medicalAllowance: Number(structure.medicalAllowance) || 0,
    otherAllowances,
    bonus,
    overtime,
    arrears,
    reimbursements,
    incentives,
  };

  const deductions = {
    providentFund: Number(structure.providentFund) || 0,
    professionalTax: Number(structure.professionalTax) || 0,
    tds: Number(structure.tds) || 0,
    esi: Number(structure.esi) || 0,
    lossOfPay,
    advances,
    loans,
    otherDeductions,
  };

  const grossSalary = sumMoney([
    earnings.basicSalary,
    earnings.hra,
    earnings.specialAllowance,
    earnings.transportAllowance,
    earnings.medicalAllowance,
    ...otherAllowances.map((a) => Number(a.amount) || 0),
    earnings.bonus,
    earnings.overtime,
    earnings.arrears,
    earnings.reimbursements,
    earnings.incentives,
  ]);

  const totalDeductions = sumMoney([
    deductions.providentFund,
    deductions.professionalTax,
    deductions.tds,
    deductions.esi,
    deductions.lossOfPay,
    deductions.advances,
    deductions.loans,
    ...otherDeductions.map((d) => Number(d.amount) || 0),
  ]);

  return {
    engine: "v1",
    earnings,
    deductions,
    totals: {
      grossSalary,
      totalDeductions,
      netSalary: grossSalary - totalDeductions,
    },
  };
}

/**
 * V2 path: map structure through component catalog (+ optional formulas).
 * Fixed components read v1Field amounts so dual-run matches V1 for current data.
 *
 * @param {object} structure
 * @param {object} [overrides]
 * @param {Array<object>} [components] - catalog rows; defaults to seed catalog
 */
export function buildV2Result(structure, overrides = {}, components = null) {
  const useStructureComponents =
    Array.isArray(structure.components) && structure.components.length > 0;

  let catalog;
  if (components) {
    catalog = components;
  } else if (useStructureComponents) {
    catalog = structureComponentsAsCatalog(structure);
  } else {
    catalog = getDefaultSalaryComponents();
  }

  const lossOfPay = Math.round(Number(overrides.lossOfPay) || 0);
  const lopDays = Number(overrides.lopDays) || 0;

  const variables = {
    BASIC: Number(structure.basicSalary) || 0,
    HRA: Number(structure.hra) || 0,
    SPECIAL_ALLOWANCE: Number(structure.specialAllowance) || 0,
    TRANSPORT_ALLOWANCE: Number(structure.transportAllowance) || 0,
    MEDICAL_ALLOWANCE: Number(structure.medicalAllowance) || 0,
    PF_EE: Number(structure.providentFund) || 0,
    PROFESSIONAL_TAX: Number(structure.professionalTax) || 0,
    TDS: Number(structure.tds) || 0,
    ESI_EE: Number(structure.esi) || 0,
    LOP_DAYS: lopDays,
    DAYS_IN_PERIOD: 30,
  };

  const earningsLines = [];
  const deductionLines = [];

  for (const component of catalog) {
    if (component.isActive === false) continue;

    let amount = 0;
    if (component.calcMethod === "formula" && component.defaultFormula) {
      amount = Math.round(
        evaluateFormula(component.defaultFormula, {
          ...variables,
          GROSS: variables.BASIC + variables.HRA + variables.SPECIAL_ALLOWANCE +
            variables.TRANSPORT_ALLOWANCE + variables.MEDICAL_ALLOWANCE,
        })
      );
    } else if (
      useStructureComponents &&
      component.structureAmount != null &&
      component.calcMethod !== "formula"
    ) {
      amount = Number(component.structureAmount) || 0;
    } else if (component.v1Field && structure[component.v1Field] != null) {
      amount = Number(structure[component.v1Field]) || 0;
    }

    const line = {
      code: component.code,
      name: component.name,
      type: component.type,
      amount,
      taxable: Boolean(component.taxable),
      statutory: Boolean(component.statutory),
    };

    if (component.type === "earning") {
      earningsLines.push(line);
      variables[component.code] = amount;
    } else if (component.type === "deduction") {
      deductionLines.push(line);
      variables[component.code] = amount;
    }
  }

  // Variable / one-off earnings (same as V1 overrides)
  const extraEarnings = [
    { code: "BONUS", name: "Bonus", amount: Number(overrides.bonus) || 0 },
    { code: "OVERTIME", name: "Overtime", amount: Number(overrides.overtime) || 0 },
    { code: "ARREARS", name: "Arrears", amount: Number(overrides.arrears) || 0 },
    {
      code: "REIMBURSEMENTS",
      name: "Reimbursements",
      amount: Number(overrides.reimbursements) || 0,
    },
    {
      code: "INCENTIVES",
      name: "Incentives",
      amount: Number(overrides.incentives) || 0,
    },
  ];
  for (const line of extraEarnings) {
    if (line.amount) {
      earningsLines.push({ ...line, type: "earning", taxable: true, statutory: false });
    }
  }

  // Other allowances / deductions arrays from structure
  for (const a of structure.otherAllowances || []) {
    earningsLines.push({
      code: "OTHER_EARNING",
      name: a.name || "Other Allowance",
      type: "earning",
      amount: Number(a.amount) || 0,
      taxable: a.isTaxable !== false,
      statutory: false,
    });
  }
  for (const d of structure.otherDeductions || []) {
    deductionLines.push({
      code: "OTHER_DEDUCTION",
      name: d.name || "Other Deduction",
      type: "deduction",
      amount: Number(d.amount) || 0,
      taxable: false,
      statutory: false,
    });
  }

  if (lossOfPay > 0 || lopDays > 0) {
    let lopAmount = lossOfPay;
    if (!lopAmount && lopDays > 0) {
      const grossForLop = sumMoney(earningsLines.map((l) => l.amount));
      lopAmount = Math.round(
        evaluateFormula("round(GROSS / 30 * LOP_DAYS)", {
          GROSS: grossForLop,
          LOP_DAYS: lopDays,
        })
      );
    }
    deductionLines.push({
      code: "LOP",
      name: "Loss of Pay",
      type: "deduction",
      amount: lopAmount,
      taxable: false,
      statutory: false,
    });
  }

  const advances = Number(overrides.advances) || 0;
  const loans = Number(overrides.loans) || 0;
  if (advances) {
    deductionLines.push({
      code: "ADVANCE",
      name: "Advance Recovery",
      type: "deduction",
      amount: advances,
      taxable: false,
      statutory: false,
    });
  }
  if (loans) {
    deductionLines.push({
      code: "LOAN",
      name: "Loan EMI",
      type: "deduction",
      amount: loans,
      taxable: false,
      statutory: false,
    });
  }

  const grossSalary = sumMoney(earningsLines.map((l) => l.amount));
  const totalDeductions = sumMoney(deductionLines.map((l) => l.amount));
  const netSalary = grossSalary - totalDeductions;

  const employerLines = isEmployerStatutoryEnabled()
    ? buildEmployerContributionLines(structure, overrides.employerStatutory || {})
    : [];
  const ctc = computeCtcWithEmployer(grossSalary, employerLines);

  return {
    engine: "v2",
    engineVersion: PAYROLL_ENGINE_VERSION,
    earningsLines,
    deductionLines,
    employerLines,
    totals: {
      grossSalary,
      totalDeductions,
      netSalary,
      employerContributions: ctc.employerTotal,
      monthlyCtc: ctc.monthlyCtc,
      annualCtc: ctc.annualCtc,
    },
  };
}

/**
 * Compare V1 vs V2 totals.
 * @param {object} structure
 * @param {object} [overrides]
 * @param {Array<object>} [components]
 */
export function dualRunPayroll(structure, overrides = {}, components = null) {
  const v1 = buildV1Result(structure, overrides);
  const v2 = buildV2Result(structure, overrides, components);

  const grossDiff = Math.abs(v1.totals.grossSalary - v2.totals.grossSalary);
  const deductionDiff = Math.abs(
    v1.totals.totalDeductions - v2.totals.totalDeductions
  );
  const netDiff = Math.abs(v1.totals.netSalary - v2.totals.netSalary);

  const withinTolerance =
    grossDiff <= DUAL_RUN_TOLERANCE &&
    deductionDiff <= DUAL_RUN_TOLERANCE &&
    netDiff <= DUAL_RUN_TOLERANCE;

  return {
    engineVersion: PAYROLL_ENGINE_VERSION,
    v2Enabled: isPayrollV2EngineEnabled(),
    v1,
    v2,
    diff: {
      grossSalary: v1.totals.grossSalary - v2.totals.grossSalary,
      totalDeductions: v1.totals.totalDeductions - v2.totals.totalDeductions,
      netSalary: v1.totals.netSalary - v2.totals.netSalary,
      abs: { grossSalary: grossDiff, totalDeductions: deductionDiff, netSalary: netDiff },
      withinTolerance,
      tolerance: DUAL_RUN_TOLERANCE,
    },
  };
}

/**
 * Choose which totals to persist based on feature flag.
 * Default: V1. When PAYROLL_V2_ENGINE=true, V2 totals (still dual-run logged by caller).
 *
 * @param {ReturnType<typeof dualRunPayroll>} dual
 */
export function selectPersistableTotals(dual) {
  if (isPayrollV2EngineEnabled()) {
    return { source: "v2", totals: dual.v2.totals, detail: dual.v2 };
  }
  return { source: "v1", totals: dual.v1.totals, detail: dual.v1 };
}

/**
 * Async employee processing: load structure + leave impact + attendance rules, then dual-run.
 *
 * @param {object} params
 * @param {string} params.employeeId
 * @param {number} params.month
 * @param {number} params.year
 * @param {object} [params.overrides]
 * @param {object} [params.attendanceRules]
 * @param {object} [params.deps] - injectable deps for tests
 */
export async function processEmployeePayroll(params) {
  const {
    employeeId,
    month,
    year,
    overrides = {},
    attendanceRules = DEFAULT_ATTENDANCE_PAY_RULES,
    deps = {},
  } = params;

  const SalaryStructure =
    deps.SalaryStructure ||
    (await import("../../models/salaryStructureModel.js")).default;
  const LeaveImpactCalculator =
    deps.LeaveImpactCalculator ||
    (await import("../leaveImpactCalculator.js")).default;

  const structure = await SalaryStructure.getActiveStructure(employeeId);
  if (!structure) {
    throw new Error("No active salary structure found for this employee");
  }

  const leaveCalc = new LeaveImpactCalculator();
  const leaveImpact = await leaveCalc.calculateLeaveDeduction(
    employeeId,
    month,
    year,
    structure
  );

  const attendanceAdjustment = await resolveAttendanceAdjustments({
    employeeId,
    month,
    year,
    structure,
    leaveImpact,
    attendanceRules,
    deps,
  });

  const baseLopDays =
    overrides.lopDays != null ? overrides.lopDays : leaveImpact.unpaidLeaves;
  const baseLossOfPay =
    overrides.lossOfPay != null
      ? overrides.lossOfPay
      : leaveImpact.deductionAmount;

  const mergedOverrides = {
    ...overrides,
    // Explicit caller overtime wins; otherwise use attendance-derived OT pay
    overtime:
      overrides.overtime != null
        ? overrides.overtime
        : attendanceAdjustment.overtimePay,
    lopDays: baseLopDays + attendanceAdjustment.extraLopDays,
    lossOfPay: Math.round(baseLossOfPay + attendanceAdjustment.lateHalfDayDeduction),
  };

  const dual = dualRunPayroll(structure, mergedOverrides, deps.components);
  const persistable = selectPersistableTotals(dual);

  return {
    employeeId,
    month,
    year,
    leaveImpact: {
      unpaidLeaves: leaveImpact.unpaidLeaves,
      paidLeaves: leaveImpact.paidLeaves,
      deductionAmount: leaveImpact.deductionAmount,
      perDaySalary: leaveImpact.perDaySalary,
    },
    attendanceAdjustment,
    dual,
    persistable,
  };
}

/**
 * Load month attendance and compute OT / late-half-day payroll adjustments.
 * @param {object} params
 */
export async function resolveAttendanceAdjustments(params) {
  const {
    employeeId,
    month,
    year,
    structure,
    leaveImpact,
    attendanceRules = DEFAULT_ATTENDANCE_PAY_RULES,
    deps = {},
  } = params;

  if (typeof deps.loadAttendanceRecords === "function") {
    const records = await deps.loadAttendanceRecords(employeeId, month, year);
    return finalizeAttendanceAdjustment(structure, leaveImpact, records, attendanceRules);
  }

  try {
    const Attendance =
      deps.Attendance ||
      (await import("../../models/attendanceModel.js")).default;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const records = await Attendance.find({
      employee: employeeId,
      date: { $gte: monthStart, $lte: monthEnd },
    }).lean();
    return finalizeAttendanceAdjustment(
      structure,
      leaveImpact,
      records,
      attendanceRules
    );
  } catch (error) {
    console.error("resolveAttendanceAdjustments failed:", error.message);
    return {
      overtimePay: 0,
      overtimeHours: 0,
      extraLopDays: 0,
      lateHalfDayDeduction: 0,
      summary: summarizeAttendanceForPayroll([]),
      error: error.message,
    };
  }
}

function finalizeAttendanceAdjustment(
  structure,
  leaveImpact,
  records,
  attendanceRules
) {
  const grossSalary =
    Number(structure.grossSalary) ||
    (Number(structure.basicSalary) || 0) +
      (Number(structure.hra) || 0) +
      (Number(structure.specialAllowance) || 0) +
      (Number(structure.transportAllowance) || 0) +
      (Number(structure.medicalAllowance) || 0);

  const summary = summarizeAttendanceForPayroll(records, attendanceRules);
  return buildAttendancePayrollAdjustments({
    grossSalary,
    perDaySalary: leaveImpact?.perDaySalary,
    summary,
    rules: attendanceRules,
  });
}

/**
 * @param {number[]} values
 * @returns {number}
 */
function sumMoney(values) {
  return values.reduce((sum, v) => sum + (Number(v) || 0), 0);
}
