/**
 * Dual-run month report shaping (R3).
 * Keeps CSV / filter / sort out of the Express controller.
 */

import { rowsToCsv } from "./reporting/csvUtils.js";

const CSV_HEADERS = [
  "employeeId",
  "withinTolerance",
  "v1Net",
  "v2Net",
  "netDiff",
  "error",
];

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function parseBool(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") return false;
  const s = String(value).toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

/**
 * @param {{ query?: Record<string, unknown>, body?: Record<string, unknown> }} req
 * @returns {{ format: "json" | "csv", mismatchesOnly: boolean }}
 */
export function parseDualRunMonthOptions(req = {}) {
  const query = req.query || {};
  const body = req.body || {};
  const rawFormat = String(query.format ?? body.format ?? "json").toLowerCase();
  return {
    format: rawFormat === "csv" ? "csv" : "json",
    mismatchesOnly: parseBool(query.mismatchesOnly ?? body.mismatchesOnly),
  };
}

/**
 * Filter and sort dual-run month rows for triage.
 * Summary counts must be computed from the full run before calling this.
 *
 * @param {Array<Record<string, unknown>>} results
 * @param {{ mismatchesOnly?: boolean }} [options]
 * @returns {Array<Record<string, unknown>>}
 */
export function shapeDualRunMonthResults(results = [], options = {}) {
  const mismatchesOnly = Boolean(options.mismatchesOnly);
  let rows = Array.isArray(results) ? [...results] : [];

  if (mismatchesOnly) {
    rows = rows.filter(
      (r) => r.error || r.withinTolerance === false
    );
  }

  rows.sort((a, b) => {
    const aErr = Boolean(a.error);
    const bErr = Boolean(b.error);
    if (aErr !== bErr) return aErr ? -1 : 1;
    const da = Math.abs(Number(a.netDiff) || 0);
    const db = Math.abs(Number(b.netDiff) || 0);
    return db - da;
  });

  return rows;
}

/**
 * Build CSV for dual-run month triage (summary as comment line + data rows).
 *
 * @param {{ total: number, matched: number, mismatched: number, failed: number }} summary
 * @param {Array<Record<string, unknown>>} rows — already shaped
 * @returns {string}
 */
export function dualRunMonthRowsToCsv(summary, rows = []) {
  const meta = `# dual-run-month total=${summary.total} matched=${summary.matched} mismatched=${summary.mismatched} failed=${summary.failed}`;
  const csvRows = rows.map((r) => ({
    employeeId: r.employeeId ?? "",
    withinTolerance:
      r.withinTolerance === undefined || r.withinTolerance === null
        ? ""
        : String(r.withinTolerance),
    v1Net: r.v1Net ?? "",
    v2Net: r.v2Net ?? "",
    netDiff: r.netDiff ?? "",
    error: r.error ?? "",
  }));
  return `${meta}\n${rowsToCsv(CSV_HEADERS, csvRows)}`;
}

export { CSV_HEADERS };
