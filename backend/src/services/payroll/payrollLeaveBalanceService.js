import LeaveRequest from "../../models/leaveRequestModel.js";
import SalaryStructure from "../../models/salaryStructureModel.js";
import LeaveImpactCalculator from "../leaveImpactCalculator.js";
import { getLeaveDayCount } from "../../constants/leaveTypes.js";
import {
  getISTDateKey,
  getISTMidnightForYmd,
} from "../../utils/timezone.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {Date|string} date
 * @returns {string} YYYY-MM-DD in IST
 */
function toYmd(date) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date.trim())) {
    return date.trim().slice(0, 10);
  }
  return getISTDateKey(date);
}

/**
 * @param {string} ymd
 * @returns {Date}
 */
function midnightFromYmd(ymd) {
  const [year, month, day] = ymd.split("-").map(Number);
  return getISTMidnightForYmd(year, month, day);
}

export function groupConsecutiveDates(dates) {
  if (!dates?.length) return [];

  const sorted = [...dates]
    .map((d) => midnightFromYmd(toYmd(d)))
    .sort((a, b) => a.getTime() - b.getTime());

  const groups = [];
  let groupStart = sorted[0];
  let groupEnd = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const diffDays = (curr.getTime() - prev.getTime()) / DAY_MS;

    if (diffDays === 1) {
      groupEnd = curr;
    } else {
      groups.push({ start: new Date(groupStart), end: new Date(groupEnd) });
      groupStart = curr;
      groupEnd = curr;
    }
  }

  groups.push({ start: new Date(groupStart), end: new Date(groupEnd) });
  return groups;
}

/** Pick dates for payroll leave deduction — prefer absent dates, then working days in month. */
export function resolveDatesForLeaveDeduction(month, year, days, preferredDates = []) {
  const targetDays = Number(days);
  if (!(targetDays > 0)) return [];

  const dates = [];
  const used = new Set();

  for (const raw of preferredDates || []) {
    if (dates.length >= targetDays) break;
    const ymd = toYmd(raw);
    if (!ymd || used.has(ymd)) continue;
    used.add(ymd);
    dates.push(midnightFromYmd(ymd));
  }

  if (dates.length >= targetDays) {
    return dates.slice(0, targetDays);
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= lastDay && dates.length < targetDays; day += 1) {
    const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday === 0) continue;
    if (used.has(ymd)) continue;
    used.add(ymd);
    dates.push(midnightFromYmd(ymd));
  }

  return dates.slice(0, targetDays);
}

export async function getPayrollAbsentContext(employeeId, month, year) {
  const structure = await SalaryStructure.findOne({
    employee: employeeId,
    status: "active",
  }).lean();

  const monthly =
    structure?.payrollMode === "simple" && structure?.monthlySalary != null
      ? Number(structure.monthlySalary)
      : Number(structure?.grossSalary || structure?.basicSalary) || 0;

  const calc = new LeaveImpactCalculator();
  const impact = await calc.calculateLeaveDeduction(employeeId, month, year, {
    ...structure,
    grossSalary: monthly,
  });

  const absentEntry = impact.leaveBreakdown?.find((b) => b.leaveType === "absent");
  const absentDates = (absentEntry?.absentDates || []).map((d) => new Date(d));
  const absentDays = Number(impact.absentDays) || 0;

  const balance = await LeaveRequest.getLeaveBalance(employeeId, year);
  const remaining = balance.eligibleForPaidLeave ? balance.earned.remaining : 0;
  const coverableDays = Math.min(absentDays, remaining);

  return {
    absentDays,
    absentDates,
    coverableDays,
    maxLeaveDeductible: remaining,
    balance,
    perDaySalary: impact.perDaySalary,
  };
}

/**
 * Mark attendance as on-leave for payroll-covered dates (IST midnight).
 * @returns {Promise<Array<{ attendanceId: string, date: string, previousStatus: string|null, created: boolean }>>}
 */
