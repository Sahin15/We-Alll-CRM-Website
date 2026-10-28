/**
 * Social workspace rules. These functions do not invent platform metrics.
 */

export const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X (Twitter)" },
  { id: "google_business", label: "Google Business" },
  { id: "pinterest", label: "Pinterest" },
  { id: "threads", label: "Threads" },
];

const PLATFORM_IDS = new Set(SOCIAL_PLATFORMS.map((item) => item.id));

/**
 * Deployment company scope. Kept local so social settings do not depend on the Meta integration.
 *
 * @returns {string}
 */
export function getSocialCompanyScope() {
  const raw = String(process.env.COMPANY_SCOPE || "wealll").trim().toLowerCase();
  const scope = raw.replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  return scope || "wealll";
}

export const COMPANY_FILTERS = {
  "we-alll": "We Alll",
  "kolkata-digital": "Kolkata Digital",
};

export const POST_STATUSES = [
  "draft",
  "pending",
  "scheduled",
  "published",
  "failed",
  "changes_requested",
];

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizePlatforms(value) {
  const list = Array.isArray(value) ? value : [];
  const unique = [...new Set(list.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))];
  if (!unique.length || unique.some((id) => !PLATFORM_IDS.has(id))) {
    const error = new Error("Choose at least one supported platform");
    error.statusCode = 400;
    throw error;
  }
  return unique;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function cleanHttpsUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (!/^https:\/\/.+/i.test(url) || url.length > 2000) {
    const error = new Error("Use an https link");
    error.statusCode = 400;
    throw error;
  }
  return url;
}

/**
 * @param {unknown} input
 * @returns {{ reach?: number, clicks?: number, engagementRate?: number }}
 */
export function sanitizeMetrics(input) {
  if (!input || typeof input !== "object") return {};
  const out = {};
  for (const key of ["reach", "clicks"]) {
    if (input[key] === "" || input[key] == null) continue;
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < 0) {
      const error = new Error("Reach and clicks must be zero or greater");
      error.statusCode = 400;
      throw error;
    }
    out[key] = Math.round(value);
  }
  if (input.engagementRate !== "" && input.engagementRate != null) {
    const value = Number(input.engagementRate);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      const error = new Error("Engagement rate must be between 0 and 100");
      error.statusCode = 400;
      throw error;
    }
    out.engagementRate = Math.round(value * 10) / 10;
  }
  return out;
}

/**
 * @param {number} current
 * @param {number} previous
 * @returns {number|null}
 */
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Calendar day in a timezone. en-CA yields YYYY-MM-DD.
 *
 * @param {Date|string|number} value
 * @param {string} [timeZone]
 * @returns {string}
 */
export function dayKey(value, timeZone = "Asia/Kolkata") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * @param {string} company
 * @returns {string}
 */
export function serviceCompanyFromFilter(company) {
  return COMPANY_FILTERS[String(company || "")] || "";
}

/**
 * @param {string} action
 * @param {string|Date|null} scheduledAt
 * @param {Date} [now]
 * @returns {{ status: string, scheduledAt?: Date, publishedAt?: Date, error?: string }}
 */
export function initialPostStatus(action, scheduledAt, now = new Date()) {
  if (action === "submit") return { status: "pending" };
  if (action === "schedule") {
    const when = scheduledAt ? new Date(scheduledAt) : null;
    if (!when || Number.isNaN(when.getTime())) return { error: "Choose a schedule date" };
    return { status: "scheduled", scheduledAt: when };
  }
  if (action === "publish") return { status: "published", publishedAt: now };
  return { status: "draft" };
}

/**
 * @param {{ status: string, scheduledAt?: Date|null }} post
 * @param {string} action
 * @param {{ note?: string, scheduledAt?: string|Date, now?: Date }} [extras]
 * @returns {{ status?: string, scheduledAt?: Date, publishedAt?: Date, approvedAt?: Date, approvalNote?: string, error?: string }}
 */
export function resolvePostAction(post, action, extras = {}) {
  const now = extras.now || new Date();
  if (action === "approve") {
    if (!["pending", "changes_requested"].includes(post.status)) {
      return { error: "Only posts waiting for approval can be approved" };
    }
    return {
      status: "scheduled",
      scheduledAt: post.scheduledAt || now,
      approvedAt: now,
      approvalNote: "",
    };
  }
  if (action === "request-changes") {
    if (!["pending", "scheduled"].includes(post.status)) {
      return { error: "This post is not waiting for review" };
    }
    const note = String(extras.note || "").trim();
    if (!note) return { error: "Add a note describing the changes" };
    if (note.length > 1000) return { error: "Keep the note under 1000 characters" };
    return { status: "changes_requested", approvalNote: note };
  }
  if (action === "publish") {
    if (post.status === "published") return { error: "This post is already published" };
    if (post.status === "pending") return { error: "Approve the post before marking it published" };
    return { status: "published", publishedAt: now };
  }
  if (action === "submit") {
    if (post.status === "published") return { error: "Published posts stay in the library" };
    return { status: "pending", approvalNote: "" };
  }
  if (action === "schedule") {
    if (post.status === "published") return { error: "Published posts stay in the library" };
    const scheduledAt = extras.scheduledAt ? new Date(extras.scheduledAt) : post.scheduledAt;
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
      return { error: "Choose a schedule date" };
    }
    return { status: "scheduled", scheduledAt: new Date(scheduledAt) };
  }
  return { error: "Unknown action" };
}
