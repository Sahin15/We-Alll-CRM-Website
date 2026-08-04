import LeaveRequest from "../models/leaveRequestModel.js";
import WorkingDaysCalculator from "./workingDaysCalculator.js";
import { isLeaveTypePaid } from "./payroll/leaveImpactCodes.js";

class LeaveImpactCalculator {
  constructor() {
    this.workingDaysCalculator = new WorkingDaysCalculator();
  }

  /**
   * Calculate leave deduction for an employee in a specific month
   * Rules:
   * - Approved leave (any type) = PAID, no deduction
   * - Absent days (no clock-in, not on approved leave) = DEDUCTION
   * - Unpaid leave explicitly requested = DEDUCTION
   */
  async calculateLeaveDeduction(employeeId, month, year, salaryStructure) {
    try {
      const workingDaysResult = await this.workingDaysCalculator.getWorkingDays(month, year);
      const actualWorkingDays = workingDaysResult.workingDays;

      // Per-day salary = gross / 30 (fixed, used ONLY for deductions)
      // Total salary is always the same regardless of working days in the month
      const grossSalary = salaryStructure.grossSalary || 0;
      const perDaySalary = grossSalary / 30;

      // Get all APPROVED leave records for the month
      const leaveRecords = await this.getLeaveRecordsForMonth(employeeId, month, year);

      // Build a set of dates covered by approved leaves
      const approvedLeaveDates = new Set();
      let totalPaidLeaves = 0;

      for (const leave of leaveRecords) {
        const leaveDays = this.calculateLeaveDaysInMonth(leave, month, year);
        totalPaidLeaves += leaveDays;

        // Mark each date as covered by approved leave
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        const leaveStart = new Date(Math.max(new Date(leave.startDate), monthStart));
        const leaveEnd = new Date(Math.min(new Date(leave.endDate), monthEnd));

        for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
          approvedLeaveDates.add(d.toDateString());
        }
      }

      // Get attendance records for the month to find absent days
      const Attendance = (await import("../models/attendanceModel.js")).default;
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      // Only count absences up to today if generating for current month
      const today = new Date();
      const effectiveEnd = monthEnd < today ? monthEnd : today;
      const isPartialMonth = effectiveEnd < monthEnd;

      const attendanceRecords = await Attendance.find({
        employee: employeeId,
        date: { $gte: monthStart, $lte: effectiveEnd }
      });

      // PH-02: status matters — a row with status "absent" is unpaid, not present
      const attendanceStatusByDate = new Map();
      for (const record of attendanceRecords) {
        const dateStr = new Date(record.date).toDateString();
        attendanceStatusByDate.set(dateStr, record.status || "present");
      }

      // Count absent days: no record, OR record marked absent (and not on approved leave)
      let absentDays = 0;
      const absentDates = [];
      let effectiveWorkingDays = 0; // Working days up to effectiveEnd (may be less than full month)

      // Build a set of Saturday dates that are non-working (from workingDaysResult)
      // For 5-day work pattern, all Saturdays are off; for 6-day, none are.
      const nonWorkingSaturdayDates = new Set(
        (workingDaysResult.breakdown?.saturdays || []).map(d => new Date(d).toDateString())
      );

      for (let d = new Date(monthStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toDateString();

        // Skip Sundays (always off)
        if (dayOfWeek === 0) continue;

        // Skip Saturdays that are non-working days (respects 5-day vs 6-day work pattern)
        if (dayOfWeek === 6 && nonWorkingSaturdayDates.has(dateStr)) continue;

        // Skip holidays
        const isHoliday = workingDaysResult.holidayDates?.some(
          hd => new Date(hd).toDateString() === dateStr
        );
        if (isHoliday) continue;

        // Skip if covered by approved leave
        if (approvedLeaveDates.has(dateStr)) continue;

        // This is a working day within the effective period
        effectiveWorkingDays++;

        const status = attendanceStatusByDate.get(dateStr);
        // Missing punch, or explicit absent status → LOP day
        if (status == null || status === "absent") {
          absentDays++;
          absentDates.push(new Date(d));
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
   * Get leave records that affect a specific month
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Array} Array of leave records
   */
  async getLeaveRecordsForMonth(employeeId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

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
   * Calculate how many leave days fall within a specific month
   * @param {Object} leave - Leave record
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {number} Number of leave days in the month
   */
  calculateLeaveDaysInMonth(leave, month, year) {
    try {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);

      // Determine the overlap period
      const overlapStart = new Date(Math.max(monthStart.getTime(), leaveStart.getTime()));
      const overlapEnd = new Date(Math.min(monthEnd.getTime(), leaveEnd.getTime()));

      // If no overlap, return 0
      if (overlapStart > overlapEnd) {
        return 0;
      }

      // Calculate days in overlap period
      const timeDiff = overlapEnd.getTime() - overlapStart.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

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