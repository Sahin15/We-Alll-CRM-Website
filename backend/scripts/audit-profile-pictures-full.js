import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
const User = (await import("../src/models/userModel.js")).default;

const active = await User.find({ role: { $ne: "superadmin" }, isActive: { $ne: false } })
  .select("name email profilePicture role")
  .sort({ name: 1 });

const withPic = active.filter((u) => u.profilePicture);
const without = active.filter((u) => !u.profilePicture);

console.log(`Active: ${active.length}, with picture: ${withPic.length}, without: ${without.length}\n`);
console.log("WITHOUT profile picture:");
without.forEach((u) => console.log(`  - ${u.name} (${u.email})`));

await mongoose.disconnect();
