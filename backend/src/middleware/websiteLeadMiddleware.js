import rateLimit from "express-rate-limit";

const DEFAULT_WEBSITE_LEAD_ORIGINS =
  "https://wealll.com,https://www.wealll.com,http://localhost";

/**
 * @returns {string[]}
 */
function getWebsiteLeadAllowedOrigins() {
  const raw =
    process.env.WEBSITE_LEAD_ALLOWED_ORIGINS || DEFAULT_WEBSITE_LEAD_ORIGINS;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
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
