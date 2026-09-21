/**
 * Attendance IST calendar-day helpers.
 * Leave approval historically stored UTC midnight; enrichment stores IST midnight.
 * Both can represent the same India calendar day and must be treated as one record.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {Date|string|number} date
 * @returns {string} YYYY-MM-DD in IST
 */
export function toISTDateKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return ist.toISOString().split("T")[0];
}

/**
 * @param {string} ymd YYYY-MM-DD
 * @returns {{ start: Date, endExclusive: Date }}
 */
export function getISTDayBounds(ymd) {
  const [year, month, day] = String(ymd).split("-").map(Number);
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const start = new Date(utcMidnight.getTime() - IST_OFFSET_MS);
  return {
    start,
    endExclusive: new Date(start.getTime() + DAY_MS),
  };
}

/**
 * @param {string} [status]
 * @returns {number}
 */
export function attendanceStatusPriority(status) {
  if (status === "on-leave") return 5;
  if (status === "present" || status === "late" || status === "half-day") return 4;
  if (status === "absent") return 1;
  return 2;
}

/**
 * Prefer leave-approval notes / richer audit trail when status ties.
 * @param {object} a
 * @param {object} b
 * @returns {object}
 */
export function preferAttendanceRecord(a, b) {
  const pa = attendanceStatusPriority(a?.status);
  const pb = attendanceStatusPriority(b?.status);
  if (pb > pa) return b;
  if (pa > pb) return a;

  const aApproved = /Approved by/i.test(String(a?.notes || ""));
  const bApproved = /Approved by/i.test(String(b?.notes || ""));
  if (bApproved && !aApproved) return b;
  if (aApproved && !bApproved) return a;

  const aCreated = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (bCreated && aCreated && bCreated < aCreated) return b;
  return a;
}

/**
 * One row per employee + IST calendar day.
 * @param {Array<object>} records
 * @returns {Array<object>}
 */
export function dedupeAttendanceByISTDay(records = []) {
  const unique = [];
  const seen = new Map();

  for (const record of records) {
    if (!record?.date) continue;
    const employeeId = record.employee?._id || record.employee;
    if (!employeeId) continue;

    const dayKey = toISTDateKey(record.date);
    if (!dayKey) continue;

    const key = `${employeeId.toString()}-${dayKey}`;
    const existingIdx = seen.get(key);
    if (existingIdx === undefined) {
      seen.set(key, unique.length);
      unique.push(record);
      continue;
    }

    unique[existingIdx] = preferAttendanceRecord(unique[existingIdx], record);
  }

  return unique;
}
