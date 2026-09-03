/**
 * PH-10: In-process month dual-run (uses backend/.env MONGO_URI).
 * Does not set PAYROLL_V2_ENGINE. Writes CSV under backend/tmp/.
 *
 * Usage (from backend/):
 *   node scripts/run-dual-run-month-local.js --month 7 --year 2026
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

function parseArgs(argv) {
  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear =
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const out = {
    month: defaultMonth,
    year: defaultYear,
    mismatchesOnly: true,
    outDir: path.resolve(process.cwd(), "tmp"),
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--month" && next) {
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
  if (!opts.month || !opts.year || opts.month < 1 || opts.month > 12) {
    console.error("Valid --month 1-12 and --year required");
    process.exit(1);
  }

  if (String(process.env.PAYROLL_V2_ENGINE || "").toLowerCase() === "true") {
    console.warn(
      "WARNING: PAYROLL_V2_ENGINE=true in this env — dual-run still OK; do not treat as cutover."
    );
  } else {
    console.log("PAYROLL_V2_ENGINE is off (expected for PH-10)");
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }

  await mongoose.connect(uri);

  // Register models used by leave/attendance populate paths
  await import("../src/models/userModel.js");
  await import("../src/models/leaveRequestModel.js");
  await import("../src/models/attendanceModel.js");
  await import("../src/models/salaryStructureModel.js");

  const SalaryStructure = (
    await import("../src/models/salaryStructureModel.js")
  ).default;
  const { processEmployeePayroll } = await import(
    "../src/services/payroll/payrollEngine.js"
  );
  const {
    shapeDualRunMonthResults,
    dualRunMonthRowsToCsv,
  } = await import("../src/services/payroll/dualRunMonthReport.js");

  const structures = await SalaryStructure.find({ status: "active" })
    .select("employee")
    .lean();
  const employeeIds = [
    ...new Set(structures.map((s) => String(s.employee))),
  ];

  console.log(
    `Dual-run ${opts.year}-${String(opts.month).padStart(2, "0")} cohort=${employeeIds.length}`
  );

  const results = [];
  let matched = 0;
  let mismatched = 0;
  let failed = 0;

  for (const employeeId of employeeIds) {
    try {
      const result = await processEmployeePayroll({
        employeeId,
        month: opts.month,
        year: opts.year,
      });
      if (result.dual.diff.withinTolerance) matched += 1;
      else mismatched += 1;
      results.push({
        employeeId,
        withinTolerance: result.dual.diff.withinTolerance,
        netDiff: result.dual.diff.netSalary,
        v1Net: result.dual.v1.totals.netSalary,
        v2Net: result.dual.v2.totals.netSalary,
      });
    } catch (err) {
      failed += 1;
      results.push({
        employeeId,
        error: err.message,
      });
    }
  }

  const summary = {
    total: employeeIds.length,
    matched,
    mismatched,
    failed,
  };
  const shaped = shapeDualRunMonthResults(results, {
    mismatchesOnly: opts.mismatchesOnly,
  });
  const csv = dualRunMonthRowsToCsv(summary, shaped);

  fs.mkdirSync(opts.outDir, { recursive: true });
  const fileName = `dual-run-${opts.year}-${String(opts.month).padStart(2, "0")}.csv`;
  const filePath = path.join(opts.outDir, fileName);
  fs.writeFileSync(filePath, csv, "utf8");

  const meta = `# dual-run-month total=${summary.total} matched=${summary.matched} mismatched=${summary.mismatched} failed=${summary.failed}`;
  console.log(meta);
  console.log(`Wrote ${filePath}`);
  console.log(`Mismatch/error rows in CSV view: ${shaped.length}`);

  await mongoose.disconnect();
  process.exit(summary.failed > 0 || summary.mismatched > 0 ? 2 : 0);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
