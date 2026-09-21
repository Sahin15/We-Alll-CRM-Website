/**
 * Find employees whose leave balance may be wrong (IST year vs leaveYear mismatch, negative remaining).
 * Usage: node backend/scripts/audit-leave-balance-anomalies.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getCurrentLeaveYear } from "../src/utils/leaveAccrual.js";
import { getISTDateKey, getISTMidnightForYmd } from "../src/utils/timezone.js";

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

  const year = getCurrentLeaveYear();
  const yearStart = getISTMidnightForYmd(year, 1, 1);
  const yearEnd = getISTMidnightForYmd(year + 1, 1, 1);

  const employees = await User.find({
    status: "active",
    role: { $in: ["employee", "hod", "hr", "accounts", "manager"] },
  }).select("name employeeId employmentType joiningDate fullTimeStartDate internshipDetails");

  const mismatchedLeaveYear = await LeaveRequest.find({
    status: "approved",
    leaveYear: { $ne: year },
    startDate: { $gte: yearStart, $lt: yearEnd },
  }).select("employee leaveType startDate leaveYear numberOfDays source reason");

  console.log(`\n--- Leave balance audit (IST year ${year}) ---\n`);
  console.log(`Approved leaves with wrong leaveYear but IST start in ${year}: ${mismatchedLeaveYear.length}`);

  for (const leave of mismatchedLeaveYear.slice(0, 20)) {
    const istYear = parseInt(getISTDateKey(leave.startDate).slice(0, 4), 10);
    console.log(
      `  leaveYear=${leave.leaveYear} istYear=${istYear} emp=${leave.employee} days=${leave.numberOfDays} start=${getISTDateKey(leave.startDate)}`
    );
  }

  let negativeRemaining = 0;
  let zeroEarnedFullTime = 0;

  for (const emp of employees) {
    const balance = await LeaveRequest.getLeaveBalance(emp._id, year);
    if (!LeaveRequest.isFullTimeEmployee(emp)) continue;

    if (balance.earned.remaining < 0) {
      negativeRemaining += 1;
      console.log(
        `NEGATIVE: ${emp.name} (${emp.employeeId || emp._id}) remaining=${balance.earned.remaining} earned=${balance.earned.earned} used=${balance.earned.used}`
      );
    }

    if (balance.earned.earned === 0 && emp.joiningDate) {
      const joinKey = getISTDateKey(emp.joiningDate);
      if (parseInt(joinKey.slice(0, 4), 10) <= year) {
        zeroEarnedFullTime += 1;
        console.log(
          `ZERO EARNED: ${emp.name} join=${joinKey} earned=${balance.earned.earned} used=${balance.earned.used}`
        );
      }
    }
  }

  console.log("\n--- Summary ---");
  console.log({
    employees: employees.length,
    mismatchedLeaveYear: mismatchedLeaveYear.length,
    negativeRemaining,
    zeroEarnedFullTime,
  });

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
