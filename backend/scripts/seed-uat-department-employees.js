/**
 * Idempotent UAT seed — one demo employee per canonical department (+ HoD for key depts).
 *
 * Usage (from backend/, MONGO_URI → crm-uat):
 *   npm run seed:uat:employees
 *
 * Also runs seed:departments first if departments are missing.
 * Demo password for new users: UatDemo@2026
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";
import Department from "../src/models/departmentModel.js";
import {
  CANONICAL_DEPARTMENT_NAMES,
  getDefaultDepartmentType,
  resolveCanonicalDepartmentName,
} from "../src/constants/departmentNames.js";

dotenv.config();

const DEMO_PASSWORD = "UatDemo@2026";
const DEMO_DOMAIN = "@demo.wealll.local";

/** @type {Record<string, { description: string }>} */
const DEPARTMENT_DESCRIPTIONS = {
  "Content Writing": { description: "Copy, blogs, and written content production" },
  Graphics: { description: "Graphic design and visual creative assets" },
  Development: { description: "Software development and engineering" },
  "Digital Marketing": { description: "Digital campaigns, ads, and online growth" },
  Finance: { description: "Finance, accounts, and payroll administration" },
  General: { description: "General cross-functional work" },
  HR: { description: "Human resources and people operations" },
  IT: { description: "Information technology and internal systems" },
  Posting: { description: "Publishes approved creative content and submits live post URLs" },
  Sales: { description: "Sales, leads, and client acquisition" },
  "Social Media": { description: "Social media planning, content, and community" },
  Telecaller: { description: "Outbound calling and raw lead qualification" },
  "Video Production": { description: "Video editing, motion graphics, and production" },
};

/**
 * @typedef {{ email: string, name: string, role: string, employeeId: string, designation: string, isHod?: boolean }} UserSpec
 */

/** @type {Array<{ department: string, users: UserSpec[] }>} */
const DEPARTMENT_USER_SPECS = [
  {
    department: "Content Writing",
    users: [
      {
        email: `uat-content-hod${DEMO_DOMAIN}`,
        name: "UAT Content Writing HoD",
        role: "hod",
        employeeId: "UAT-CWH001",
        designation: "Head of Content Writing",
        isHod: true,
      },
      {
        email: `uat-content-emp${DEMO_DOMAIN}`,
        name: "UAT Content Writer",
        role: "employee",
        employeeId: "UAT-CWE001",
        designation: "Content Writer",
      },
    ],
  },
  {
    department: "Graphics",
    users: [
      {
        email: `uat-graphics-hod${DEMO_DOMAIN}`,
        name: "UAT Graphics HoD",
        role: "hod",
        employeeId: "UAT-GFH001",
        designation: "Head of Graphics",
        isHod: true,
      },
      {
        email: `uat-graphics-emp${DEMO_DOMAIN}`,
        name: "UAT Graphic Designer",
        role: "employee",
        employeeId: "UAT-GFE001",
        designation: "Graphic Designer",
      },
    ],
  },
  {
    department: "Development",
    users: [
      {
        email: `uat-dev-hod${DEMO_DOMAIN}`,
        name: "UAT Development HoD",
        role: "hod",
        employeeId: "UAT-DVH001",
        designation: "Head of Development",
        isHod: true,
      },
      {
        email: `uat-dev-emp${DEMO_DOMAIN}`,
        name: "UAT Developer",
        role: "employee",
        employeeId: "UAT-DVE001",
        designation: "Software Developer",
      },
    ],
  },
  {
    department: "Digital Marketing",
    users: [
      {
        email: `uat-digital-hod${DEMO_DOMAIN}`,
        name: "UAT Digital Marketing HoD",
        role: "hod",
        employeeId: "UAT-DMH001",
        designation: "Head of Digital Marketing",
        isHod: true,
      },
      {
        email: `uat-digital-emp${DEMO_DOMAIN}`,
        name: "UAT Digital Marketer",
        role: "employee",
        employeeId: "UAT-DME001",
        designation: "Digital Marketing Executive",
      },
    ],
  },
  {
    department: "Finance",
    users: [
      {
        email: `uat-finance-emp${DEMO_DOMAIN}`,
        name: "UAT Finance Executive",
        role: "employee",
        employeeId: "UAT-FNE001",
        designation: "Finance Executive",
      },
    ],
  },
  {
    department: "General",
    users: [
      {
        email: `uat-general-emp${DEMO_DOMAIN}`,
        name: "UAT General Staff",
        role: "employee",
        employeeId: "UAT-GEN001",
        designation: "Operations Associate",
      },
    ],
  },
  {
    department: "HR",
    users: [
      {
        email: `hr-uat${DEMO_DOMAIN}`,
        name: "UAT HR Manager",
        role: "hr",
        employeeId: "UAT-HR001",
        designation: "HR Manager",
      },
    ],
  },
  {
    department: "IT",
    users: [
      {
        email: `uat-it-emp${DEMO_DOMAIN}`,
        name: "UAT IT Support",
        role: "employee",
        employeeId: "UAT-ITE001",
        designation: "IT Support Engineer",
      },
    ],
  },
  {
    department: "Posting",
    users: [
      {
        email: `uat-posting-hod${DEMO_DOMAIN}`,
        name: "UAT Posting HoD",
        role: "hod",
        employeeId: "UAT-PSTH001",
        designation: "Head of Posting",
        isHod: true,
      },
      {
        email: `uat-posting-emp${DEMO_DOMAIN}`,
        name: "UAT Posting Executive",
        role: "employee",
        employeeId: "UAT-PSTE001",
        designation: "Posting Executive",
      },
    ],
  },
  {
    department: "Sales",
    users: [
      {
        email: `uat-sales-hod${DEMO_DOMAIN}`,
        name: "UAT Sales HoD",
        role: "hod",
        employeeId: "UAT-SLH001",
        designation: "Head of Sales",
        isHod: true,
      },
      {
        email: `uat-sales-emp${DEMO_DOMAIN}`,
        name: "UAT Sales Executive",
        role: "sales",
        employeeId: "UAT-SLE001",
        designation: "Sales Executive",
      },
    ],
  },
  {
    department: "Social Media",
    users: [
      {
        email: `uat-social-hod${DEMO_DOMAIN}`,
        name: "UAT Social Media HoD",
        role: "hod",
        employeeId: "UAT-SMH001",
        designation: "Head of Social Media",
        isHod: true,
      },
      {
        email: `uat-social-emp${DEMO_DOMAIN}`,
        name: "UAT Social Media Executive",
        role: "employee",
        employeeId: "UAT-SME001",
        designation: "Social Media Executive",
      },
    ],
  },
  {
    department: "Telecaller",
    users: [
      {
        email: `uat-telecaller-emp${DEMO_DOMAIN}`,
        name: "UAT Telecaller",
        role: "employee",
        employeeId: "UAT-TCE001",
        designation: "Telecaller",
      },
    ],
  },
  {
    department: "Video Production",
    users: [
      {
        email: `uat-video-hod${DEMO_DOMAIN}`,
        name: "UAT Video Production HoD",
        role: "hod",
        employeeId: "UAT-VPH001",
        designation: "Head of Video Production",
        isHod: true,
      },
      {
        email: `uat-video-emp${DEMO_DOMAIN}`,
        name: "UAT Video Editor",
        role: "employee",
        employeeId: "UAT-VPE001",
        designation: "Video Editor",
      },
    ],
  },
];

