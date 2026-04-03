/**
 * Unpaid Leave Deduction Calculator
 * Calculates salary deductions for unpaid leaves taken by employees
 * 
 * Logic:
 * - Unpaid leave deduction = (Monthly Salary / 30) × Number of Unpaid Leave Days
 * - Deduction is applied to the salary slip for the month
 * - Supports pro-rata calculations for mid-month salary changes
 */

/**
 * Calculate deduction for unpaid leaves
 * 
 * @param {Object} params
 * @param {number} params.monthlySalary - Monthly salary (net or gross based on policy)
 * @param {number} params.unpaidLeaveDays - Number of unpaid leave days
 * @param {number} params.daysInMonth - Total days in the month (default: 30)
 * @returns {Object} Deduction calculation details
 * 
 * @example
 * const deduction = calculateUnpaidLeaveDeduction({
 *   monthlySalary: 50000,
 *   unpaidLeaveDays: 2,
 *   daysInMonth: 30
 * });
 * // Returns: {
 * //   monthlySalary: 50000,
 * //   unpaidLeaveDays: 2,
 * //   daysInMonth: 30,
 * //   perDaySalary: 1666.67,
 * //   totalDeduction: 3333.33,
 * //   deductionPerDay: 1666.67
 * // }
 */
export const calculateUnpaidLeaveDeduction = (params) => {
  const {
    monthlySalary,
    unpaidLeaveDays,
    daysInMonth = 30,
  } = params;

  // Validate inputs
  if (!monthlySalary || monthlySalary < 0) {
    throw new Error('Monthly salary must be a positive number');
  }

  if (!unpaidLeaveDays || unpaidLeaveDays < 0) {
    throw new Error('Unpaid leave days must be a non-negative number');
  }

  if (daysInMonth <= 0) {
    throw new Error('Days in month must be greater than 0');
  }

  // Calculate per-day salary
  const perDaySalary = monthlySalary / daysInMonth;

  // Calculate total deduction
  const totalDeduction = perDaySalary * unpaidLeaveDays;

  return {
    monthlySalary,
    unpaidLeaveDays,
    daysInMonth,
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    totalDeduction: Math.round(totalDeduction * 100) / 100,
    deductionPerDay: Math.round(perDaySalary * 100) / 100,
  };
};

/**
 * Calculate unpaid leave deduction for salary components
 * Applies deduction proportionally to each earning component
 * 
 * @param {Object} params
 * @param {Object} params.earnings - Salary earning components {basicSalary, hra, allowances, etc}
 * @param {number} params.unpaidLeaveDays - Number of unpaid leave days
 * @param {number} params.daysInMonth - Total days in the month (default: 30)
 * @returns {Object} Deduction breakdown by component
 * 
 * @example
 * const deduction = calculateUnpaidLeaveDeductionByComponent({
 *   earnings: {
 *     basicSalary: 30000,
 *     hra: 10000,
 *     specialAllowance: 5000,
 *     transportAllowance: 3000,
 *     medicalAllowance: 2000
 *   },
 *   unpaidLeaveDays: 2,
 *   daysInMonth: 30
 * });
 */
export const calculateUnpaidLeaveDeductionByComponent = (params) => {
  const {
    earnings,
    unpaidLeaveDays,
    daysInMonth = 30,
  } = params;

  // Calculate total earnings
  const totalEarnings = Object.values(earnings).reduce((sum, val) => sum + (val || 0), 0);

  // Calculate total deduction
  const totalDeduction = (totalEarnings / daysInMonth) * unpaidLeaveDays;

  // Calculate deduction for each component proportionally
  const deductionByComponent = {};
  const proportionByComponent = {};

  Object.keys(earnings).forEach((key) => {
    const componentValue = earnings[key] || 0;
    const proportion = totalEarnings > 0 ? componentValue / totalEarnings : 0;
    const componentDeduction = totalDeduction * proportion;

    proportionByComponent[key] = Math.round(proportion * 10000) / 100; // Percentage
    deductionByComponent[key] = Math.round(componentDeduction * 100) / 100;
  });

  return {
    totalEarnings,
    unpaidLeaveDays,
    daysInMonth,
    perDaySalary: Math.round((totalEarnings / daysInMonth) * 100) / 100,
    totalDeduction: Math.round(totalDeduction * 100) / 100,
    deductionByComponent,
    proportionByComponent,
    breakdown: Object.keys(earnings).map((key) => ({
      component: key,
      originalAmount: earnings[key] || 0,
      proportion: proportionByComponent[key],
      deduction: deductionByComponent[key],
      afterDeduction: Math.round(((earnings[key] || 0) - deductionByComponent[key]) * 100) / 100,
    })),
  };
};

