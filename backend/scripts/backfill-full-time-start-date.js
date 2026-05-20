/**
 * Backfill fullTimeStartDate for existing full-time employees.
 * Uses joiningDate as the accrual anchor when fullTimeStartDate is not set.
 *
 * Usage: node backend/scripts/backfill-full-time-start-date.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI or MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const User = (await import("../src/models/userModel.js")).default;

  const employees = await User.find({
    $and: [
      {
        $or: [
          { employmentType: "full-time" },
          { employmentType: { $exists: false } },
          { employmentType: null },
        ],
      },
      {
        $or: [
          { fullTimeStartDate: { $exists: false } },
          { fullTimeStartDate: null },
        ],
      },
    ],
  }).select("name email employmentType joiningDate fullTimeStartDate createdAt");

  let updated = 0;
  let skipped = 0;

  for (const emp of employees) {
    const employmentType = emp.employmentType || "full-time";
    if (employmentType !== "full-time") {
      skipped++;
      continue;
    }

    const anchor = emp.joiningDate || emp.createdAt || new Date();
    emp.fullTimeStartDate = anchor;
    await emp.save();
    updated++;
    console.log(`✓ ${emp.name}: fullTimeStartDate = ${anchor.toISOString().split("T")[0]}`);
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
