/**
 * One-time: set SalarySlip.paymentDate from PayrollPeriod.salaryPaymentDate
 * when the period has a saved HR payment date.
 *
 * Usage (from backend/):
 *   node scripts/backfillSlipPaymentDates.js
 *   node scripts/backfillSlipPaymentDates.js --dry-run
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import SalarySlip from "../src/models/salarySlipModel.js";
import PayrollPeriod from "../src/models/payrollPeriodModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const periods = await PayrollPeriod.find({
    salaryPaymentDate: { $ne: null },
  }).lean();

  const periodMap = new Map(
    periods.map((p) => [`${p.year}-${p.month}`, p.salaryPaymentDate])
  );

  let updated = 0;
  let skipped = 0;
  let unchanged = 0;

  const slips = await SalarySlip.find({}).select("month year paymentDate").lean();

  for (const slip of slips) {
    const key = `${slip.year}-${slip.month}`;
    const target = periodMap.get(key);
    if (!target) {
      skipped++;
      continue;
    }
    const targetTime = new Date(target).getTime();
    const currentTime = slip.paymentDate
      ? new Date(slip.paymentDate).getTime()
      : null;
    if (currentTime === targetTime) {
      unchanged++;
      continue;
    }
    if (dryRun) {
      console.log(
        `[dry-run] slip ${slip._id} ${slip.month}/${slip.year} → ${new Date(target).toISOString()}`
      );
    } else {
      await SalarySlip.updateOne(
        { _id: slip._id },
        { $set: { paymentDate: new Date(target) } }
      );
    }
    updated++;
  }

  console.log({
    dryRun,
    periodsWithPaymentDate: periods.length,
    slipsScanned: slips.length,
    updated,
    skippedNoPeriodDate: skipped,
    unchanged,
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
