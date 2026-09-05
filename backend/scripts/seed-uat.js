/**
 * Idempotent UAT seed — dummy ERP data for uat.wealll.cloud demos.
 * Run: cd backend && node scripts/seed-uat.js
 * Requires MONGO_URI pointing at crm-uat database and APP_ENV=uat recommended.
 *
 * Demo password for all seeded users: UatDemo@2026 (change after first client UAT if needed)
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";
import Department from "../src/models/departmentModel.js";
import Project from "../src/models/projectModel.js";

dotenv.config();

const DEMO_PASSWORD = "UatDemo@2026";
const DEMO_DOMAIN = "@demo.wealll.local";

const DEPARTMENTS = [
  { name: "UAT Engineering", description: "Demo engineering department", type: "operational" },
  { name: "UAT Human Resources", description: "Demo HR department", type: "administrative" },
];

/** @type {Array<{ email: string, name: string, role: string, employeeId: string, designation: string, dept: string, isHod?: boolean }>} */
const DEMO_USERS = [
  {
    email: `admin-uat${DEMO_DOMAIN}`,
    name: "UAT Super Admin",
    role: "superadmin",
    employeeId: "UAT-SA001",
    designation: "Super Administrator",
    dept: "UAT Human Resources",
  },
  {
    email: `hr-uat${DEMO_DOMAIN}`,
    name: "UAT HR Manager",
    role: "hr",
    employeeId: "UAT-HR001",
    designation: "HR Manager",
    dept: "UAT Human Resources",
  },
  {
    email: `hod-uat${DEMO_DOMAIN}`,
    name: "UAT Head of Engineering",
    role: "hod",
    employeeId: "UAT-HOD001",
    designation: "Head of Department",
    dept: "UAT Engineering",
    isHod: true,
  },
  {
    email: `emp1-uat${DEMO_DOMAIN}`,
    name: "UAT Employee One",
    role: "employee",
    employeeId: "UAT-EMP001",
    designation: "Software Engineer",
    dept: "UAT Engineering",
  },
  {
    email: `emp2-uat${DEMO_DOMAIN}`,
    name: "UAT Employee Two",
    role: "employee",
    employeeId: "UAT-EMP002",
    designation: "QA Engineer",
    dept: "UAT Engineering",
  },
  {
    email: `emp3-uat${DEMO_DOMAIN}`,
    name: "UAT Employee Three",
    role: "employee",
    employeeId: "UAT-EMP003",
    designation: "Project Coordinator",
    dept: "UAT Engineering",
  },
];

/**
 * @param {string} name
 * @returns {Promise<import('mongoose').Document>}
 */
async function upsertDepartment(name, meta) {
  let dept = await Department.findOne({ name });
  if (!dept) {
    dept = await Department.create({ name, ...meta, status: "active" });
    console.log(`  + Department: ${name}`);
  }
  return dept;
}

/**
 * @param {object} spec
 * @param {import('mongoose').Types.ObjectId} departmentId
 * @param {string} passwordHash
 */
async function upsertUser(spec, departmentId, passwordHash) {
  const existing = await User.findOne({ email: spec.email });
  const payload = {
    name: spec.name,
    role: spec.role,
    employeeId: spec.employeeId,
    designation: spec.designation,
    department: departmentId,
    status: "active",
    joiningDate: new Date("2025-01-15"),
    phone: "+91 9000000000",
  };

  if (existing) {
    await User.updateOne({ _id: existing._id }, { $set: payload });
    console.log(`  ~ User updated: ${spec.email}`);
    return existing;
  }

  const user = await User.create({
    ...payload,
    email: spec.email,
    password: passwordHash,
    isHeadOfDepartment: Boolean(spec.isHod),
  });
  console.log(`  + User created: ${spec.email}`);
  return user;
}

async function seedUat() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  const dbName = process.env.MONGO_URI.split("/").pop()?.split("?")[0] || "";
  if (dbName === "crm-database" || dbName.includes("prod")) {
    console.error(
      `Refusing to seed — MONGO_URI database "${dbName}" looks like production. Use crm-uat.`
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${dbName || "database"}`);

  const deptMap = {};
  for (const d of DEPARTMENTS) {
    const doc = await upsertDepartment(d.name, {
      description: d.description,
      type: d.type,
    });
    deptMap[d.name] = doc;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, salt);

  const userMap = {};
  for (const spec of DEMO_USERS) {
    const dept = deptMap[spec.dept];
    const user = await upsertUser(spec, dept._id, passwordHash);
    userMap[spec.email] = user;
  }

  const hod = userMap[`hod-uat${DEMO_DOMAIN}`];
  const engDept = deptMap["UAT Engineering"];
  if (hod && engDept && String(engDept.head) !== String(hod._id)) {
    engDept.head = hod._id;
    engDept.headAssignedAt = new Date();
    engDept.headAssignedBy = userMap[`admin-uat${DEMO_DOMAIN}`]?._id;
    await engDept.save();
    console.log("  ~ Assigned HoD to UAT Engineering");
  }

  const projectName = "UAT Demo Website Redesign";
  let project = await Project.findOne({ name: projectName });
  if (!project) {
    project = await Project.create({
      name: projectName,
      description: "Sample project for client UAT walkthroughs",
      department: engDept._id,
      departments: [engDept._id],
      status: "Active",
      priority: "medium",
      progress: 35,
      startDate: new Date("2025-02-01"),
    });
    console.log(`  + Project: ${projectName}`);
  }

  console.log("\n✅ UAT seed complete (idempotent).");
  console.log("Demo logins (@demo.wealll.local) — password:", DEMO_PASSWORD);
  DEMO_USERS.forEach((u) => console.log(`  - ${u.email} (${u.role})`));

  await mongoose.disconnect();
  process.exit(0);
}

seedUat().catch((err) => {
  console.error("UAT seed failed:", err);
  process.exit(1);
});
