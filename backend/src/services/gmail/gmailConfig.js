/**
 * Gmail inbox configuration. Scopes stay in this file so later versions
 * can add send or modify without scattering permission strings.
 */

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const GMAIL_ADDRESS = /^[a-z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i;

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeGmailAddress(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!GMAIL_ADDRESS.test(email) || email.length > 320) {
    throw new GmailHttpError(400, "Enter a Gmail address such as name@gmail.com", "invalid_email");
  }
  return email;
}

export const GMAIL_LIMITS = {
  callbackSyncMessages: 20,
  manualSyncMessages: 40,
  pageSize: 20,
  listPageMax: 50,
  threadMessages: 15,
  searchMaxLength: 80,
  bodyMaxChars: 200000,
  syncLockMs: 3 * 60 * 1000,
};

export class GmailHttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {string} code
   */
  constructor(status, message, code) {
    super(message);
    this.name = "GmailHttpError";
    this.status = status;
    this.code = code;
  }
}

/**
 * @returns {{ configured: boolean, missingEnv: string[] }}
 */
export function gmailConfigStatus() {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_OAUTH_REDIRECT_URI",
    "EMAIL_TOKEN_ENCRYPTION_KEY",
  ];
  const missingEnv = required.filter((key) => !process.env[key] || !String(process.env[key]).trim());
  return { configured: missingEnv.length === 0, missingEnv };
}

/**
 * @param {string} value
 * @returns {string}
 */
export function assertRedirectUri(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new GmailHttpError(503, "Gmail is not configured on the server", "not_configured");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new GmailHttpError(503, "Gmail is not configured on the server", "not_configured");
  }
  return url.toString();
}

/**
 * Browser return URL after Google redirects to the API. Built only from FRONTEND_URL.
 * @returns {URL}
 */
export function frontendInboxUrl() {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  let url;
  try {
    url = new URL(base);
  } catch {
    throw new GmailHttpError(500, "FRONTEND_URL is not a valid URL", "not_configured");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new GmailHttpError(500, "FRONTEND_URL must be an HTTP(S) URL", "not_configured");
  }
  url.pathname = "/email";
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * @param {string} message
 * @returns {string}
 */
export function safeGmailError(message) {
  return String(message || "Gmail request failed")
    .replace(/ya29\.[A-Za-z0-9_\-]+/g, "[token]")
    .replace(/Bearer\s+\S+/gi, "Bearer [token]")
    .replace(/refresh_token=[^&\s]+/gi, "refresh_token=[token]")
    .slice(0, 240);
}
