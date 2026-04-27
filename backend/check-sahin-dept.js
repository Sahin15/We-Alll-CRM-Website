import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

const User = (await import("./src/models/userModel.js")).default;
const Department = (await import("./src/models/departmentModel.js")).default;
const Project = (await import("./src/models/projectModel.js")).default;

const sahin = await User.findOne({ name: /sahin/i })
  .select("name role department headOfDepartment isHeadOfDepartment");

console.log("Sahin:", JSON.stringify(sahin, null, 2));

const dept = await Department.findById(sahin.headOfDepartment || sahin.department)
  .select("name type");
console.log("Department:", JSON.stringify(dept, null, 2));

// Check projects Sahin is assigned to
const projects = await Project.find({
  $or: [
    { assignedUsers: sahin._id },
    { projectHead: sahin._id },
    { teamMembers: sahin._id },
    { createdBy: sahin._id }
  ]
}).select("name client").populate("client", "name");

console.log("Projects assigned to Sahin:", projects.map(p => ({ name: p.name, client: p.client?.name })));

await mongoose.disconnect();
