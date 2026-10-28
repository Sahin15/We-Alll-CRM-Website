import { MetaHttpError, getAnalyticsTimeZone } from "./metaConfig.js";

const LEAD_ACTION_PREFERENCE = [
  "onsite_conversion.lead_grouped",
  "lead",
  "offsite_conversion.fb_pixel_lead",
];

const QUALIFIED_STATUS = "Qualified";
const CONVERTED_STATUS = "Won";
const LOST_STATUS = "Lost";
const NEW_STATUS = "New";

/**
 * @param {number} part
 * @param {number} total
 * @returns {number|null}
 */
export function ratio(part, total) {
  if (!total) return null;
  return part / total;
}

/**
 * Interpret a calendar day in an IANA timezone.
 * @param {string} dateStr
 * @param {string} timeZone
 * @param {boolean} endOfDay
 * @returns {Date}
 */
export function zonedDate(dateStr, timeZone, endOfDay) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  ));
  return new Date(utcGuess.getTime() - timeZoneOffsetMs(utcGuess, timeZone));
}

/**
 * @param {Date} date
 * @param {string} timeZone
 * @returns {number}
 */
function timeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/**
 * @param {string} fromStr
 * @param {string} toStr
 * @param {string} [timeZone]
 * @returns {{ start: Date, end: Date, timeZone: string }}
 */
export function zonedDayRange(fromStr, toStr, timeZone = getAnalyticsTimeZone()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
    throw new MetaHttpError(400, "Dates must use YYYY-MM-DD", "invalid_range");
  }
  const start = zonedDate(fromStr, timeZone, false);
  const end = zonedDate(toStr, timeZone, true);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new MetaHttpError(400, "Invalid date range", "invalid_range");
  }
  if (end < start) throw new MetaHttpError(400, "End date is before the start date", "invalid_range");
  if (end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
    throw new MetaHttpError(400, "Date range cannot exceed 366 days", "invalid_range");
  }
  return { start, end, timeZone };
}

/**
 * @param {string} [timeZone]
 * @returns {{ from: string, to: string }}
 */
export function defaultRange(timeZone = getAnalyticsTimeZone()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const end = zonedDate(today, timeZone, false);
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  const from = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(start);
  return { from, to: today };
}

/**
 * @param {Array<{ action_type?: string, value?: string|number }>|undefined} actions
 * @returns {{ actionType: string, count: number }|null}
 */
export function pickLeadAction(actions) {
  const list = Array.isArray(actions) ? actions : [];
  for (const actionType of LEAD_ACTION_PREFERENCE) {
    const found = list.find((row) => row?.action_type === actionType && Number(row.value) > 0);
    if (found) return { actionType, count: Number(found.value) };
  }
  return null;
}

/**
 * @param {Array<object>} rows
 * @returns {object}
 */
export function summarizeAdAccounts(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const ok = list.filter((row) => !row.error);
  if (!ok.length) {
    return {
      available: false,
      reason: list.find((row) => row.error)?.error || "Advertising insights are unavailable.",
      accounts: list,
      note: "These figures are Meta advertising metrics. They are not CRM lead counts.",
    };
  }

  const currencies = new Set(ok.map((row) => row.currency).filter(Boolean));
  const singleCurrency = currencies.size <= 1;
  const spend = singleCurrency ? ok.reduce((sum, row) => sum + Number(row.spend || 0), 0) : null;
  const impressions = ok.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const clicks = ok.reduce((sum, row) => sum + Number(row.clicks || 0), 0);

  let actionType = null;
  let leadCount = 0;
  let mixedActions = false;
  for (const row of ok) {
    if (!row.leadAction) continue;
    if (actionType && actionType !== row.leadAction.actionType) mixedActions = true;
    actionType = actionType || row.leadAction.actionType;
    leadCount += Number(row.leadAction.count || 0);
  }

  let costPerLead = null;
  let costPerLeadReason = null;
  if (!singleCurrency) {
    costPerLeadReason = "Spend cannot be combined across currencies.";
  } else if (mixedActions) {
    costPerLeadReason = "Lead action types differ across ad accounts.";
  } else if (leadCount <= 0) {
    costPerLeadReason = "Meta did not return a lead action for this range.";
  } else {
    costPerLead = spend / leadCount;
  }

  return {
    available: true,
    partial: list.some((row) => row.error),
    currency: singleCurrency ? ([...currencies][0] || null) : null,
    spend,
    spendUnavailableReason: singleCurrency
      ? null
      : "Selected ad accounts use different currencies, so spend is listed per account.",
    impressions,
    clicks,
    metaLeadActions: leadCount > 0 && !mixedActions ? { actionType, count: leadCount } : null,
    costPerLead,
    costPerLeadReason,
    accounts: list,
    note: "These figures are Meta advertising metrics. They are not CRM lead counts.",
  };
}

/**
 * @param {Array<{ status?: string }>|object} grouped
 * @returns {object}
 */
export function summarizeCrmCounts(counts) {
  const total = Number(counts.total || 0);
  const qualified = Number(counts.qualified || 0);
  const converted = Number(counts.converted || 0);
  return {
    total,
    new: Number(counts.new || 0),
    qualified,
    converted,
    lost: Number(counts.lost || 0),
    qualificationRate: ratio(qualified, total),
    conversionRate: ratio(converted, total),
    qualifiedStatus: QUALIFIED_STATUS,
    convertedStatus: CONVERTED_STATUS,
    lostStatus: LOST_STATUS,
    newStatus: NEW_STATUS,
    note: "Counts are CRM leads imported from Meta. Imports start as New and are not qualified or converted automatically.",
  };
}

export { QUALIFIED_STATUS, CONVERTED_STATUS, LOST_STATUS, NEW_STATUS };
