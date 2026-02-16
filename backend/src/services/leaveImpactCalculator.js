import LeaveRequest from "../models/leaveRequestModel.js";
import WorkingDaysCalculator from "./workingDaysCalculator.js";

class LeaveImpactCalculator {
  constructor() {
    this.workingDaysCalculator = new WorkingDaysCalculator();
  }

  /**
   * Calculate leave deduction for an employee in a specific month
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {Object} salaryStructure - Employee's salary structure
   * @returns {Object} Leave impact calculation result
   */
  async calculateLeaveDeduction(employeeId, month, year, salaryStructure) {
    try {
      // Get working days for the month
      const workingDaysResult = await this.workingDaysCalculator.getWorkingDays(month, year);
      const actualWorkingDays = workingDaysResult.workingDays;

      // Get leave records for the month
      const leaveRecords = await this.getLeaveRecordsForMonth(employeeId, month, year);

      // Calculate per-day salary based on gross salary and working days
      const grossSalary = salaryStructure.grossSalary || 0;
      const perDaySalary = actualWorkingDays > 0 ? grossSalary / actualWorkingDays : 0;

      // Process leave records
      const leaveBreakdown = [];
      let totalPaidLeaves = 0;
      let totalUnpaidLeaves = 0;
      let totalDeductionAmount = 0;

      for (const leave of leaveRecords) {
        const leaveDays = this.calculateLeaveDaysInMonth(leave, month, year);
        const isPaid = this.isLeaveTypePaid(leave.leaveType);
        const deductionAmount = isPaid ? 0 : leaveDays * perDaySalary;

        leaveBreakdown.push({
          leaveId: leave._id,
          leaveType: leave.leaveType,
          days: leaveDays,
          isPaid,
          deductionAmount: Math.round(deductionAmount)
        });

        if (isPaid) {
          totalPaidLeaves += leaveDays;
        } else {
          totalUnpaidLeaves += leaveDays;
          totalDeductionAmount += deductionAmount;
        }
      }

      const result = {
        paidLeaves: totalPaidLeaves,
        unpaidLeaves: totalUnpaidLeaves,
        perDaySalary: Math.round(perDaySalary),
        deductionAmount: Math.round(totalDeductionAmount),
        leaveBreakdown,
        workingDays: actualWorkingDays,
        calculationMethod: "proportional"
      };

      return result;
    } catch (error) {
      console.error("Error calculating leave deduction:", error);
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
      console.error("Error getting leave records:", error);
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
      console.error("Error calculating leave days in month:", error);
      return 0;
    }
  }

  /**
   * Determine if a leave type is paid or unpaid
   * @param {string} leaveType - Type of leave
   * @returns {boolean} True if paid, false if unpaid
   */
  isLeaveTypePaid(leaveType) {
    const paidLeaveTypes = [
      "annual",
      "sick",
      "casual",
      "earned",
      "compensatory",
      "festival",
      "bereavement"
    ];

    const unpaidLeaveTypes = [
      "unpaid",
      "loss_of_pay",
      "lop",
      "extended_sick",
      "personal"
    ];

    // Check if explicitly unpaid
    if (unpaidLeaveTypes.includes(leaveType.toLowerCase())) {
      return false;
    }

    // Check if explicitly paid
    if (paidLeaveTypes.includes(leaveType.toLowerCase())) {
      return true;
    }

    // Default to paid for unknown types (conservative approach)
    return true;
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
      console.error("Error calculating proportional salary:", error);
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
      console.error("Error generating leave impact report:", error);
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
      console.error("Error in bulk leave impact calculation:", error);
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
      console.error("Error getting leave balance:", error);
      throw error;
    }
  }
}

export default LeaveImpactCalculator;