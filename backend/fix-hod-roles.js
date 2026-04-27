/**
 * One-time fix: Set role = 'hod' for all users who are marked as isHeadOfDepartment = true
 * but still have role = 'employee'.
 * Run: node fix-hod-roles.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
console.log("✅ Connected to MongoDB");

const User = (await import("./src/models/userModel.js")).default;

const result = await User.updateMany(
  { isHeadOfDepartment: true, role: { $ne: "hod" } },
  { $set: { role: "hod" } }
);

console.log(`✅ Fixed ${result.modifiedCount} user(s) — role set to 'hod'`);

await mongoose.disconnect();
