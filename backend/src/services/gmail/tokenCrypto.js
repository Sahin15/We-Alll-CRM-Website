import crypto from "crypto";
import { GmailHttpError } from "./gmailConfig.js";

const ALGO = "aes-256-gcm";

/**
 * 32-byte key from hex, base64, or a long secret (SHA-256 derived).
 * @returns {Buffer}
 */
export function getEmailTokenKey() {
  const raw = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!raw || !String(raw).trim()) {
    throw new GmailHttpError(503, "Gmail is not configured on the server", "not_configured");
  }
  const value = String(raw).trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    const asBase64 = Buffer.from(value, "base64");
    const roundTrip = asBase64.toString("base64").replace(/=+$/, "");
    if (asBase64.length === 32 && roundTrip === value.replace(/=+$/, "")) return asBase64;
  }
  if (value.length < 32) {
    throw new GmailHttpError(503, "Gmail is not configured on the server", "not_configured");
  }
  return crypto.createHash("sha256").update(value).digest();
}

/**
 * @param {string} plaintext
 * @returns {string}
 */
export function encryptSecret(plaintext) {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getEmailTokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * @param {string} payload
 * @returns {string}
 */
export function decryptSecret(payload) {
  if (!payload) return "";
  const parts = String(payload).split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new GmailHttpError(409, "Reconnect Gmail to continue.", "needs_reauth");
  }
  try {
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const data = Buffer.from(parts[3], "base64");
    const decipher = crypto.createDecipheriv(ALGO, getEmailTokenKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof GmailHttpError) throw error;
    throw new GmailHttpError(409, "Reconnect Gmail to continue.", "needs_reauth");
  }
}
