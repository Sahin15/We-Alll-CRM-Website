/**
 * Backfill employmentType for all staff so leave eligibility works correctly.
 *
 * - Active interns (employmentType intern OR internshipDetails.isActive) -> intern
 * - Everyone else without valid full-time type -> full-time
 * - Clear internshipDetails.isActive for non-interns
 *
 * Usage: node backend/scripts/backfill-employment-types.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const VALID_TYPES = ["full-time", "part-time", "intern", "freelancer", "contract"];

async function run() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI or MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const User = (await import("../src/models/userModel.js")).default;

  const users = await User.find({
    role: { $ne: "superadmin" },
  }).select("name email role status employmentType internshipDetails joiningDate fullTimeStartDate");

  let setFullTime = 0;
  let setIntern = 0;
  let clearedInternFlag = 0;
  let setFullTimeStart = 0;

  for (const user of users) {
    let type = user.employmentType?.trim?.() || user.employmentType || null;
    // Only explicit intern type — do NOT use isActive alone (it wrongly flagged everyone)
    const isIntern = type === "intern";

    let changed = false;

    if (isIntern) {
      if (type !== "intern") {
        const previous = type;
        user.employmentType = "intern";
        setIntern++;
        changed = true;
        console.log(`→ intern: ${user.name} (was: ${previous || "unset"})`);
      }
      if (!user.internshipDetails?.isActive) {
        if (!user.internshipDetails) user.internshipDetails = {};
        user.internshipDetails.isActive = true;
        changed = true;
      }
    } else {
      if (!type || !VALID_TYPES.includes(type)) {
        user.employmentType = "full-time";
        setFullTime++;
        changed = true;
        console.log(`→ full-time: ${user.name} (was: ${type || "unset"})`);
      }

      if (user.internshipDetails?.isActive) {
        user.internshipDetails.isActive = false;
        clearedInternFlag++;
        changed = true;
      }

      if (user.employmentType === "full-time" && !user.fullTimeStartDate) {
        user.fullTimeStartDate = user.joiningDate || user.createdAt || new Date();
        setFullTimeStart++;
        changed = true;
      }
    }

    if (changed) {
      await user.save();
    }
  }

  console.log("\n--- Backfill complete ---");
  console.log({ setFullTime, setIntern, clearedInternFlag, setFullTimeStart, total: users.length });
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