export async function markAttendanceOnLeaveForDates({
  employeeId,
  dates,
  leaveType = "casual",
  approvedBy,
  notes,
}) {
  const Attendance = (await import("../../models/attendanceModel.js")).default;
  const snapshots = [];

  for (const date of dates) {
    const ymd = toYmd(date);
    const istMidnight = midnightFromYmd(ymd);
    const nextMidnight = new Date(istMidnight.getTime() + DAY_MS);

    const existing = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: istMidnight, $lt: nextMidnight },
    });

    if (!existing) {
      const created = await Attendance.create({
        employee: employeeId,
        date: istMidnight,
        status: "on-leave",
        workHours: 0,
        overtime: 0,
        notes,
        approvedBy,
        isManuallyModified: true,
        originalStatus: "on-leave",
      });
      snapshots.push({
        attendanceId: created._id,
        date: ymd,
        previousStatus: null,
        created: true,
      });
      continue;
    }

    if (existing.status === "on-leave") {
      snapshots.push({
        attendanceId: existing._id,
        date: ymd,
        previousStatus: "on-leave",
        created: false,
      });
      continue;
    }

    await Attendance.findByIdAndUpdate(existing._id, {
      status: "on-leave",
      clockIn: undefined,
      clockOut: undefined,
      workHours: 0,
      overtime: 0,
      breaks: [],
      totalBreakTime: 0,
      notes: notes || `On ${leaveType} leave`,
      approvedBy,
      isManuallyModified: true,
      originalStatus: existing.status || "absent",
    });

    snapshots.push({
      attendanceId: existing._id,
      date: ymd,
      previousStatus: existing.status || "absent",
      created: false,
    });
  }

  return snapshots;
}

/**
 * Create approved casual leave records for payroll-covered absent days.
 * Deducts from earned leave balance via the normal leave approval path.
 */
export async function applyLeaveBalanceDeduction({
  employeeId,
  month,
  year,
  days,
  absentDates = [],
  approvedBy,
  reason,
}) {
  const balance = await LeaveRequest.getLeaveBalance(employeeId, year);

  if (!balance.eligibleForPaidLeave) {
    throw new Error(
      "Employee is not eligible for paid leave. Only full-time employees have an earned leave balance."
    );
  }

  const daysToDeduct = Number(days);
  if (!(daysToDeduct > 0)) {
    throw new Error("At least one leave day is required");
  }

  if (balance.earned.remaining < daysToDeduct) {
    throw new Error(
      `Insufficient earned leave balance. Available: ${balance.earned.remaining} days, Requested: ${daysToDeduct} days`
    );
  }

  const datesToCover = resolveDatesForLeaveDeduction(
    month,
    year,
    daysToDeduct,
    absentDates
  );

  if (datesToCover.length < daysToDeduct) {
    throw new Error(
      `Could not assign ${daysToDeduct} day(s) in ${month}/${year}. Try fewer days.`
    );
  }

  const groups = groupConsecutiveDates(datesToCover);
  const createdLeaveIds = [];
  const payrollTag = `[Payroll ${month}/${year}]`;
  const notes =
    reason ||
    `${payrollTag} Earned leave balance deducted instead of salary for absent day(s)`;

  for (const group of groups) {
    const leave = await LeaveRequest.create({
      employee: employeeId,
      leaveType: "casual",
      startDate: group.start,
      endDate: group.end,
      reason: notes,
      status: "approved",
      approvedBy,
      approvedDate: new Date(),
      leaveYear: year,
      source: "payroll",
      numberOfDays: getLeaveDayCount("casual", group.start, group.end),
    });
    createdLeaveIds.push(leave._id);
  }

  const attendanceSnapshots = await markAttendanceOnLeaveForDates({
    employeeId,
    dates: datesToCover,
    leaveType: "casual",
    approvedBy,
    notes,
  });

  return {
    createdLeaveIds,
    daysDeducted: datesToCover.length,
    attendanceSnapshots,
  };
}

export async function reverseLeaveBalanceDeduction({
  createdLeaveIds = [],
  attendanceSnapshots = [],
}) {
  if (createdLeaveIds.length) {
    await LeaveRequest.deleteMany({ _id: { $in: createdLeaveIds } });
  }

  if (!attendanceSnapshots.length) return;

  const Attendance = (await import("../../models/attendanceModel.js")).default;
  for (const snap of attendanceSnapshots) {
    if (!snap?.attendanceId) continue;
    if (snap.created) {
      await Attendance.findByIdAndDelete(snap.attendanceId);
      continue;
    }
    if (snap.previousStatus && snap.previousStatus !== "on-leave") {
      await Attendance.findByIdAndUpdate(snap.attendanceId, {
        status: snap.previousStatus,
        isManuallyModified: true,
      });
    }
  }
}
