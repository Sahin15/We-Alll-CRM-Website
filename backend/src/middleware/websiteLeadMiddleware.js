import rateLimit from "express-rate-limit";

const DEFAULT_DEV_WEBSITE_LEAD_ORIGINS =
  "https://wealll.com,https://www.wealll.com,http://localhost";

/**
 * Runtime production check (reads env each call — safe after dotenv and in tests).
 * UAT uses APP_ENV=uat with NODE_ENV=production and must NOT use production hard-fail.
 * @returns {boolean}
 */
function isWebsiteLeadProductionRuntime() {
  const appEnv = String(
    process.env.APP_ENV || process.env.NODE_ENV || "development"
  ).toLowerCase();
  if (appEnv === "uat" || appEnv === "test" || appEnv === "development") {
    return false;
  }
  if (appEnv === "production") {
    return true;
  }
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function parseOriginAllowlist(raw) {
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Resolve website-lead Origin allowlist.
 * Production must set WEBSITE_LEAD_ALLOWED_ORIGINS explicitly (no localhost default).
 * @returns {string[]}
 */
export function getWebsiteLeadAllowedOrigins() {
  const raw = process.env.WEBSITE_LEAD_ALLOWED_ORIGINS;
  if (raw && String(raw).trim()) {
    return parseOriginAllowlist(raw);
  }
  if (isWebsiteLeadProductionRuntime()) {
    return [];
  }
  return parseOriginAllowlist(DEFAULT_DEV_WEBSITE_LEAD_ORIGINS);
}

/**
 * Fail closed in production if website-lead allowlist is missing or includes localhost.
 * Local / UAT keep convenient defaults.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateWebsiteLeadProductionConfig() {
  if (!isWebsiteLeadProductionRuntime()) {
    return { ok: true };
  }

  const raw = process.env.WEBSITE_LEAD_ALLOWED_ORIGINS;
  if (!raw || !String(raw).trim()) {
    return {
      ok: false,
      error:
        "WEBSITE_LEAD_ALLOWED_ORIGINS must be set in production (e.g. https://wealll.com,https://www.wealll.com)",
    };
  }

  if (/localhost|127\.0\.0\.1/i.test(raw)) {
    return {
      ok: false,
      error:
        "WEBSITE_LEAD_ALLOWED_ORIGINS must not include localhost or 127.0.0.1 in production",
    };
  }

  const list = parseOriginAllowlist(raw);
  if (list.length === 0) {
    return {
      ok: false,
      error: "WEBSITE_LEAD_ALLOWED_ORIGINS is empty after parsing",
    };
  }

  return { ok: true };
}

/**
 * @param {string | undefined | null} headerValue
 * @returns {string | null}
 */
function originFromReferer(headerValue) {
  if (!headerValue) return null;
  try {
    return new URL(headerValue).origin;
  } catch {
    return null;
  }
}

/**
 * @param {import('express').Request} req
 * @returns {string | null}
 */
export function getWebsiteLeadRequestOrigin(req) {
  if (req.headers.origin) {
    return req.headers.origin;
  }
  return originFromReferer(req.headers.referer);
}

/**
 * @param {string} requestOrigin
 * @param {string[]} allowlist
 * @returns {boolean}
 */
export function isWebsiteLeadOriginAllowed(requestOrigin, allowlist) {
  if (!requestOrigin) return false;

  return allowlist.some((allowed) => {
    if (requestOrigin === allowed) return true;
    if (
      allowed === "http://localhost" &&
      (requestOrigin.startsWith("http://localhost:") ||
        requestOrigin.startsWith("http://127.0.0.1:") ||
        requestOrigin === "http://127.0.0.1")
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Browser-only ingest: Origin or Referer must match WEBSITE_LEAD_ALLOWED_ORIGINS.
 */
export const websiteLeadOriginCheck = (req, res, next) => {
  const requestOrigin = getWebsiteLeadRequestOrigin(req);
  const allowlist = getWebsiteLeadAllowedOrigins();

  if (!requestOrigin || !isWebsiteLeadOriginAllowed(requestOrigin, allowlist)) {
    return res.status(403).json({
      success: false,
      error: "Origin not allowed for website lead submission",
    });
  }

  return next();
};

export const websiteLeadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many website lead submissions from this IP, please try again later",
  },
});
