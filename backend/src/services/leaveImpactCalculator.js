import LeaveRequest from "../models/leaveRequestModel.js";
import WorkingDaysCalculator from "./workingDaysCalculator.js";
import { isLeaveTypePaid } from "./payroll/leaveImpactCodes.js";
import {
  getCivilDayOfWeek,
  getISTDateKey,
  getISTMidnightForYmd,
  getMonthBoundsIST,
  getTodayISTDateKey,
  listDateKeysInclusive,
} from "../utils/timezone.js";

class LeaveImpactCalculator {
  constructor() {
    this.workingDaysCalculator = new WorkingDaysCalculator();
  }

  /**
   * Calculate leave deduction for an employee in a specific month.
   * All calendar matching uses Asia/Kolkata so UTC production matches IST localhost.
   *
   * Rules:
   * - Approved leave (any type) = PAID, no deduction
   * - Absent days (no clock-in, not on approved leave) = DEDUCTION
   * - Unpaid leave explicitly requested = DEDUCTION
   */
  async calculateLeaveDeduction(employeeId, month, year, salaryStructure) {
    try {
      const workingDaysResult = await this.workingDaysCalculator.getWorkingDays(month, year);
      const actualWorkingDays = workingDaysResult.workingDays;

      // PH-04: per-day from flat earnings gross when grossSalary missing/0
      // (generate path may recompute LOP on pro-rated persisted gross)
      const { computeFlatGross, computePerDaySalary } = await import(
        "./payroll/payrollCorrectnessHelpers.js"
      );
      const grossSalary =
        Number(salaryStructure.grossSalary) ||
        computeFlatGross(salaryStructure);
      const perDaySalary = computePerDaySalary(grossSalary, 30);

      const monthBounds = getMonthBoundsIST(year, month);
      const todayKey = getTodayISTDateKey();
      let effectiveEndKey = monthBounds.endKey;
      if (todayKey < monthBounds.startKey) {
        effectiveEndKey = null;
      } else if (todayKey < monthBounds.endKey) {
        effectiveEndKey = todayKey;
      }
      const isPartialMonth =
        Boolean(effectiveEndKey) && effectiveEndKey < monthBounds.endKey;

      // Get all APPROVED leave records for the month
      const leaveRecords = await this.getLeaveRecordsForMonth(employeeId, month, year);

      // Build a set of IST date keys covered by approved leaves
      const approvedLeaveDates = new Set();
      let totalPaidLeaves = 0;

      for (const leave of leaveRecords) {
        const leaveDays = this.calculateLeaveDaysInMonth(leave, month, year);
        totalPaidLeaves += leaveDays;

        const leaveStartKey = getISTDateKey(leave.startDate);
        const leaveEndKey = getISTDateKey(leave.endDate);
        const overlapStart =
          leaveStartKey > monthBounds.startKey
            ? leaveStartKey
            : monthBounds.startKey;
        const overlapEnd =
          leaveEndKey < monthBounds.endKey ? leaveEndKey : monthBounds.endKey;
        for (const key of listDateKeysInclusive(overlapStart, overlapEnd)) {
          approvedLeaveDates.add(key);
        }
      }

      // Get attendance records for the month (IST bounds — works on UTC VPS)
      const Attendance = (await import("../models/attendanceModel.js")).default;
      let attendanceEnd = monthBounds.end;
      if (effectiveEndKey) {
        const [ey, em, ed] = effectiveEndKey.split("-").map(Number);
        const next = new Date(Date.UTC(ey, em - 1, ed + 1));
        attendanceEnd = new Date(
          getISTMidnightForYmd(
            next.getUTCFullYear(),
            next.getUTCMonth() + 1,
            next.getUTCDate()
          ).getTime() - 1
        );
      }

      const attendanceRecords = effectiveEndKey
        ? await Attendance.find({
            employee: employeeId,
            date: { $gte: monthBounds.start, $lte: attendanceEnd },
          })
        : [];

      // PH-02: status matters — a row with status "absent" is unpaid, not present
      const attendanceStatusByDate = new Map();
      for (const record of attendanceRecords) {
        const dateKey = getISTDateKey(record.date);
        attendanceStatusByDate.set(dateKey, record.status || "present");
      }

      // Count absent days: no record, OR record marked absent (and not on approved leave)
      let absentDays = 0;
      const absentDates = [];
      let effectiveWorkingDays = 0;

      // Non-working Saturdays as IST keys (5-day pattern)
      const nonWorkingSaturdayDates = new Set(
        (workingDaysResult.breakdown?.saturdays || []).map((d) =>
          getISTDateKey(d)
        )
      );

      const holidayKeys = new Set(
        (workingDaysResult.holidayDates || []).map((hd) => getISTDateKey(hd))
      );

      const dayKeys = effectiveEndKey
        ? listDateKeysInclusive(monthBounds.startKey, effectiveEndKey)
        : [];

      for (const dateKey of dayKeys) {
        const dayOfWeek = getCivilDayOfWeek(dateKey);

        // Skip Sundays (always off)
        if (dayOfWeek === 0) continue;

        // Skip Saturdays that are non-working days (respects 5-day vs 6-day work pattern)
        if (dayOfWeek === 6 && nonWorkingSaturdayDates.has(dateKey)) continue;

        // Skip holidays
        if (holidayKeys.has(dateKey)) continue;

        // Skip if covered by approved leave
        if (approvedLeaveDates.has(dateKey)) continue;

        // This is a working day within the effective period
        effectiveWorkingDays++;

        const status = attendanceStatusByDate.get(dateKey);
        // Missing punch, or explicit absent status → LOP day
        if (status == null || status === "absent") {
          absentDays++;
          const [ay, am, ad] = dateKey.split("-").map(Number);
          absentDates.push(getISTMidnightForYmd(ay, am, ad));
        }
      }

      // Also count explicitly unpaid leaves
      let explicitUnpaidLeaves = 0;
      const unpaidLeaveBreakdown = [];

      for (const leave of leaveRecords) {
        if (!this.isLeaveTypePaid(leave.leaveType)) {
          const days = this.calculateLeaveDaysInMonth(leave, month, year);
          explicitUnpaidLeaves += days;
          unpaidLeaveBreakdown.push({
            leaveId: leave._id,
            leaveType: leave.leaveType,
            days,
            isPaid: false,
            deductionAmount: Math.round(days * perDaySalary)
          });
        }
      }

      const totalUnpaidDays = absentDays + explicitUnpaidLeaves;
      const totalDeductionAmount = Math.round(totalUnpaidDays * perDaySalary);

      const leaveBreakdown = [
        // Paid approved leaves
        ...leaveRecords
          .filter(l => this.isLeaveTypePaid(l.leaveType))
          .map(l => ({
            leaveId: l._id,
            leaveType: l.leaveType,
            days: this.calculateLeaveDaysInMonth(l, month, year),
            isPaid: true,
            deductionAmount: 0
          })),
        // Unpaid leaves
        ...unpaidLeaveBreakdown,
        // Absent days
        ...(absentDays > 0 ? [{
          leaveType: 'absent',
          days: absentDays,
          isPaid: false,
          deductionAmount: Math.round(absentDays * perDaySalary),
          absentDates
        }] : [])
      ];

      return {
        paidLeaves: totalPaidLeaves,
        unpaidLeaves: totalUnpaidDays,
        perDaySalary: Math.round(perDaySalary),
        deductionAmount: totalDeductionAmount,
        leaveBreakdown,
        workingDays: actualWorkingDays,
        effectiveWorkingDays, // Working days up to effectiveEnd (used for daysWorked display)
        isPartialMonth,       // True if salary generated before month ended
        absentDays,
        calculationMethod: "approved_leave_paid_absent_deducted"
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leave records that affect a specific month (IST month bounds).
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Array} Array of leave records
   */
  async getLeaveRecordsForMonth(employeeId, month, year) {
    try {
      const { start: startDate, end: endDate } = getMonthBoundsIST(year, month);

      const leaves = await LeaveRequest.find({
        employee: employeeId,
        status: "approved",
        $or: [
          // Leave starts in this month
          {
            startDate: { $gte: startDate, $lte: endDate }
          },
          // Leave ends in this month
          {
            endDate: { $gte: startDate, $lte: endDate }
          },
          // Leave spans across this month
          {
            startDate: { $lte: startDate },
            endDate: { $gte: endDate }
          }
        ]
      }).populate("employee", "name employeeId");

      return leaves;
    } catch (error) {
      
      return []; // Return empty array on error to prevent calculation failure
    }
  }

  /**
   * Calculate how many leave days fall within a specific month (IST calendar).
   * @param {Object} leave - Leave record
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {number} Number of leave days in the month
   */
  calculateLeaveDaysInMonth(leave, month, year) {
    try {
      const { startKey, endKey } = getMonthBoundsIST(year, month);
      const leaveStartKey = getISTDateKey(leave.startDate);
      const leaveEndKey = getISTDateKey(leave.endDate);

      const overlapStart =
        leaveStartKey > startKey ? leaveStartKey : startKey;
      const overlapEnd = leaveEndKey < endKey ? leaveEndKey : endKey;
      const keys = listDateKeysInclusive(overlapStart, overlapEnd);
      const daysDiff = keys.length;

      if (daysDiff <= 0) {
        return 0;
      }

      // Handle half-day leaves
      if (leave.isHalfDay) {
        return daysDiff * 0.5;
      }

      return daysDiff;
    } catch (error) {
      
      return 0;
    }
  }

  /**
   * Determine if a leave type is paid or unpaid.
   * Delegates to shared leave impact codes (Milestone 5).
   */
  isLeaveTypePaid(leaveType) {
    return isLeaveTypePaid(leaveType);
  }

  /**
   * Calculate proportional salary based on actual days worked
   * @param {number} baseSalary - Base monthly salary
   * @param {number} workingDays - Total working days in month
   * @param {number} daysWorked - Actual days worked
   * @returns {number} Proportional salary
   */
  calculateProportionalSalary(baseSalary, workingDays, daysWorked) {
    try {
      if (workingDays <= 0) {
        return 0;
      }

      const perDaySalary = baseSalary / workingDays;
      const proportionalSalary = perDaySalary * daysWorked;

      return Math.round(proportionalSalary);
    } catch (error) {
      
      return baseSalary; // Return full salary on error
    }
  }

  /**
   * Generate detailed leave impact report
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {Object} salaryStructure - Employee's salary structure
   * @returns {Object} Detailed leave impact report
   */
  async generateLeaveImpactReport(employeeId, month, year, salaryStructure) {
    try {
      const leaveImpact = await this.calculateLeaveDeduction(employeeId, month, year, salaryStructure);
      const workingDaysResult = await this.workingDaysCalculator.getWorkingDays(month, year);

      const report = {
        employee: employeeId,
        period: {
          month,
          year,
          monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' })
        },
        workingDaysInfo: {
          totalCalendarDays: workingDaysResult.totalDays,
          weekends: workingDaysResult.weekends,
          holidays: workingDaysResult.holidays,
          workingDays: workingDaysResult.workingDays
        },
        salaryInfo: {
          grossSalary: salaryStructure.grossSalary,
          perDaySalary: leaveImpact.perDaySalary
        },
        leaveImpact: {
          totalLeaves: leaveImpact.paidLeaves + leaveImpact.unpaidLeaves,
          paidLeaves: leaveImpact.paidLeaves,
          unpaidLeaves: leaveImpact.unpaidLeaves,
          deductionAmount: leaveImpact.deductionAmount,
          leaveBreakdown: leaveImpact.leaveBreakdown
        },
        attendanceCalculation: {
          daysWorked: workingDaysResult.workingDays - leaveImpact.unpaidLeaves,
          attendancePercentage: workingDaysResult.workingDays > 0 
            ? Math.round(((workingDaysResult.workingDays - leaveImpact.unpaidLeaves) / workingDaysResult.workingDays) * 100)
            : 100
        },
        generatedAt: new Date()
      };

      return report;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Bulk calculate leave impact for multiple employees
   * @param {Array} employees - Array of {employeeId, salaryStructure} objects
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Array} Array of leave impact results
   */
  async bulkCalculateLeaveImpact(employees, month, year) {
    try {
      const results = [];

      for (const emp of employees) {
        try {
          const leaveImpact = await this.calculateLeaveDeduction(
            emp.employeeId,
            month,
            year,
            emp.salaryStructure
          );

          results.push({
            employeeId: emp.employeeId,
            ...leaveImpact,
            success: true
          });
        } catch (error) {
          results.push({
            employeeId: emp.employeeId,
            error: error.message,
            success: false
          });
        }
      }

      return results;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Validate leave impact calculation
   * @param {Object} result - Calculation result
   * @returns {boolean} True if valid
   */
  validateCalculation(result) {
    if (!result || typeof result !== 'object') {
      return false;
    }

    const required = ['paidLeaves', 'unpaidLeaves', 'perDaySalary', 'deductionAmount'];
    for (const field of required) {
      if (typeof result[field] !== 'number' || result[field] < 0) {
        return false;
      }
    }

    // Deduction should be consistent with unpaid leaves and per-day salary
    const expectedDeduction = result.unpaidLeaves * result.perDaySalary;
    const actualDeduction = result.deductionAmount;
    const tolerance = 1; // Allow 1 rupee tolerance for rounding

    if (Math.abs(expectedDeduction - actualDeduction) > tolerance) {
      return false;
    }

    return true;
  }

  /**
   * Get leave balance for an employee
   * @param {string} employeeId - Employee ID
   * @param {number} year - Year
   * @returns {Object} Leave balance information
   */
  async getLeaveBalance(employeeId, year) {
    try {
      // This would typically integrate with a leave balance system
      // For now, return a basic structure
      const usedLeaves = await LeaveRequest.aggregate([
        {
          $match: {
            employee: employeeId,
            status: "approved",
            $expr: {
              $eq: [{ $year: "$startDate" }, year]
            }
          }
        },
        {
          $group: {
            _id: "$leaveType",
            totalDays: { $sum: "$numberOfDays" }
          }
        }
      ]);

      return {
        year,
        usedLeaves,
        // Add more leave balance logic here based on company policy
      };
    } catch (error) {
      
      throw error;
    }
  }
}

export default LeaveImpactCalculator;