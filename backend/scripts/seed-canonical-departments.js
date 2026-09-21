/**
 * Idempotent seed: create all canonical ERP departments if missing.
 *
 * Usage (from backend/):
 *   npm run seed:departments
 *
 * Requires MONGO_URI (local .env → crm-uat; UAT server → crm-uat).
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "../src/models/departmentModel.js";
import {
  CANONICAL_DEPARTMENT_NAMES,
  getDefaultDepartmentType,
  resolveCanonicalDepartmentName,
} from "../src/constants/departmentNames.js";

dotenv.config();

const DEPARTMENT_DESCRIPTIONS = {
  "Content Writing": "Copy, blogs, and written content production",
  Graphics: "Graphic design and visual creative assets",
  Development: "Software development and engineering",
  "Digital Marketing": "Digital campaigns, ads, and online growth",
  Finance: "Finance, accounts, and payroll administration",
  General: "General cross-functional work",
  HR: "Human resources and people operations",
  IT: "Information technology and internal systems",
  Posting: "Publishes approved creative content and submits live post URLs",
  Sales: "Sales, leads, and client acquisition",
  "Social Media": "Social media planning, content, and community",
  Telecaller: "Outbound calling and raw lead qualification",
  "Video Production": "Video editing, motion graphics, and production",
};

async function seedCanonicalDepartments() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const dbName = mongoose.connection.db.databaseName;
  console.log(`Connected to database: ${dbName}\n`);

  const allDepartments = await Department.find().lean();
  let created = 0;
  let skipped = 0;
  let renamed = 0;

  for (const name of CANONICAL_DEPARTMENT_NAMES) {
    const existing = allDepartments.find(
      (dept) => resolveCanonicalDepartmentName(dept.name) === name
    );

    if (existing) {
      if (existing.name !== name) {
        const conflict = allDepartments.find((dept) => dept.name === name);
        if (!conflict) {
          console.log(`  ~ Renaming "${existing.name}" → "${name}"`);
          await Department.findByIdAndUpdate(existing._id, { name });
          renamed += 1;
        } else {
          console.log(
            `  ~ Skipped rename "${existing.name}" (canonical "${name}" already exists)`
          );
          skipped += 1;
        }
      } else {
        console.log(`  ✓ Exists: ${name}`);
        skipped += 1;
      }
      continue;
    }

    const department = await Department.create({
      name,
      description: DEPARTMENT_DESCRIPTIONS[name] || name,
      type: getDefaultDepartmentType(name),
      status: "active",
    });
    console.log(`  + Created: ${name} (${department.type})`);
    created += 1;
    allDepartments.push(department.toObject());
  }

  const total = await Department.countDocuments();
  console.log(
    `\nDone. Created: ${created}, renamed: ${renamed}, already present: ${skipped}`
  );
  console.log(`Total departments in ${dbName}: ${total}`);

  await mongoose.disconnect();
}

seedCanonicalDepartments().catch((err) => {
  console.error("seed-canonical-departments failed:", err.message);
  process.exit(1);
});
