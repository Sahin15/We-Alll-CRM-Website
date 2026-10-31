import { GMAIL_LIMITS } from "./gmailConfig.js";

/**
 * @param {string} data
 * @returns {string}
 */
export function decodeBase64Url(data) {
  if (!data) return "";
  const normalized = String(data).replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf8");
}

/**
 * @param {Array<{ name?: string, value?: string }>|undefined} headers
 * @param {string} name
 * @returns {string}
 */
export function headerValue(headers, name) {
  const found = (headers || []).find((item) => String(item?.name || "").toLowerCase() === name.toLowerCase());
  return found?.value ? String(found.value) : "";
}

/**
 * @param {string} raw
 * @returns {{ name: string, email: string }}
 */
export function parseAddress(raw) {
  const value = String(raw || "").trim();
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/^"|"$/g, "").trim().slice(0, 200),
      email: match[2].trim().slice(0, 320),
    };
  }
  return { name: "", email: value.slice(0, 320) };
}

/**
 * @param {string} raw
 * @returns {Array<{ name: string, email: string }>}
 */
export function parseAddressList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((part) => parseAddress(part))
    .filter((item) => item.email)
    .slice(0, 20);
}

/**
 * @param {object|null|undefined} payload
 * @returns {{ html: string, text: string }}
 */
export function extractBodies(payload) {
  let html = "";
  let text = "";
  const walk = (part) => {
    if (!part || (html && text)) return;
    const mime = String(part.mimeType || "").toLowerCase();
    const data = part.body?.data;
    if (mime === "text/html" && data && !html) html = decodeBase64Url(data);
    if (mime === "text/plain" && data && !text) text = decodeBase64Url(data);
    for (const child of part.parts || []) walk(child);
  };
  walk(payload);
  if (!html && !text && payload?.body?.data) {
    const raw = decodeBase64Url(payload.body.data);
    if (String(payload.mimeType || "").toLowerCase().includes("html")) html = raw;
    else text = raw;
  }
  return {
    html: html.slice(0, GMAIL_LIMITS.bodyMaxChars),
    text: text.slice(0, GMAIL_LIMITS.bodyMaxChars),
  };
}

/**
 * Metadata stored for list, search, and unread state. Bodies are not included.
 * @param {object} raw
 * @returns {object|null}
 */
export function normalizeGmailMessage(raw) {
  if (!raw?.id) return null;
  const headers = raw.payload?.headers || [];
  const labels = Array.isArray(raw.labelIds) ? raw.labelIds.map(String).slice(0, 30) : [];
  const receivedAt = raw.internalDate ? new Date(Number(raw.internalDate)) : new Date();
  return {
    gmailMessageId: String(raw.id).slice(0, 128),
    threadId: String(raw.threadId || "").slice(0, 128),
    from: parseAddress(headerValue(headers, "From")),
    to: parseAddressList(headerValue(headers, "To")),
    cc: parseAddressList(headerValue(headers, "Cc")),
    subject: headerValue(headers, "Subject").slice(0, 500),
    snippet: String(raw.snippet || "").slice(0, 500),
    receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
    isRead: !labels.includes("UNREAD"),
    labels,
  };
}
