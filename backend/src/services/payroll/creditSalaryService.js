import SalarySlip from "../../models/salarySlipModel.js";
import SalaryStructure from "../../models/salaryStructureModel.js";
import SalaryPreview from "../../models/salaryPreviewModel.js";
import User from "../../models/userModel.js";
import WorkingDaysCalculator from "../workingDaysCalculator.js";
import LeaveImpactCalculator from "../leaveImpactCalculator.js";
import notificationService from "../notificationService.js";
import { buildStandardGenerateSlipMoney } from "./generatePayrollMoneyPolicy.js";
import { assertNonNegativeNetFromMaps } from "./negativeNetGuard.js";
import { assertPeriodAllows } from "./payrollPeriodGates.js";
import {
  isSimplePayrollStructure,
  buildSimpleSlipPayload,
} from "./simpleSlipPersist.js";
import {
  ensurePayrollPeriod,
  parseSalaryPaymentDate,
} from "./payrollPeriodPaymentDate.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * @param {number} month
 * @returns {string}
 */
export function getMonthName(month) {
  return MONTH_NAMES[month - 1] || "Unknown";
}

/**
 * @param {object} preview
 * @returns {{ earnings: object, deductions: object, previewId: string, attendance: object }|null}
 */
export function slipPayloadFromPreview(preview) {
  if (!preview?.salaryBreakdown?.earnings || !preview?.salaryBreakdown?.deductions) {
    return null;
  }

  const wd = preview.workingDaysBreakdown || {};
  const leave = preview.leaveImpact || {};
  const workingDays =
    wd.workingDays ?? wd.actualWorkingDays ?? wd.effectiveWorkingDays ?? 26;
  const unpaid = leave.unpaidLeaves ?? 0;

  const attendance = {
    totalWorkingDays: workingDays,
    daysWorked: Math.max(0, workingDays - unpaid),
    daysAbsent: unpaid,
    paidLeaves: leave.paidLeaves ?? 0,
    unpaidLeaves: unpaid,
    workingDaysCalculation: preview.workingDaysBreakdown || {
      method: "preview",
      actualWorkingDays: workingDays,
    },
    leaveImpactDetails: preview.leaveImpact || {},
  };

  return {
    earnings: preview.salaryBreakdown.earnings,
    deductions: preview.salaryBreakdown.deductions,
    previewId: preview._id,
    attendance,
    simpleMeta: preview.payrollMode === "simple" ? { payrollMode: "simple" } : null,
  };
}

/**
 * @param {string} employeeId
 * @param {number} month
 * @param {number} year
 * @returns {Promise<object>}
 */
async function calculateAttendanceForCredit(employeeId, month, year) {
  try {
    const workingDaysCalc = new WorkingDaysCalculator();
    const leaveImpactCalc = new LeaveImpactCalculator();
    const employee = await User.findById(employeeId).populate("department");
    const departmentId = employee?.department?._id || null;
    const workingDaysResult = await workingDaysCalc.getWorkingDays(
      month,
      year,
      departmentId
    );
    const salaryStructure = await SalaryStructure.getActiveStructure(employeeId);
    if (!salaryStructure) {
      throw new Error("No active salary structure found for employee");
    }
    const leaveImpactResult = await leaveImpactCalc.calculateLeaveDeduction(
      employeeId,
      month,
      year,
      salaryStructure
    );
    const effectiveWorkingDays =
      leaveImpactResult.effectiveWorkingDays ?? workingDaysResult.workingDays;
    const daysWorked = effectiveWorkingDays - leaveImpactResult.unpaidLeaves;

    return {
      workingDaysCalculation: {
        method: "dynamic",
        totalCalendarDays: workingDaysResult.totalDays,
        weekends: workingDaysResult.weekends,
        holidays: workingDaysResult.holidays,
        actualWorkingDays: workingDaysResult.workingDays,
        effectiveWorkingDays,
        holidayDates: workingDaysResult.holidayDates || [],
      },
      leaveImpactDetails: {
        perDaySalary: leaveImpactResult.perDaySalary,
        leaveBreakdown: leaveImpactResult.leaveBreakdown,
        totalLeaveDeduction: leaveImpactResult.deductionAmount,
      },
      totalWorkingDays: effectiveWorkingDays,
      daysWorked: Math.max(0, daysWorked),
      daysAbsent: leaveImpactResult.unpaidLeaves,
      paidLeaves: leaveImpactResult.paidLeaves,
      unpaidLeaves: leaveImpactResult.unpaidLeaves,
    };
  } catch (error) {
    return {
      totalWorkingDays: 26,
      daysWorked: 26,
      daysAbsent: 0,
      paidLeaves: 0,
      unpaidLeaves: 0,
      workingDaysCalculation: { method: "fallback", actualWorkingDays: 26 },
      leaveImpactDetails: {},
    };
  }
}

/**
 * Credit salary / generate payslips for selected employees.
 *
 * @param {object} options
 * @param {number} options.month
 * @param {number} options.year
 * @param {string[]} options.employeeIds
 * @param {string|Date} options.paymentDate
 * @param {string} options.creditedBy
 * @param {boolean} [options.regenerate]
 * @returns {Promise<{
 *   success: object[],
 *   failed: object[],
 *   skipped: object[],
 *   paymentDate: Date,
 *   period: object
 * }>}
 */
