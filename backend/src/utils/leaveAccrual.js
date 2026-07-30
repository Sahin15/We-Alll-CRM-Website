import {
  ANNUAL_EARNED_LEAVE_LIMIT,
  MONTHLY_EARNED_LEAVE_RATE,
} from "../constants/leaveCategoryLimits.js";

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hadInternshipRecord(employee) {
  const details = employee?.internshipDetails;
  return Boolean(details?.startDate || details?.duration);
}

/**
 * Anchor date for earned-leave accrual.
 * Uses joiningDate for regular full-time employees.
 * Uses fullTimeStartDate only after intern → full-time conversion.
 */
export function resolveAccrualDate(employee) {
  if (!employee) return null;

  const joiningDate = toDate(employee.joiningDate);
  const fullTimeStartDate = toDate(employee.fullTimeStartDate);
  const createdAt = toDate(employee.createdAt);

  if (joiningDate) {
    if (
      fullTimeStartDate &&
      fullTimeStartDate.getTime() > joiningDate.getTime() &&
      hadInternshipRecord(employee)
    ) {
      return fullTimeStartDate;
    }
    return joiningDate;
  }

  return fullTimeStartDate || createdAt || null;
}

/**
 * Earned leaves for a calendar year (2/month, cap 24).
 * @param {number} year
 * @param {Date|string|null} accrualDate
 * @param {Date} [referenceDate=new Date()] — "today" for accrual calculations
 */
export function calculateEarnedLeaves(
  year,
  accrualDate = null,
  referenceDate = new Date()
) {
  const currentDate = toDate(referenceDate) || new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const anchor = toDate(accrualDate);

  if (year > currentYear) {
    return 0;
  }

  if (year < currentYear) {
    if (anchor) {
      const joiningYear = anchor.getFullYear();
      if (joiningYear > year) {
        return 0;
      }
      if (joiningYear === year) {
        const joiningMonth = anchor.getMonth() + 1;
        const monthsWorked = 12 - joiningMonth + 1;
        return Math.min(
          monthsWorked * MONTHLY_EARNED_LEAVE_RATE,
          ANNUAL_EARNED_LEAVE_LIMIT
        );
      }
    }
    return ANNUAL_EARNED_LEAVE_LIMIT;
  }

  // Current year
  if (anchor) {
    const joiningYear = anchor.getFullYear();
    const joiningMonth = anchor.getMonth() + 1;
    const joiningDay = anchor.getDate();
    const currentDay = currentDate.getDate();

    if (joiningYear > currentYear) {
      return 0;
    }

    if (joiningYear === currentYear) {
      if (joiningMonth > currentMonth) {
        return 0;
      }
      if (joiningMonth === currentMonth && joiningDay > currentDay) {
        return 0;
      }

      const monthsWorked = currentMonth - joiningMonth + 1;
      return Math.min(
        monthsWorked * MONTHLY_EARNED_LEAVE_RATE,
        ANNUAL_EARNED_LEAVE_LIMIT
      );
    }
  }

  return Math.min(
    currentMonth * MONTHLY_EARNED_LEAVE_RATE,
    ANNUAL_EARNED_LEAVE_LIMIT
  );
}
