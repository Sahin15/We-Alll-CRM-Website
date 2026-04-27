import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const User = (await import("./src/models/userModel.js")).default;

const u = await User.findOne({ name: /sahin/i }).select("name role department");
console.log(JSON.stringify(u, null, 2));

await mongoose.disconnect();
