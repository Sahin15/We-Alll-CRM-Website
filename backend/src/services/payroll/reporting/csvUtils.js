/**
 * Shared CSV helpers for payroll reporting exports.
 * Keep formatting here so bank/compliance builders stay free of escaping logic.
 */

/**
 * Escape a single CSV field (RFC-style quotes).
 * @param {unknown} value
 * @returns {string}
 */
export function escapeCsvField(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert header + row objects into a CSV string.
 * @param {string[]} headers
 * @param {Array<Record<string, unknown>>} rows
 * @returns {string}
 */
export function rowsToCsv(headers, rows) {
  const lines = [headers.map(escapeCsvField).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export default { escapeCsvField, rowsToCsv };
