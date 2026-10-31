const SECRET_KEY = /password|secret|token|apikey|api_key|salary|bank|aadhaar|aadhar|pan|ssn|otp|authorization|privatekey|jwt/i;

/**
 * Drop sensitive keys and Mongo operators from anything that might be returned.
 * @param {unknown} value
 * @returns {unknown}
 */
export function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizePayload(item));
  if (!value || typeof value !== 'object') return value;

  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (key.startsWith('$') || SECRET_KEY.test(key)) continue;
    clean[key] = sanitizePayload(item);
  }
  return clean;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizePublicText(text) {
  return String(text || '')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, '[redacted]');
}