/**
 * Calculate unpaid leave deduction with pro-rata for mid-month salary changes
 * 
 * @param {Object} params
 * @param {Object} params.oldEarnings - Old salary components
 * @param {Object} params.newEarnings - New salary components
 * @param {Date|string} params.effectiveDate - Date when salary changed
 * @param {number} params.unpaidLeaveDays - Total unpaid leave days in month
 * @param {Date|string} params.monthDate - Reference month date
 * @returns {Object} Pro-rata unpaid leave deduction
 */
export const calculateUnpaidLeaveDeductionWithProRata = (params) => {
  const {
    oldEarnings,
    newEarnings,
    effectiveDate,
    unpaidLeaveDays,
    monthDate = new Date(),
  } = params;

  // Convert to Date objects
  const effDate = new Date(effectiveDate);
  const refDate = new Date(monthDate);

  effDate.setHours(0, 0, 0, 0);
  refDate.setHours(0, 0, 0, 0);

  // Get first and last day of month
  const firstDayOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const lastDayOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Check if effective date is in this month
  if (effDate < firstDayOfMonth || effDate > lastDayOfMonth) {
    // Effective date not in this month, use new earnings
    const deduction = calculateUnpaidLeaveDeductionByComponent({
      earnings: newEarnings,
      unpaidLeaveDays,
      daysInMonth: totalDaysInMonth,
    });

    return {
      isProRata: false,
      reason: 'Effective date is outside the reference month',
      ...deduction,
    };
  }

  // Check if effective date is first day of month
  if (effDate.getDate() === 1) {
    const deduction = calculateUnpaidLeaveDeductionByComponent({
      earnings: newEarnings,
      unpaidLeaveDays,
      daysInMonth: totalDaysInMonth,
    });

    return {
      isProRata: false,
      reason: 'Effective date is the first day of month',
      ...deduction,
    };
  }

  // Calculate pro-rata deduction
  const effectiveDateDay = effDate.getDate();
  const daysWorkedOld = effectiveDateDay - 1;
  const daysWorkedNew = totalDaysInMonth - daysWorkedOld;

  // Calculate total earnings for each period
  const oldTotalEarnings = Object.values(oldEarnings).reduce((sum, val) => sum + (val || 0), 0);
  const newTotalEarnings = Object.values(newEarnings).reduce((sum, val) => sum + (val || 0), 0);

  // Calculate per-day salary for each period
  const oldPerDaySalary = oldTotalEarnings / totalDaysInMonth;
  const newPerDaySalary = newTotalEarnings / totalDaysInMonth;

  // Calculate deduction for each period
  const deductionOldPeriod = oldPerDaySalary * unpaidLeaveDays;
  const deductionNewPeriod = newPerDaySalary * unpaidLeaveDays;
  const totalDeduction = deductionOldPeriod + deductionNewPeriod;

  // Calculate deduction by component for each period
  const deductionByComponentOld = {};
  const deductionByComponentNew = {};

  Object.keys(oldEarnings).forEach((key) => {
    const oldValue = oldEarnings[key] || 0;
    const newValue = newEarnings[key] || 0;

    // Deduction for old period
    const oldProportion = oldTotalEarnings > 0 ? oldValue / oldTotalEarnings : 0;
    deductionByComponentOld[key] = Math.round((deductionOldPeriod * oldProportion) * 100) / 100;

    // Deduction for new period
    const newProportion = newTotalEarnings > 0 ? newValue / newTotalEarnings : 0;
    deductionByComponentNew[key] = Math.round((deductionNewPeriod * newProportion) * 100) / 100;
  });

  return {
    isProRata: true,
    effectiveDate: effDate,
    daysWorkedOld,
    daysWorkedNew,
    totalDaysInMonth,
    unpaidLeaveDays,
    oldPerDaySalary: Math.round(oldPerDaySalary * 100) / 100,
    newPerDaySalary: Math.round(newPerDaySalary * 100) / 100,
    deductionOldPeriod: Math.round(deductionOldPeriod * 100) / 100,
    deductionNewPeriod: Math.round(deductionNewPeriod * 100) / 100,
    totalDeduction: Math.round(totalDeduction * 100) / 100,
    deductionByComponentOld,
    deductionByComponentNew,
    breakdown: {
      oldPeriod: Object.keys(oldEarnings).map((key) => ({
        component: key,
        originalAmount: oldEarnings[key] || 0,
        deduction: deductionByComponentOld[key],
        afterDeduction: Math.round(((oldEarnings[key] || 0) - deductionByComponentOld[key]) * 100) / 100,
      })),
      newPeriod: Object.keys(newEarnings).map((key) => ({
        component: key,
        originalAmount: newEarnings[key] || 0,
        deduction: deductionByComponentNew[key],
        afterDeduction: Math.round(((newEarnings[key] || 0) - deductionByComponentNew[key]) * 100) / 100,
      })),
    },
  };
};

