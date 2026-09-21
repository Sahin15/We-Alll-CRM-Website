/**
 * Idempotent UAT seed — demo clients with projects for local / staging testing.
 *
 * Usage (from backend/, MONGO_URI → crm-uat):
 *   npm run seed:uat:clients
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Client from "../src/models/clientModel.js";
import Project from "../src/models/projectModel.js";
import Department from "../src/models/departmentModel.js";
import User from "../src/models/userModel.js";

dotenv.config();

const DEMO_DOMAIN = "@demo.wealll.local";

/** @type {Array<object>} */
const DEMO_CLIENTS = [
  {
    email: `client-spice-garden${DEMO_DOMAIN}`,
    name: "Spice Garden Restaurants",
    company: "Spice Garden Restaurants Pvt Ltd",
    phone: 9876501001,
    ownername: "Rajesh Malhotra",
    industry: "Food & Beverage",
    website: "https://demo-spicegarden.wealll.local",
    serviceCompany: "We Alll",
    servicesSubscribed: ["Social Media Marketing", "Graphic Design"],
    planType: "standard",
    monthlyBudget: 45000,
    billingCycle: "monthly",
    status: "Active",
    isVip: false,
    onboardingStatus: "completed",
    departments: ["Social Media", "Graphics"],
    projectStatus: "Active",
    projectProgress: 40,
  },
  {
    email: `client-metro-fashion${DEMO_DOMAIN}`,
    name: "Metro Fashion Hub",
    company: "Metro Fashion Hub LLP",
    phone: 9876501002,
    ownername: "Priya Sharma",
    industry: "Retail & Fashion",
    website: "https://demo-metofashion.wealll.local",
    serviceCompany: "We Alll",
    servicesSubscribed: ["Digital Marketing", "Video Production", "Social Media Marketing"],
    planType: "premium",
    monthlyBudget: 85000,
    billingCycle: "monthly",
    status: "Active",
    isVip: true,
    vipLevel: "gold",
    onboardingStatus: "completed",
    departments: ["Digital Marketing", "Graphics", "Video Production", "Posting"],
    projectStatus: "Active",
    projectProgress: 55,
  },
  {
    email: `client-apex-it${DEMO_DOMAIN}`,
    name: "Apex IT Solutions",
    company: "Apex IT Solutions Pvt Ltd",
    phone: 9876501003,
    ownername: "Arjun Sen",
    industry: "Information Technology",
    website: "https://demo-apex-it.wealll.local",
    serviceCompany: "We Alll",
    servicesSubscribed: ["Website Development", "SEO"],
    planType: "enterprise",
    monthlyBudget: 120000,
    billingCycle: "quarterly",
    status: "Active",
    isVip: true,
    vipLevel: "platinum",
    onboardingStatus: "completed",
    departments: ["Development", "Content Writing"],
    projectStatus: "Active",
    projectProgress: 30,
  },
  {
    email: `client-wellness-care${DEMO_DOMAIN}`,
    name: "Wellness Care Clinic",
    company: "Wellness Care Clinic",
    phone: 9876501004,
    ownername: "Dr. Meera Kapoor",
    industry: "Healthcare",
    website: "https://demo-wellness.wealll.local",
    serviceCompany: "Kolkata Digital",
    servicesSubscribed: ["Content Marketing", "SEO"],
    planType: "basic",
    monthlyBudget: 25000,
    billingCycle: "monthly",
    status: "Active",
    onboardingStatus: "in_progress",
    departments: ["Content Writing", "Social Media"],
    projectStatus: "Pending",
    projectProgress: 10,
  },
  {
    email: `client-greenbuild${DEMO_DOMAIN}`,
    name: "GreenBuild Properties",
    company: "GreenBuild Properties Ltd",
    phone: 9876501005,
    ownername: "Vikram Das",
    industry: "Real Estate",
    website: "https://demo-greenbuild.wealll.local",
    serviceCompany: "We Alll",
    servicesSubscribed: ["PPC", "Social Media Marketing"],
    planType: "standard",
    monthlyBudget: 60000,
    billingCycle: "monthly",
    status: "Active",
    onboardingStatus: "completed",
    departments: ["Digital Marketing", "Graphics"],
    projectStatus: "Active",
    projectProgress: 25,
  },
  {
    email: `client-horizon-edtech${DEMO_DOMAIN}`,
    name: "Horizon EdTech Academy",
    company: "Horizon EdTech Academy Pvt Ltd",
    phone: 9876501006,
    ownername: "Ananya Roy",
    industry: "Education",
    website: "https://demo-horizon-edtech.wealll.local",
    serviceCompany: "We Alll",
    servicesSubscribed: ["Video Production", "Graphic Design", "Content Marketing"],
    planType: "premium",
    monthlyBudget: 95000,
    billingCycle: "monthly",
    status: "Active",
    isVip: true,
    vipLevel: "diamond",
    onboardingStatus: "completed",
    departments: ["Video Production", "Graphics", "Content Writing", "Posting"],
    projectStatus: "Active",
    projectProgress: 65,
  },
  {
    email: `client-kolkata-sweets${DEMO_DOMAIN}`,
    name: "Kolkata Sweets Co",
    company: "Kolkata Sweets Co",
    phone: 9876501007,
    ownername: "Subhash Banerjee",
    industry: "Food & Beverage",
    serviceCompany: "Kolkata Digital",
    servicesSubscribed: ["Social Media Marketing"],
    planType: "basic",
    monthlyBudget: 18000,
    billingCycle: "monthly",
    status: "Active",
    onboardingStatus: "completed",
    departments: ["Social Media", "Posting"],
    projectStatus: "Active",
    projectProgress: 70,
  },
  {
    email: `client-on-hold${DEMO_DOMAIN}`,
    name: "Paused Demo Client",
    company: "Paused Demo Client Ltd",
    phone: 9876501008,
    ownername: "Demo Contact",
    industry: "Other",
    serviceCompany: "We Alll",
    servicesSubscribed: ["Social Media Marketing"],
    planType: "basic",
    monthlyBudget: 15000,
    status: "On Hold",
    onboardingStatus: "pending",
    departments: ["General"],
    projectStatus: "On Hold",
    projectProgress: 0,
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
 * @param {string[]} departmentNames
 * @param {Map<string, import("mongoose").Document>} deptByName
 */
function resolveDepartmentIds(departmentNames, deptByName) {
  return departmentNames
    .map((name) => deptByName.get(name)?._id)
    .filter(Boolean);
}

/**
 * @param {object} spec
 * @param {import("mongoose").Types.ObjectId} createdBy
 * @param {import("mongoose").Types.ObjectId|null} accountManager
 * @param {import("mongoose").Types.ObjectId[]} departmentIds
 */
async function upsertClient(spec, createdBy, accountManager, departmentIds) {
  const payload = {
    name: spec.name,
    company: spec.company,
    phone: spec.phone,
    ownername: spec.ownername,
    industry: spec.industry,
    website: spec.website,
    serviceCompany: spec.serviceCompany,
    servicesSubscribed: spec.servicesSubscribed || [],
    planType: spec.planType || "basic",
    monthlyBudget: spec.monthlyBudget || 0,
    billingCycle: spec.billingCycle || "monthly",
    status: spec.status || "Active",
    isVip: Boolean(spec.isVip),
    vipLevel: spec.vipLevel || "standard",
    vipSince: spec.isVip ? spec.vipSince || new Date("2025-06-01") : undefined,
    onboardingStatus: spec.onboardingStatus || "completed",
    onboardingDate: spec.onboardingStatus === "completed" ? new Date("2025-03-01") : undefined,
    assignedDepartments: departmentIds,
    departmentAssignedAt: departmentIds.length ? new Date() : undefined,
    departmentAssignedBy: departmentIds.length ? createdBy : undefined,
    accountManager: accountManager || undefined,
    createdBy,
    targetAudience: spec.targetAudience || "Urban professionals aged 25–45",
    expectations: spec.expectations || "Consistent monthly deliverables and reporting",
    address: spec.address || "Kolkata, West Bengal, India",
  };

  const existing = await Client.findOne({ email: spec.email });
  if (existing) {
    await Client.updateOne({ _id: existing._id }, { $set: payload });
    console.log(`  ~ Client updated: ${spec.name}`);
    return Client.findById(existing._id);
  }

  const client = await Client.create({ ...payload, email: spec.email });
  console.log(`  + Client created: ${spec.name}`);
  return client;
}

/**
 * @param {import("mongoose").Document} client
 * @param {object} spec
 * @param {import("mongoose").Types.ObjectId} createdBy
 * @param {import("mongoose").Types.ObjectId|null} primaryDepartmentId
 * @param {import("mongoose").Types.ObjectId[]} departmentIds
 */
async function ensureProject(client, spec, createdBy, primaryDepartmentId, departmentIds) {
  const projectName = `${client.name} — UAT Project`;
  let project = await Project.findOne({ client: client._id, name: projectName });

  const projectPayload = {
    name: projectName,
    description: `UAT demo project for ${client.name}`,
    client: client._id,
    status: spec.projectStatus || "Active",
    priority: spec.isVip ? "high" : "medium",
    progress: spec.projectProgress ?? 0,
    startDate: new Date("2025-04-01"),
    createdBy,
    projectHead: createdBy,
    department: primaryDepartmentId || undefined,
    departments: departmentIds,
    slotConfiguration: {
      totalSlots: 20,
      slotType: "generic",
      allowDynamicSlots: true,
      slotNamingPattern: "Slot {number}",
      autoCreateSlots: false,
      enableSlotSystem: true,
    },
    progressTracking: {
      calculationMethod: "slot-based",
      completedSlots: 0,
      totalSlots: 20,
      progressPercentage: spec.projectProgress ?? 0,
      lastProgressUpdate: new Date(),
      progressHistory: [],
    },
  };

  if (project) {
    await Project.updateOne({ _id: project._id }, { $set: projectPayload });
    console.log(`  ~ Project updated: ${projectName}`);
    return Project.findById(project._id);
  }

  project = await Project.create(projectPayload);
  console.log(`  + Project created: ${projectName}`);
  return project;
}

async function seedUatDemoClients() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  const dbName = process.env.MONGO_URI.split("/").pop()?.split("?")[0] || "";
  assertSafeDatabase(dbName);

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${dbName}\n`);

  const adminUser =
    (await User.findOne({ email: `admin-uat${DEMO_DOMAIN}` })) ||
    (await User.findOne({ role: "superadmin" }));
  const salesUser = await User.findOne({ email: `uat-sales-emp${DEMO_DOMAIN}` });

  if (!adminUser) {
    console.error("No UAT admin found. Run npm run seed:uat first.");
    process.exit(1);
  }

  const departments = await Department.find({ status: "active" });
  const deptByName = new Map(departments.map((d) => [d.name, d]));

  for (const spec of DEMO_CLIENTS) {
    console.log(`Client: ${spec.name}`);
    const departmentIds = resolveDepartmentIds(spec.departments || [], deptByName);
    const primaryDepartmentId =
      departmentIds.find((id) => {
        const dept = departments.find((d) => String(d._id) === String(id));
        return dept && ["Graphics", "Video Production", "Social Media", "Development"].includes(dept.name);
      }) || departmentIds[0] || null;

    const client = await upsertClient(
      spec,
      adminUser._id,
      salesUser?._id || adminUser._id,
      departmentIds
    );

    await ensureProject(
      client,
      spec,
      adminUser._id,
      primaryDepartmentId,
      departmentIds
    );
    console.log("");
  }

  const clientCount = await Client.countDocuments({
    email: { $regex: `@demo\\.wealll\\.local$`, $options: "i" },
  });
  const projectCount = await Project.countDocuments({
    name: { $regex: "UAT Project$" },
  });

  console.log("✅ UAT demo clients seed complete.");
  console.log(`  Demo clients ( @demo.wealll.local ): ${clientCount}`);
  console.log(`  Linked UAT projects: ${projectCount}`);
  console.log("\nSample logins to view clients:");
  console.log(`  - admin-uat${DEMO_DOMAIN}`);
  console.log(`  - uat-sales-emp${DEMO_DOMAIN}`);

  await mongoose.disconnect();
}

seedUatDemoClients().catch((err) => {
  console.error("seed-uat-demo-clients failed:", err.message);
  process.exit(1);
});
