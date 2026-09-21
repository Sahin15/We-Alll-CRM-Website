/**
 * Convert any Date/ISO value to YYYY-MM-DD in IST (matches backend attendance APIs).
 *
 * @param {Date|string|number} date
 * @returns {string}
 */
export const toISTDateString = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0];
};

/**
 * Day-of-week (0=Sun) for a calendar YYYY-MM-DD string.
 *
 * @param {string} dateStr
 * @returns {number}
 */
export const getISTDayOfWeek = (dateStr) => {
  if (!dateStr) return -1;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

/**
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {boolean}
 */
export const isSundayIST = (dateStr) => getISTDayOfWeek(dateStr) === 0;

/**
 * Iterate inclusive calendar dates between two YYYY-MM-DD strings.
 *
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @returns {string[]}
 */
export const eachDateStringInRange = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return [];
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  const out = [];
  for (let t = startMs; t <= endMs; t += 24 * 60 * 60 * 1000) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
};

/**
 * Convert decimal hours to hours:minutes format
 * @param {number} decimalHours - Hours in decimal format (e.g., 7.86)
 * @returns {string} - Hours in HH:MM format (e.g., "7:52")
 */
export const formatHoursToHHMM = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return "0:00";
  
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Convert decimal hours to readable format with "hrs" suffix
 * @param {number} decimalHours - Hours in decimal format (e.g., 7.86)
 * @returns {string} - Formatted string (e.g., "7:52 hrs")
 */
export const formatWorkHours = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return "0:00 hrs";
  
  return `${formatHoursToHHMM(decimalHours)} hrs`;
};

/**
 * Convert minutes to hours:minutes format
 * @param {number} minutes - Minutes (e.g., 90)
 * @returns {string} - Hours in HH:MM format (e.g., "1:30")
 */
export const formatMinutesToHHMM = (minutes) => {
  if (!minutes || minutes === 0) return "0:00";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};

/**
 * One attendance row per employee + IST calendar day.
 * Guards against UTC-midnight vs IST-midnight duplicate leave rows from the API.
 * @param {Array<object>} records
 * @returns {Array<object>}
 */
export const dedupeAttendanceByISTDay = (records = []) => {
  const unique = [];
  const seen = new Map();
  const statusPriority = (status) => {
    if (status === "on-leave") return 5;
    if (status === "present" || status === "late" || status === "half-day") return 4;
    if (status === "absent") return 1;
    return 2;
  };

  for (const record of records) {
    if (!record?.date) continue;
    const employeeId = record.employee?._id || record.employee || "unknown";
    const dayKey = toISTDateString(record.date);
    if (!dayKey) continue;
    const key = `${String(employeeId)}-${dayKey}`;
    const existingIdx = seen.get(key);
    if (existingIdx === undefined) {
      seen.set(key, unique.length);
      unique.push(record);
      continue;
    }
    const existing = unique[existingIdx];
    if (statusPriority(record.status) > statusPriority(existing.status)) {
      unique[existingIdx] = record;
    }
  }
  return unique;
};