export async function creditSalaryForEmployees({
  month,
  year,
  employeeIds,
  paymentDate: paymentDateInput,
  creditedBy,
  regenerate = false,
}) {
  const m = Number(month);
  const y = Number(year);
  const paymentDate = parseSalaryPaymentDate(paymentDateInput);

  if (!paymentDate) {
    const err = new Error("paymentDate is required");
    err.code = "INVALID_PAYMENT_DATE";
    throw err;
  }

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    const err = new Error("At least one employee is required");
    err.code = "EMPLOYEES_REQUIRED";
    throw err;
  }

  await assertPeriodAllows("generate", y, m);

  const success = [];
  const failed = [];
  const skipped = [];

  for (const employeeId of employeeIds) {
    try {
      const existingSlip = await SalarySlip.findOne({
        employee: employeeId,
        month: m,
        year: y,
      });

      if (existingSlip && !regenerate) {
        const emp = await User.findById(employeeId).select("name employeeId");
        skipped.push({
          employeeId: emp?.employeeId,
          name: emp?.name,
          reason: "Payslip already exists for this period",
          slipId: existingSlip._id,
        });
        continue;
      }

      if (existingSlip && regenerate) {
        await SalarySlip.deleteOne({ _id: existingSlip._id });
      }

      const salaryStructure = await SalaryStructure.getActiveStructure(employeeId);
      if (!salaryStructure) {
        const emp = await User.findById(employeeId).select("name employeeId");
        failed.push({
          employeeId: emp?.employeeId,
          name: emp?.name,
          reason: "No active salary structure",
        });
        continue;
      }

      const preview = await SalaryPreview.findOne({
        employee: employeeId,
        month: m,
        year: y,
      }).lean();

      let earnings;
      let deductions;
      let simpleMeta = null;
      let previewId = null;
      let attendance;

      const fromPreview = preview ? slipPayloadFromPreview(preview) : null;
      if (fromPreview) {
        earnings = fromPreview.earnings;
        deductions = fromPreview.deductions;
        previewId = fromPreview.previewId;
        attendance = fromPreview.attendance;
        simpleMeta = fromPreview.simpleMeta;
      } else if (isSimplePayrollStructure(salaryStructure)) {
        const simplePayload = await buildSimpleSlipPayload({
          structure: salaryStructure,
          employeeId,
          month: m,
          year: y,
          lossOfPay: 0,
          extras: {},
        });
        earnings = simplePayload.earnings;
        deductions = simplePayload.deductions;
        simpleMeta = simplePayload.simpleMeta;
        attendance = await calculateAttendanceForCredit(employeeId, m, y);
      } else {
        attendance = await calculateAttendanceForCredit(employeeId, m, y);
        const money = await buildStandardGenerateSlipMoney({
          employeeId,
          month: m,
          year: y,
          structure: salaryStructure,
          proRataData: { isProRata: false },
          attendance,
          extras: {},
        });
        earnings = money.earnings;
        deductions = money.deductions;
      }

      assertNonNegativeNetFromMaps(earnings, deductions);

      const ytd = await SalarySlip.calculateYTD(employeeId, y, m - 1);

      const salarySlip = await SalarySlip.create({
        employee: employeeId,
        salaryStructure: salaryStructure._id,
        month: m,
        year: y,
        payPeriod: `${getMonthName(m)} ${y}`,
        paymentDate,
        totalWorkingDays: attendance.totalWorkingDays,
        daysWorked: attendance.daysWorked,
        daysAbsent: attendance.daysAbsent,
        paidLeaves: attendance.paidLeaves,
        unpaidLeaves: attendance.unpaidLeaves,
        workingDaysCalculation: attendance.workingDaysCalculation,
        leaveImpactDetails: attendance.leaveImpactDetails,
        isProRata: false,
        proRataDetails: null,
        earnings,
        deductions,
        ytd,
        previewId: previewId || undefined,
        status: "generated",
        approvedBy: creditedBy,
        approvedAt: new Date(),
        notes: simpleMeta
          ? `[simple-payroll] credited net=${simpleMeta.netSalary ?? ""}`
          : "[payroll-credit]",
      });

      if (preview && previewId) {
        await SalaryPreview.updateOne(
          { _id: previewId },
          { $set: { finalSalarySlip: salarySlip._id } }
        );
      }

      const emp = await User.findById(employeeId).select("name employeeId");
      success.push({
        employeeId: emp?.employeeId,
        name: emp?.name,
        slipId: salarySlip._id,
      });

      try {
        await notificationService.sendSalarySlipNotification(employeeId, m, y, {
          slipId: salarySlip._id?.toString?.() || salarySlip._id,
          senderId: creditedBy,
        });
      } catch (notificationError) {
        console.error("[creditSalary] notification failed (non-blocking)", {
          employeeId,
          error: notificationError?.message,
        });
      }
    } catch (err) {
      const emp = await User.findById(employeeId).select("name employeeId");
      failed.push({
        employeeId: emp?.employeeId,
        name: emp?.name,
        reason: err.message,
        code: err.code,
      });
    }
  }

  const period = await ensurePayrollPeriod(y, m, creditedBy);
  period.salaryPaymentDate = paymentDate;
  period.salaryCreditedAt = new Date();
  period.salaryCreditedBy = creditedBy;
  await period.save();

  return {
    success,
    failed,
    skipped,
    paymentDate,
    period: period.toObject(),
  };
}
