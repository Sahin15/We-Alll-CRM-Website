/**
 * Audit profile picture URL formats in DB
 * Usage: node backend/scripts/audit-profile-pictures.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

function classifyUrl(url) {
  if (!url || url === "null") return "empty";
  if (url.includes("/api/upload/profile-picture/")) return "proxy";
  if (url.includes(".amazonaws.com")) return "s3";
  if (url.startsWith("http://localhost")) return "localhost";
  if (url.startsWith("/")) return "relative";
  if (url.startsWith("https://")) return "https-other";
  return "other";
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const User = (await import("../src/models/userModel.js")).default;

  const users = await User.find({
    profilePicture: { $exists: true, $ne: null, $ne: "" },
  }).select("name email profilePicture role");

  const patterns = {};
  const samples = {};

  for (const u of users) {
    const type = classifyUrl(u.profilePicture);
    patterns[type] = (patterns[type] || 0) + 1;
    if (!samples[type]) samples[type] = u.profilePicture;
  }

  const without = await User.countDocuments({
    $or: [
      { profilePicture: { $exists: false } },
      { profilePicture: null },
      { profilePicture: "" },
    ],
    role: { $ne: "superadmin" },
    isActive: { $ne: false },
  });

  console.log("\n--- Profile Picture Audit ---\n");
  console.log("With profilePicture:", users.length);
  console.log("Without (active):", without);
  console.log("URL patterns:", patterns);
  console.log("\nSample per pattern:");
  for (const [k, v] of Object.entries(samples)) {
    console.log(`  ${k}: ${v?.substring?.(0, 120) || v}`);
  }

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
