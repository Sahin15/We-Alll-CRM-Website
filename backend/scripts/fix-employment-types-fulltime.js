/**
 * Correct employment types: permanent staff were wrongly marked as intern.
 *
 * Rules:
 * - Has permanent employeeId (WA-*) -> full-time
 * - HR / HOD / Manager / Accounts roles -> full-time
 * - Otherwise stays intern (no earned leave)
 *
 * Usage: node backend/scripts/fix-employment-types-fulltime.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const FULL_TIME_ROLES = ["hr", "hod", "manager", "accounts"];

async function run() {
  await mongoose.connect(MONGODB_URI);
  const User = (await import("../src/models/userModel.js")).default;
  const LeaveRequest = (await import("../src/models/leaveRequestModel.js")).default;

  const users = await User.find({
    role: { $ne: "superadmin" },
  }).select("name email role employmentType employeeId joiningDate fullTimeStartDate internshipDetails");

  let setFullTime = 0;
  let keptIntern = 0;

  for (const user of users) {
    const hasPermanentId =
      user.employeeId && /^WA-\d{2}-\d+/i.test(user.employeeId);
    const isLeadershipRole = FULL_TIME_ROLES.includes(user.role);
    const shouldBeFullTime = hasPermanentId || isLeadershipRole;

    if (shouldBeFullTime) {
      let changed = false;
      if (user.employmentType !== "full-time") {
        user.employmentType = "full-time";
        changed = true;
      }
      if (user.internshipDetails?.isActive) {
        user.internshipDetails.isActive = false;
        changed = true;
      }
      if (!user.fullTimeStartDate) {
        user.fullTimeStartDate = user.joiningDate || new Date();
        changed = true;
      }
      if (changed) {
        await user.save();
        setFullTime++;
        const bal = await LeaveRequest.getLeaveBalance(user._id);
        console.log(
          `✓ full-time: ${user.name} | earned=${bal.earned.earned} | remaining=${bal.earned.remaining}`
        );
      }
    } else {
      keptIntern++;
      console.log(`  intern (unchanged): ${user.name}`);
    }
  }

  console.log("\n--- Done ---", { setFullTime, keptIntern, total: users.length });
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
