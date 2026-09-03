/**
 * PH-03 / PH-04: Shared money policy for standard (non-simple) slip generate.
 * Aligns generate path with processEmployeePayroll attendance OT / half-day rules
 * and uses persisted earnings gross for LOP per-day base.
 */

import { resolveAttendanceAdjustments } from "./payrollEngine.js";
import {
  pickAmount,
  computeFlatGross,
  computePerDaySalary,
  resolveAttendanceMoneyDeductions,
} from "./payrollCorrectnessHelpers.js";
import { DEFAULT_ATTENDANCE_PAY_RULES } from "./payrollAttendanceRules.js";

/**
 * Build earnings/deductions for standard payroll generate (single or bulk).
 *
 * @param {object} params
 * @param {string} params.employeeId
 * @param {number} params.month
 * @param {number} params.year
 * @param {object} params.structure - active SalaryStructure
 * @param {object} params.proRataData - from checkAndCalculateProRata
 * @param {object} params.attendance - from calculateAttendance
 * @param {object} [params.extras] - bonus, overtime, arrears, etc. from request
 * @param {object} [params.attendanceRules]
 * @param {object} [params.deps] - injectable for tests
 * @returns {Promise<{
 *   earnings: object,
 *   deductions: object,
 *   attendanceAdjustment: object,
 *   perDaySalary: number,
 *   lopDays: number,
 *   engineOverrides: object,
 * }>}
 */
export async function buildStandardGenerateSlipMoney(params) {
  const {
    employeeId,
    month,
    year,
    structure,
    proRataData,
    attendance,
    extras = {},
    attendanceRules = DEFAULT_ATTENDANCE_PAY_RULES,
    deps = {},
  } = params;

  const proEarn = proRataData?.earnings || {};
  const proDed = proRataData?.deductions || {};

  const earnings = {
    basicSalary: pickAmount(proEarn.basicSalary, structure.basicSalary),
    hra: pickAmount(proEarn.hra, structure.hra),
    specialAllowance: pickAmount(
      proEarn.specialAllowance,
      structure.specialAllowance
    ),
    transportAllowance: pickAmount(
      proEarn.transportAllowance,
      structure.transportAllowance
    ),
    medicalAllowance: pickAmount(
      proEarn.medicalAllowance,
      structure.medicalAllowance
    ),
    otherAllowances: structure.otherAllowances || [],
    bonus: Number(extras.bonus) || 0,
    // Request overtime wins; attendance OT fills in when request omits it
    overtime: extras.overtime != null ? Number(extras.overtime) || 0 : 0,
    arrears: Number(extras.arrears) || 0,
    reimbursements: Number(extras.reimbursements) || 0,
    incentives: Number(extras.incentives) || 0,
  };

  const persistedGross = computeFlatGross(earnings);
  const perDaySalary = computePerDaySalary(persistedGross, 30);

  const unpaidLeaveDays = Number(attendance?.unpaidLeaves) || 0;
  const baseLopFromDays = Math.round(unpaidLeaveDays * perDaySalary);

  const structureForAttendance = {
    ...(typeof structure.toObject === "function"
      ? structure.toObject()
      : structure),
    basicSalary: earnings.basicSalary,
    hra: earnings.hra,
    specialAllowance: earnings.specialAllowance,
    transportAllowance: earnings.transportAllowance,
    medicalAllowance: earnings.medicalAllowance,
    grossSalary: persistedGross,
  };

  const attendanceAdjustment = await resolveAttendanceAdjustments({
    employeeId,
    month,
    year,
    structure: structureForAttendance,
    leaveImpact: {
      unpaidLeaves: unpaidLeaveDays,
      perDaySalary,
      deductionAmount: baseLopFromDays,
    },
    attendanceRules,
    deps,
  });

  // Match processEmployeePayroll: request overtime wins; else attendance OT
  if (extras.overtime == null) {
    earnings.overtime = Number(attendanceAdjustment.overtimePay) || 0;
  }

  const totalLopMoney = Math.round(
    baseLopFromDays + (Number(attendanceAdjustment.lateHalfDayDeduction) || 0)
  );
  const attendanceMoney = resolveAttendanceMoneyDeductions(totalLopMoney);

  const deductions = {
    providentFund: pickAmount(proDed.providentFund, structure.providentFund),
    professionalTax: pickAmount(
      proDed.professionalTax,
      structure.professionalTax
    ),
    tds: pickAmount(proDed.tds, structure.tds),
    esi: pickAmount(proDed.esi, structure.esi),
    lossOfPay: attendanceMoney.lossOfPay,
    unpaidLeaveDeduction: attendanceMoney.unpaidLeaveDeduction,
    advances: Number(extras.advances) || 0,
    loans: Number(extras.loans) || 0,
    otherDeductions: structure.otherDeductions || [],
  };

  const lopDays =
    unpaidLeaveDays + (Number(attendanceAdjustment.extraLopDays) || 0);

  return {
    earnings,
    deductions,
    attendanceAdjustment,
    perDaySalary,
    lopDays,
    engineOverrides: {
      bonus: earnings.bonus,
      overtime: earnings.overtime,
      arrears: earnings.arrears,
      reimbursements: earnings.reimbursements,
      incentives: earnings.incentives,
      advances: deductions.advances,
      loans: deductions.loans,
      lossOfPay: deductions.lossOfPay,
      lopDays,
    },
  };
}
