import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
const User = (await import("../src/models/userModel.js")).default;
const users = await User.find({
  status: "active",
  role: { $in: ["employee", "hod", "hr", "accounts", "manager"] },
}).select("name employmentType employeeId role internshipDetails");
for (const u of users) {
  console.log(
    `${u.name} | type=${u.employmentType} | empId=${u.employeeId || "none"} | role=${u.role} | internActive=${u.internshipDetails?.isActive}`
  );
}
await mongoose.disconnect();