/**
 * Calculate unpaid leave deduction for complete salary slip
 * 
 * @param {Object} params
 * @param {Object} params.salaryStructure - Salary structure object
 * @param {number} params.unpaidLeaveDays - Number of unpaid leave days
 * @param {number} params.month - Month (1-12)
 * @param {number} params.year - Year
 * @returns {Object} Complete unpaid leave deduction details
 */
export const calculateUnpaidLeaveDeductionForSalarySlip = (params) => {
  const {
    salaryStructure,
    unpaidLeaveDays,
    month,
    year,
  } = params;

  if (!salaryStructure) {
    throw new Error('Salary structure is required');
  }

  if (unpaidLeaveDays < 0) {
    throw new Error('Unpaid leave days cannot be negative');
  }

  // Get days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Extract earnings from salary structure
  const earnings = {
    basicSalary: salaryStructure.basicSalary,
    hra: salaryStructure.hra,
    specialAllowance: salaryStructure.specialAllowance,
    transportAllowance: salaryStructure.transportAllowance,
    medicalAllowance: salaryStructure.medicalAllowance,
  };

  // Calculate deduction by component
  const deductionDetails = calculateUnpaidLeaveDeductionByComponent({
    earnings,
    unpaidLeaveDays,
    daysInMonth,
  });

  // Calculate impact on net salary
  const grossSalaryBefore = salaryStructure.grossSalary;
  const grossSalaryAfter = grossSalaryBefore - deductionDetails.totalDeduction;
  const netSalaryBefore = salaryStructure.netSalary;
  const netSalaryAfter = netSalaryBefore - deductionDetails.totalDeduction;

  return {
    unpaidLeaveDays,
    daysInMonth,
    month,
    year,
    perDaySalary: deductionDetails.perDaySalary,
    totalDeduction: deductionDetails.totalDeduction,
    deductionByComponent: deductionDetails.deductionByComponent,
    breakdown: deductionDetails.breakdown,
    salaryImpact: {
      grossSalaryBefore,
      grossSalaryAfter,
      grossSalaryDeduction: Math.round((grossSalaryBefore - grossSalaryAfter) * 100) / 100,
      netSalaryBefore,
      netSalaryAfter,
      netSalaryDeduction: Math.round((netSalaryBefore - netSalaryAfter) * 100) / 100,
    },
  };
};

/**
 * Get unpaid leave days for a specific month from leave requests
 * 
 * @param {Array} leaveRequests - Array of approved leave requests
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {number} Total unpaid leave days in the month
 */
export const getUnpaidLeaveDaysForMonth = (leaveRequests, month, year) => {
  if (!Array.isArray(leaveRequests)) {
    return 0;
  }

  let totalUnpaidDays = 0;

  leaveRequests.forEach((leave) => {
    // Only count approved unpaid leaves
    if (leave.status !== 'approved' || leave.leaveType !== 'unpaid') {
      return;
    }

    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    // Check if leave overlaps with the specified month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // If leave is completely outside the month, skip
    if (endDate < monthStart || startDate > monthEnd) {
      return;
    }

    // Calculate days in this month
    const leaveStartInMonth = startDate > monthStart ? startDate : monthStart;
    const leaveEndInMonth = endDate < monthEnd ? endDate : monthEnd;

    const daysInMonth = Math.ceil((leaveEndInMonth - leaveStartInMonth) / (1000 * 60 * 60 * 24)) + 1;
    totalUnpaidDays += daysInMonth;
  });

  return totalUnpaidDays;
};

/**
 * Validate unpaid leave deduction
 * Ensures deduction doesn't exceed monthly salary
 * 
 * @param {number} monthlySalary - Monthly salary
 * @param {number} unpaidLeaveDays - Unpaid leave days
 * @param {number} daysInMonth - Days in month (default: 30)
 * @returns {Object} Validation result
 */
export const validateUnpaidLeaveDeduction = (monthlySalary, unpaidLeaveDays, daysInMonth = 30) => {
  const deduction = calculateUnpaidLeaveDeduction({
    monthlySalary,
    unpaidLeaveDays,
    daysInMonth,
  });

  const isValid = deduction.totalDeduction <= monthlySalary;

  return {
    isValid,
    deduction: deduction.totalDeduction,
    monthlySalary,
    unpaidLeaveDays,
    message: isValid
      ? `Deduction of ₹${deduction.totalDeduction} is valid`
      : `Deduction of ₹${deduction.totalDeduction} exceeds monthly salary of ₹${monthlySalary}`,
  };
};

export default {
  calculateUnpaidLeaveDeduction,
  calculateUnpaidLeaveDeductionByComponent,
  calculateUnpaidLeaveDeductionWithProRata,
  calculateUnpaidLeaveDeductionForSalarySlip,
  getUnpaidLeaveDaysForMonth,
  validateUnpaidLeaveDeduction,
};
