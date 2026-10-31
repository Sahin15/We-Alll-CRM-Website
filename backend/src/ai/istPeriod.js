import { getMonthBoundsIST, getTodayMidnightIST, getTodayRangeIST } from '../utils/timezone.js';

/**
 * Current calendar month in Asia/Kolkata.
 * @param {Date} [now]
 */
export function currentIstYearMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return { year, month, bounds: getMonthBoundsIST(year, month) };
}

/**
 * Today from IST midnight up to the next IST midnight.
 * @param {Date} [now]
 */
export function todayIstRange(now = new Date()) {
  const start = getTodayMidnightIST(now);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * A single IST day relative to today. 0 is today, -1 is yesterday.
 * Uses the same bounds as the attendance report.
 * @param {number} offsetDays
 */
export function dayRangeIST(offsetDays = 0) {
  const today = getTodayRangeIST();
  const shift = offsetDays * 24 * 60 * 60 * 1000;
  return {
    start: new Date(today.start.getTime() + shift),
    end: new Date(today.end.getTime() + shift),
  };
}
