import crypto from "crypto";

const TOKEN_QUERY = /(access_token|client_secret|fb_exchange_token|code|authorization)=([^&\s]+)/gi;
const META_TOKEN = /\bEAA[A-Za-z0-9]{20,}\b/g;

/**
 * Remove tokens and authorization codes from log and API error text.
 * @param {unknown} value
 * @returns {string}
 */
export function redactSecrets(value) {
  return String(value || "")
    .replace(TOKEN_QUERY, "$1=[redacted]")
    .replace(META_TOKEN, "[redacted]");
}

/**
 * @param {string} leftValue
 * @param {string} rightValue
 * @returns {boolean}
 */
export function timingSafeEqualString(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue));
  const right = Buffer.from(String(rightValue));
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

/**
 * Graph calls may only target Meta's API host over HTTPS.
 * @param {URL|string} input
 * @returns {URL}
 */
export function assertGraphUrl(input) {
  const url = input instanceof URL ? input : new URL(String(input));
  if (url.protocol !== "https:") {
    throw new Error("Refused non-HTTPS Graph URL");
  }
  if (url.hostname !== "graph.facebook.com") {
    throw new Error("Refused non-Graph host");
  }
  if (url.username || url.password) {
    throw new Error("Refused Graph URL with credentials");
  }
  return url;
}

/**
 * @param {number} status
 * @param {number|undefined} code
 * @returns {boolean}
 */
export function isRetryableGraphFailure(status, code) {
  if (status === 429 || status >= 500) return true;
  return [1, 2, 4, 17, 32, 613].includes(Number(code));
}

/**
 * Invalid or expired user/page tokens.
 * @param {number|undefined} code
 * @returns {boolean}
 */
export function isMetaAuthFailure(code) {
  return [102, 190, 463, 467].includes(Number(code));
}

/**
 * @param {number} attempt
 * @returns {number}
 */
export function backoffMs(attempt) {
  const base = Math.min(1000 * 2 ** attempt, 30000);
  return base + Math.floor(Math.random() * 250);
}

/**
 * @param {Buffer|string|undefined} rawBody
 * @param {string|undefined} header
 * @param {string|undefined} appSecret
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, header, appSecret) {
  if (!appSecret || !header || rawBody == null) return false;
  const provided = String(header).trim();
  if (!provided.startsWith("sha256=")) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody));
  const digest = crypto.createHmac("sha256", appSecret).update(body).digest("hex");
  return timingSafeEqualString(`sha256=${digest}`, provided);
}

/**
 * @param {{ mode?: string, token?: string, challenge?: string, expected?: string }} input
 * @returns {{ ok: true, challenge: string } | { ok: false }}
 */
export function verifyWebhookChallenge({ mode, token, challenge, expected }) {
  if (mode !== "subscribe" || !expected || !token || challenge == null || challenge === "") {
    return { ok: false };
  }
  if (!timingSafeEqualString(String(token), String(expected))) return { ok: false };
  const value = String(challenge);
  if (value.length > 256 || /[\r\n]/.test(value)) return { ok: false };
  return { ok: true, challenge: value };
}
