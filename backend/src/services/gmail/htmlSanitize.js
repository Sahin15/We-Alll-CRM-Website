import { GMAIL_LIMITS } from "./gmailConfig.js";

const ALLOWED = new Set([
  "a", "p", "br", "div", "span", "strong", "em", "b", "i", "u",
  "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tr", "td", "th", "img", "pre", "code", "hr",
]);

const DROP_CONTENT = /<\s*(script|style|iframe|object|embed|svg|math|noscript|form|textarea|template|link|meta|base|head)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;

/**
 * @param {string} value
 * @param {string[]} schemes
 * @returns {string}
 */
function safeUrl(value, schemes) {
  const trimmed = String(value || "").trim().replace(/[\u0000-\u001F\s]+/g, "");
  if (!trimmed || trimmed.startsWith("//")) return "";
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return "";
  }
  const protocol = url.protocol.replace(":", "").toLowerCase();
  if (!schemes.includes(protocol)) return "";
  return url.toString();
}

/**
 * @param {string} tag
 * @param {string} attrs
 * @returns {string}
 */
function cleanTag(tag, attrs) {
  const name = tag.toLowerCase();
  if (!ALLOWED.has(name)) return "";
  if (name === "a") {
    const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || "");
    const url = safeUrl(href?.[2] || href?.[3] || href?.[4] || "", ["http", "https", "mailto"]);
    if (!url) return "<a>";
    return `<a href="${url.replace(/"/g, "%22")}" rel="noopener noreferrer" target="_blank">`;
  }
  if (name === "img") {
    const src = /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || "");
    const url = safeUrl(src?.[2] || src?.[3] || src?.[4] || "", ["http", "https"]);
    const alt = /\balt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs || "");
    const altText = String(alt?.[2] || alt?.[3] || "").replace(/[<>"]/g, "").slice(0, 200);
    if (!url) return "";
    return `<img src="${url.replace(/"/g, "%22")}" alt="${altText}">`;
  }
  if (name === "br" || name === "hr" || name === "img") return `<${name}>`;
  return `<${name}>`;
}

/**
 * Allowlisted HTML for email bodies. The inbox also renders this inside a script-disabled frame.
 * @param {string} html
 * @returns {string}
 */
export function sanitizeEmailHtml(html) {
  if (!html) return "";
  let source = String(html).slice(0, GMAIL_LIMITS.bodyMaxChars).replace(/\u0000/g, "");
  source = source.replace(/<!--[\s\S]*?-->/g, "");
  let previous = "";
  while (source !== previous) {
    previous = source;
    source = source.replace(DROP_CONTENT, "");
  }
  source = source.replace(/<\s*(script|style|iframe|object|embed|svg|math|noscript|form|textarea|template|link|meta|base|head)\b[^>]*>/gi, "");
  return source.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrs) => {
    if (match.startsWith("</")) {
      return ALLOWED.has(String(tag).toLowerCase()) ? `</${String(tag).toLowerCase()}>` : "";
    }
    return cleanTag(tag, attrs);
  }).slice(0, GMAIL_LIMITS.bodyMaxChars);
}
