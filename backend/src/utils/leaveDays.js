/**
 * Days charged against earned leave for a request.
 * Half-day leave is always 0.5 regardless of the selected date range.
 */
export function getLeaveRequestDays(leaveType, startDate, endDate) {
  if (leaveType === "half_day") {
    return 0.5;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}
