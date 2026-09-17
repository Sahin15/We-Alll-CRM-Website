/**
 * Normalize phone values from marketing forms (+91 spaces, etc.) for Lead storage.
 * @param {string|number|null|undefined} rawPhone
 * @returns {{ ok: true, phoneNumber: number } | { ok: false, error: string }}
 */
export function normalizeLeadPhone(rawPhone) {
  if (rawPhone === null || rawPhone === undefined || rawPhone === "") {
    return { ok: false, error: "Phone number is required" };
  }

  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) {
    return { ok: false, error: "Phone number must contain digits" };
  }

  let normalized = digits;

  if (normalized.length === 12 && normalized.startsWith("91")) {
    normalized = normalized.slice(2);
  } else if (normalized.length === 11 && normalized.startsWith("0")) {
    normalized = normalized.slice(1);
  }

  if (normalized.length !== 10) {
    return {
      ok: false,
      error: "Phone number must be a valid 10-digit number after normalization",
    };
  }

  const phoneNumber = Number(normalized);
  if (!Number.isFinite(phoneNumber) || phoneNumber <= 0) {
    return { ok: false, error: "Please provide a valid phone number" };
  }

  return { ok: true, phoneNumber };
}
