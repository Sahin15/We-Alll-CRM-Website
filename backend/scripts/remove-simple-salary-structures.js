/**
 * Remove Simple Payroll (payrollMode: "simple") salary structures created for testing.
 *
 * Usage:
 *   node scripts/remove-simple-salary-structures.js              # dry-run (list only)
 *   node scripts/remove-simple-salary-structures.js --execute     # delete for real
 *   node scripts/remove-simple-salary-structures.js --execute --with-adjustments
 *
 * Env: loads backend/.env (MONGO_URI). Override with MONGO_URI=... if needed.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import SalaryStructure from "../src/models/salaryStructureModel.js";
import PayrollAdjustment from "../src/models/payrollAdjustmentModel.js";
import "../src/models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const EXECUTE = process.argv.includes("--execute");
const WITH_ADJUSTMENTS = process.argv.includes("--with-adjustments");

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in backend/.env");
    process.exit(1);
  }

  console.log(EXECUTE ? "MODE: EXECUTE (will delete)" : "MODE: DRY-RUN (list only)");
  console.log("Connecting…");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.\n");

  const simples = await SalaryStructure.find({ payrollMode: "simple" })
    .populate("employee", "name email employeeId")
    .sort({ createdAt: -1 })
    .lean();

  console.log(`Found ${simples.length} simple salary structure(s):\n`);
  for (const [i, s] of simples.entries()) {
    console.log(
      `${i + 1}. ${s.employee?.name || "Unknown"} (${s.employee?.email || "—"})`
    );
    console.log(`   _id: ${s._id}`);
    console.log(`   status: ${s.status} | monthlySalary: ${s.monthlySalary ?? "—"}`);
    console.log(
      `   effectiveFrom: ${s.effectiveFrom ? new Date(s.effectiveFrom).toISOString().slice(0, 10) : "—"}`
    );
    console.log(`   notes: ${s.notes || "—"}`);
    console.log("");
  }

  if (simples.length === 0) {
    console.log("Nothing to remove.");
    await mongoose.connection.close();
    process.exit(0);
  }

  const employeeIds = [
    ...new Set(
      simples
        .map((s) => s.employee?._id || s.employee)
        .filter(Boolean)
        .map(String)
    ),
  ];

  const adjustmentFilter = {
    employee: { $in: employeeIds },
    type: { $in: ["absent_deduction", "leave_balance_deduction"] },
  };
  const adjCount = await PayrollAdjustment.countDocuments(adjustmentFilter);
  console.log(
    `Related simple payroll adjustments (absent / leave_balance) for those employees: ${adjCount}`
  );
  if (WITH_ADJUSTMENTS) {
    console.log("(will also remove those adjustments when --execute)");
  } else {
    console.log("(pass --with-adjustments to delete those too)");
  }

  if (!EXECUTE) {
    console.log(
      "\nDry-run complete. Re-run with --execute to delete these structures."
    );
    await mongoose.connection.close();
    process.exit(0);
  }

  const ids = simples.map((s) => s._id);
  const structResult = await SalaryStructure.deleteMany({ _id: { $in: ids } });
  console.log(`\nDeleted salary structures: ${structResult.deletedCount}`);

  if (WITH_ADJUSTMENTS && adjCount > 0) {
    const adjResult = await PayrollAdjustment.deleteMany(adjustmentFilter);
    console.log(`Deleted payroll adjustments: ${adjResult.deletedCount}`);
  }

  const remainingSimple = await SalaryStructure.countDocuments({
    payrollMode: "simple",
  });
  console.log(`Remaining simple structures: ${remainingSimple}`);

  await mongoose.connection.close();
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
