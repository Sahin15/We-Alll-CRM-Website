const SUPPORTED = new Set(['en', 'hi', 'bn']);
const BENGALI = /[\u0980-\u09FF]/;
const DEVANAGARI = /[\u0900-\u097F]/;

/**
 * Detect English, Hindi, or Bengali from the message script.
 * @param {string} text
 * @returns {'en'|'hi'|'bn'}
 */
export function detectLanguage(text) {
  const value = String(text || '');
  if (BENGALI.test(value)) return 'bn';
  if (DEVANAGARI.test(value)) return 'hi';
  return 'en';
}

/**
 * Honor an explicit language, otherwise detect it.
 * @param {string} requested
 * @param {string} message
 * @returns {'en'|'hi'|'bn'}
 */
export function resolveLanguage(requested, message) {
  if (SUPPORTED.has(requested)) return requested;
  return detectLanguage(message);
}
