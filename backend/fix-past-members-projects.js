/**
 * One-time fix script: Remove all terminated/offboarded employees from projects.
 *
 * This is needed because the status change route had an ordering bug that
 * prevented projectRemovalService from running when status was set to
 * terminated/offboarded. Run this once to clean up existing data.
 *
 * Usage: node fix-past-members-projects.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ No MONGO_URI found in .env");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("✅ Connected to MongoDB");

// Inline the models to avoid circular imports
const User = (await import("./src/models/userModel.js")).default;
const Project = (await import("./src/models/projectModel.js")).default;

// Find all past members
const pastMembers = await User.find({
  status: { $in: ["terminated", "offboarded"] },
}).select("_id name status employeeId");

if (pastMembers.length === 0) {
  console.log("ℹ️  No terminated/offboarded employees found.");
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`\nFound ${pastMembers.length} past member(s) to process:\n`);

let totalProjectsFixed = 0;

for (const emp of pastMembers) {
  const employeeId = emp._id;

  // Find all projects where this employee appears
  const projects = await Project.find({
    $or: [
      { assignedUsers: employeeId },
      { teamMembers: employeeId },
      { projectHead: employeeId },
    ],
  }).select("_id name assignedUsers teamMembers projectHead");

  if (projects.length === 0) {
    console.log(`  ✓ ${emp.name} (${emp.status}) — already removed from all projects`);
    continue;
  }

  let fixed = 0;
  for (const project of projects) {
    try {
      const update = {};

      if (project.assignedUsers?.some((id) => id.toString() === employeeId.toString())) {
        update.$pull = { ...(update.$pull || {}), assignedUsers: employeeId };
      }
      if (project.teamMembers?.some((id) => id.toString() === employeeId.toString())) {
        update.$pull = { ...(update.$pull || {}), teamMembers: employeeId };
      }
      if (project.projectHead?.toString() === employeeId.toString()) {
        update.$set = { projectHead: null };
      }

      if (Object.keys(update).length > 0) {
        await Project.findByIdAndUpdate(project._id, update);
        fixed++;
        console.log(`    → Removed from project: "${project.name}"`);
      }
    } catch (err) {
      console.error(`    ✗ Failed to update project "${project.name}": ${err.message}`);
    }
  }

  console.log(`  ✓ ${emp.name} (${emp.status}) — removed from ${fixed} project(s)`);
  totalProjectsFixed += fixed;
}

console.log(`\n✅ Done. Total project memberships cleaned up: ${totalProjectsFixed}`);
await mongoose.disconnect();
