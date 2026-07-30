import LeaveRequest from "../../models/leaveRequestModel.js";
import SalaryStructure from "../../models/salaryStructureModel.js";
import LeaveImpactCalculator from "../leaveImpactCalculator.js";
import { getLeaveDayCount } from "../../constants/leaveTypes.js";

function toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function groupConsecutiveDates(dates) {
  if (!dates?.length) return [];

  const sorted = [...dates]
    .map(toDateOnly)
    .sort((a, b) => a.getTime() - b.getTime());

  const groups = [];
  let groupStart = sorted[0];
  let groupEnd = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

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

  const dates = (preferredDates || []).map(toDateOnly).slice(0, targetDays);
  const used = new Set(dates.map((d) => d.toDateString()));

  if (dates.length >= targetDays) {
    return dates.slice(0, targetDays);
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  for (
    let d = new Date(monthStart);
    d <= monthEnd && dates.length < targetDays;
    d.setDate(d.getDate() + 1)
  ) {
    if (d.getDay() === 0) continue;
    const key = d.toDateString();
    if (used.has(key)) continue;
    dates.push(new Date(d));
    used.add(key);
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

  for (const group of groups) {
    const leave = await LeaveRequest.create({
      employee: employeeId,
      leaveType: "casual",
      startDate: group.start,
      endDate: group.end,
      reason:
        reason ||
        `${payrollTag} Earned leave balance deducted instead of salary for absent day(s)`,
      status: "approved",
      approvedBy,
      approvedDate: new Date(),
      leaveYear: year,
      numberOfDays: getLeaveDayCount("casual", group.start, group.end),
    });
    createdLeaveIds.push(leave._id);
  }

  const actualDays = datesToCover.length;

  return {
    createdLeaveIds,
    daysDeducted: actualDays,
  };
}

export async function reverseLeaveBalanceDeduction({ createdLeaveIds = [] }) {
  if (!createdLeaveIds.length) return;
  await LeaveRequest.deleteMany({ _id: { $in: createdLeaveIds } });
}
