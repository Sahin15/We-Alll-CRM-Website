import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

const User = (await import("./src/models/userModel.js")).default;
const Department = (await import("./src/models/departmentModel.js")).default;

const u = await User.findOne({ name: /mustafizur/i });
if (!u) { console.log("User not found"); process.exit(1); }

// Find the department where he is head
const dept = await Department.findOne({ head: u._id });
console.log("Department:", dept?.name);

u.role = "hod";
u.isHeadOfDepartment = true;
if (dept) u.headOfDepartment = dept._id;
await u.save();

console.log("✅ Fixed:", u.name, "→ role:", u.role, "| isHOD:", u.isHeadOfDepartment, "| dept:", dept?.name);

await mongoose.disconnect();
