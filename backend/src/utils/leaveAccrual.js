import {
  ANNUAL_EARNED_LEAVE_LIMIT,
  MONTHLY_EARNED_LEAVE_RATE,
} from "../constants/leaveCategoryLimits.js";
import { getISTDateKey } from "./timezone.js";

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calendar Y-M-D in Asia/Kolkata (safe on UTC or IST servers).
 * @param {Date|string|null} value
 * @returns {{ year: number, month: number, day: number } | null}
 */
export function getISTDateParts(value) {
  const date = toDate(value);
  if (!date) return null;
  const key = getISTDateKey(date);
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

/** Current leave calendar year in IST. */
export function getCurrentLeaveYear(referenceDate = new Date()) {
  return getISTDateParts(referenceDate)?.year ?? new Date().getFullYear();
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
  const currentParts = getISTDateParts(referenceDate);
  if (!currentParts) return 0;

  const { year: currentYear, month: currentMonth, day: currentDay } = currentParts;
  const anchorParts = getISTDateParts(accrualDate);

  if (year > currentYear) {
    return 0;
  }

  if (year < currentYear) {
    if (anchorParts) {
      if (anchorParts.year > year) {
        return 0;
      }
      if (anchorParts.year === year) {
        const monthsWorked = 12 - anchorParts.month + 1;
        return Math.min(
          monthsWorked * MONTHLY_EARNED_LEAVE_RATE,
          ANNUAL_EARNED_LEAVE_LIMIT
        );
      }
    }
    return ANNUAL_EARNED_LEAVE_LIMIT;
  }

  // Current IST calendar year
  if (anchorParts) {
    if (anchorParts.year > currentYear) {
      return 0;
    }

    if (anchorParts.year === currentYear) {
      if (anchorParts.month > currentMonth) {
        return 0;
      }
      if (anchorParts.month === currentMonth && anchorParts.day > currentDay) {
        return 0;
      }

      const monthsWorked = currentMonth - anchorParts.month + 1;
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
