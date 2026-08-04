/**
 * PH-10 helper: call month dual-run API and write CSV locally.
 *
 * Usage (from backend/):
 *   node scripts/run-dual-run-month.js --base https://staging.example.com --token <JWT> --month 6 --year 2026
 *
 * Env alternatives: PAYROLL_API_BASE, PAYROLL_API_TOKEN, PAYROLL_DUAL_MONTH, PAYROLL_DUAL_YEAR
 * Does not set PAYROLL_V2_ENGINE.
 */

import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const out = {
    base: process.env.PAYROLL_API_BASE || "",
    token: process.env.PAYROLL_API_TOKEN || "",
    month: Number(process.env.PAYROLL_DUAL_MONTH) || 0,
    year: Number(process.env.PAYROLL_DUAL_YEAR) || 0,
    mismatchesOnly: true,
    outDir: path.resolve(process.cwd(), "tmp"),
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--base" && next) {
      out.base = next;
      i += 1;
    } else if (a === "--token" && next) {
      out.token = next;
      i += 1;
    } else if (a === "--month" && next) {
      out.month = Number(next);
      i += 1;
    } else if (a === "--year" && next) {
      out.year = Number(next);
      i += 1;
    } else if (a === "--all") {
      out.mismatchesOnly = false;
    } else if (a === "--out" && next) {
      out.outDir = path.resolve(next);
      i += 1;
    }
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.base || !opts.token || !opts.month || !opts.year) {
    console.error(
      "Required: --base <api-origin> --token <jwt> --month <1-12> --year <YYYY>"
    );
    process.exit(1);
  }

  const url = new URL("/api/payroll/runs/dual-run/month", opts.base);
  url.searchParams.set("format", "csv");
  url.searchParams.set("mismatchesOnly", String(opts.mismatchesOnly));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
      Accept: "text/csv",
    },
    body: JSON.stringify({
      month: opts.month,
      year: opts.year,
      mismatchesOnly: opts.mismatchesOnly,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}`, text.slice(0, 500));
    process.exit(1);
  }

  fs.mkdirSync(opts.outDir, { recursive: true });
  const fileName = `dual-run-${opts.year}-${String(opts.month).padStart(2, "0")}.csv`;
  const filePath = path.join(opts.outDir, fileName);
  fs.writeFileSync(filePath, text, "utf8");

  const meta = text.split(/\r?\n/, 1)[0] || "";
  console.log(meta);
  console.log(`Wrote ${filePath}`);
  console.log(
    "Next: triage mismatches, fill DUAL_RUN_DECISION_LOG.md, then PH-11 Finance/CTO sign-off."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