function assertSafeDatabase(dbName) {
  if (!dbName || dbName === "crm-database" || dbName.includes("prod")) {
    console.error(
      `Refusing to seed — database "${dbName}" looks like production. Use crm-uat.`
    );
    process.exit(1);
  }
}

/**
 * @param {string} name
 */
async function ensureDepartment(name) {
  const allDepartments = await Department.find().lean();
  const existing = allDepartments.find(
    (dept) => resolveCanonicalDepartmentName(dept.name) === name
  );

  if (existing) {
    if (existing.name !== name) {
      const conflict = await Department.findOne({ name });
      if (!conflict) {
        await Department.findByIdAndUpdate(existing._id, { name });
        return Department.findById(existing._id);
      }
    }
    return Department.findById(existing._id);
  }

  return Department.create({
    name,
    description: DEPARTMENT_DESCRIPTIONS[name]?.description || name,
    type: getDefaultDepartmentType(name),
    status: "active",
  });
}

/**
 * @param {UserSpec} spec
 * @param {import("mongoose").Types.ObjectId} departmentId
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
    isHeadOfDepartment: Boolean(spec.isHod),
  };

  if (existing) {
    await User.updateOne({ _id: existing._id }, { $set: payload });
    console.log(`  ~ User updated: ${spec.email}`);
    return User.findById(existing._id);
  }

  await User.create({
    ...payload,
    email: spec.email,
    password: passwordHash,
  });
  console.log(`  + User created: ${spec.email}`);
  return User.findOne({ email: spec.email });
}

async function seedUatDepartmentEmployees() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  const dbName = process.env.MONGO_URI.split("/").pop()?.split("?")[0] || "";
  assertSafeDatabase(dbName);

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${dbName}\n`);

  for (const name of CANONICAL_DEPARTMENT_NAMES) {
    await ensureDepartment(name);
  }
  console.log("Departments ready.\n");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, salt);

  for (const group of DEPARTMENT_USER_SPECS) {
    const department = await Department.findOne({ name: group.department });
    if (!department) {
      console.warn(`  ! Skipped ${group.department} — department not found`);
      continue;
    }

    console.log(`Department: ${group.department}`);
    let hodUser = null;

    for (const spec of group.users) {
      const user = await upsertUser(spec, department._id, passwordHash);
      if (spec.isHod) hodUser = user;
    }

    if (hodUser && String(department.head) !== String(hodUser._id)) {
      department.head = hodUser._id;
      department.headAssignedAt = new Date();
      await department.save();
      console.log(`  ~ Assigned HoD: ${hodUser.email}`);
    }

    console.log("");
  }

  const summary = await Promise.all(
    CANONICAL_DEPARTMENT_NAMES.map(async (name) => {
      const dept = await Department.findOne({ name });
      if (!dept) return { name, count: 0 };
      const count = await User.countDocuments({
        department: dept._id,
        status: "active",
      });
      return { name, count };
    })
  );

  console.log("✅ UAT department employees seed complete.\n");
  console.log("Active employees per canonical department:");
  summary.forEach(({ name, count }) => {
    console.log(`  - ${name}: ${count}`);
  });

  console.log(`\nDemo password (new users): ${DEMO_PASSWORD}`);
  console.log("Sample creative workflow logins:");
  console.log(`  - ${`uat-graphics-emp${DEMO_DOMAIN}`} (Graphics)`);
  console.log(`  - ${`uat-video-emp${DEMO_DOMAIN}`} (Video Production)`);
  console.log(`  - ${`uat-posting-emp${DEMO_DOMAIN}`} (Posting handoff)`);
  console.log(`  - ${`uat-sales-emp${DEMO_DOMAIN}`} (Sales CRM)`);

  await mongoose.disconnect();
}

seedUatDepartmentEmployees().catch((err) => {
  console.error("seed-uat-department-employees failed:", err.message);
  process.exit(1);
});
