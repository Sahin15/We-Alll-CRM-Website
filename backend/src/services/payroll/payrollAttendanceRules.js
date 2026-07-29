/**
 * Attendance → payroll adjustment rules (Milestone 5).
 * Pure helpers — no DB. Overtime / late / half-day → pay impacts.
 */

import { evaluateFormula } from "./formula/formulaEngine.js";

/** @typedef {object} AttendancePayRules */

export const DEFAULT_ATTENDANCE_PAY_RULES = Object.freeze({
  /** Standard daily work hours before auto-OT accrues on attendance records */
  standardWorkHours: 8,
  /** Days in month used for hourly rate from monthly gross */
  daysInPeriod: 30,
  /** OT pay = hourlyRate * hours * multiplier */
  overtimeMultiplier: 1.5,
  /**
   * When true, each attendance status "late" adds lateDeductionFraction of a day to LOP days.
   * Default false — late is tracked but does not auto-deduct (company can enable).
   */
  applyLateDeduction: false,
  lateDeductionFraction: 0.25,
  /** Half-day attendance adds this fraction to LOP days when applyHalfDayDeduction is true */
  applyHalfDayDeduction: true,
  halfDayDeductionFraction: 0.5,
});

/**
 * Hourly rate from monthly gross.
 * @param {number} grossSalary
 * @param {AttendancePayRules} [rules]
 * @returns {number}
 */
export function getHourlyRate(grossSalary, rules = DEFAULT_ATTENDANCE_PAY_RULES) {
  const days = Number(rules.daysInPeriod) || 30;
  const hours = Number(rules.standardWorkHours) || 8;
  const gross = Number(grossSalary) || 0;
  if (days <= 0 || hours <= 0) return 0;
  return gross / (days * hours);
}

/**
 * Overtime pay from hours.
 * @param {{ grossSalary: number, overtimeHours: number, rules?: object }} params
 * @returns {number} rounded rupees
 */
export function calculateOvertimePay(params) {
  const rules = { ...DEFAULT_ATTENDANCE_PAY_RULES, ...(params.rules || {}) };
  const hours = Number(params.overtimeHours) || 0;
  if (hours <= 0) return 0;

  const hourly = getHourlyRate(params.grossSalary, rules);
  const multiplier = Number(rules.overtimeMultiplier) || 1;
  return Math.round(hourly * hours * multiplier);
}

/**
 * Summarize attendance records for payroll (pure).
 * Expects plain objects with status, overtime, totalManualOvertime, totalWorkHours, workHours.
 *
 * @param {Array<object>} attendanceRecords
 * @param {object} [rules]
 * @returns {object}
 */
export function summarizeAttendanceForPayroll(
  attendanceRecords = [],
  rules = DEFAULT_ATTENDANCE_PAY_RULES
) {
  const cfg = { ...DEFAULT_ATTENDANCE_PAY_RULES, ...rules };

  let lateDays = 0;
  let halfDayDays = 0;
  let presentDays = 0;
  let absentMarkedDays = 0;
  let onLeaveDays = 0;
  let overtimeHours = 0;

  for (const record of attendanceRecords) {
    const status = String(record.status || "").toLowerCase();
    if (status === "late") lateDays += 1;
    else if (status === "half-day") halfDayDays += 1;
    else if (status === "present") presentDays += 1;
    else if (status === "absent") absentMarkedDays += 1;
    else if (status === "on-leave") onLeaveDays += 1;

    const autoOt = Number(record.overtime) || 0;
    const manualOt = Number(record.totalManualOvertime) || 0;
    overtimeHours += autoOt + manualOt;
  }

  overtimeHours = Math.round(overtimeHours * 100) / 100;

  let extraLopDays = 0;
  if (cfg.applyLateDeduction && lateDays > 0) {
    extraLopDays += lateDays * (Number(cfg.lateDeductionFraction) || 0);
  }
  if (cfg.applyHalfDayDeduction && halfDayDays > 0) {
    extraLopDays += halfDayDays * (Number(cfg.halfDayDeductionFraction) || 0);
  }
  extraLopDays = Math.round(extraLopDays * 100) / 100;

  return {
    lateDays,
    halfDayDays,
    presentDays,
    absentMarkedDays,
    onLeaveDays,
    overtimeHours,
    extraLopDays,
    rulesApplied: {
      applyLateDeduction: cfg.applyLateDeduction,
      applyHalfDayDeduction: cfg.applyHalfDayDeduction,
      overtimeMultiplier: cfg.overtimeMultiplier,
      standardWorkHours: cfg.standardWorkHours,
    },
  };
}

/**
 * Build payroll overrides derived from attendance summary + gross.
 *
 * @param {object} params
 * @param {number} params.grossSalary
 * @param {object} params.summary - from summarizeAttendanceForPayroll
 * @param {number} [params.perDaySalary]
 * @param {object} [params.rules]
 */
export function buildAttendancePayrollAdjustments(params) {
  const rules = { ...DEFAULT_ATTENDANCE_PAY_RULES, ...(params.rules || {}) };
  const summary = params.summary || {};
  const grossSalary = Number(params.grossSalary) || 0;
  const perDaySalary =
    params.perDaySalary != null
      ? Number(params.perDaySalary)
      : grossSalary / (Number(rules.daysInPeriod) || 30);

  const overtimePay = calculateOvertimePay({
    grossSalary,
    overtimeHours: summary.overtimeHours || 0,
    rules,
  });

  const extraLopDays = Number(summary.extraLopDays) || 0;
  const lateHalfDayDeduction = Math.round(extraLopDays * perDaySalary);

  // Optional formula path for OT (same result when multiplier/hourly match)
  const otViaFormula =
    summary.overtimeHours > 0
      ? Math.round(
          evaluateFormula(
            "round(GROSS / DAYS_IN_PERIOD / STANDARD_HOURS * OT_HOURS * OT_MULTIPLIER)",
            {
              GROSS: grossSalary,
              DAYS_IN_PERIOD: Number(rules.daysInPeriod) || 30,
              STANDARD_HOURS: Number(rules.standardWorkHours) || 8,
              OT_HOURS: Number(summary.overtimeHours) || 0,
              OT_MULTIPLIER: Number(rules.overtimeMultiplier) || 1,
            }
          )
        )
      : 0;

  return {
    overtimePay,
    overtimePayFormulaCheck: otViaFormula,
    overtimeHours: Number(summary.overtimeHours) || 0,
    extraLopDays,
    lateHalfDayDeduction,
    summary,
  };
}
