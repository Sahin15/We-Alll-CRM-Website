/**
 * Audit employmentType and leave eligibility for all active employees.
 * Usage: node backend/scripts/audit-employment-types.js
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
  const LeaveRequest = (await import("../src/models/leaveRequestModel.js")).default;

  const employees = await User.find({
    status: "active",
    role: { $in: ["employee", "hod", "hr", "accounts", "manager"] },
  }).select("name email employmentType internshipDetails joiningDate");

  const stats = {
    total: employees.length,
    unset: 0,
    fullTime: 0,
    intern: 0,
    other: 0,
    internshipActive: 0,
    eligibleForPaidLeave: 0,
    notEligible: 0,
  };

  console.log("\n--- Employment Type Audit ---\n");

  for (const emp of employees) {
    const type = emp.employmentType ?? "(unset)";
    const internActive = emp.internshipDetails?.isActive;
    const isFT = LeaveRequest.isFullTimeEmployee(emp);
    const balance = await LeaveRequest.getLeaveBalance(emp._id);

    if (!emp.employmentType) stats.unset++;
    else if (emp.employmentType === "full-time") stats.fullTime++;
    else if (emp.employmentType === "intern") stats.intern++;
    else stats.other++;

    if (internActive) stats.internshipActive++;
    if (isFT) stats.eligibleForPaidLeave++;
    else stats.notEligible++;

    if (!isFT || balance.earned.earned === 0) {
      console.log(
        `NOT ELIGIBLE: ${emp.name} | type=${type} | internActive=${internActive} | earned=${balance.earned.earned} | eligible=${balance.eligibleForPaidLeave}`
      );
    }
  }

  console.log("\n--- Summary ---");
  console.log(stats);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
