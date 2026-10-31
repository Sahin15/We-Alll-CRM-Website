/**
 * Derive attendance status from clock-in time (IST business rules).
 * Shared by attendance model and leave/approval flows.
 *
 * @param {Date|string|null|undefined} clockIn
 * @returns {'present'|'late'|'half-day'|'absent'}
 */
export function attendanceStatusFromClockIn(clockIn) {
  if (!clockIn) return "absent";

  const clockInTime = new Date(clockIn);
  if (Number.isNaN(clockInTime.getTime())) return "present";

  const istTimeString = clockInTime.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const [clockInHour, clockInMinute] = istTimeString.split(":").map(Number);
  const totalMinutes = clockInHour * 60 + clockInMinute;

  if (totalMinutes > 1140) return "absent";
  if (totalMinutes >= 720) return "half-day";
  if (totalMinutes > 630) return "late";
  return "present";
}
