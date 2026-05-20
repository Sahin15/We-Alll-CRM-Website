/**
 * Test HTTP access to all profile picture S3 URLs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
const User = (await import("../src/models/userModel.js")).default;

const users = await User.find({
  profilePicture: { $exists: true, $ne: null, $ne: "" },
}).select("name profilePicture");

let ok = 0;
let fail = 0;

for (const u of users) {
  try {
    const res = await fetch(u.profilePicture, { method: "HEAD" });
    if (res.ok) {
      ok++;
      console.log(`OK   ${u.name} (${res.status})`);
    } else {
      fail++;
      console.log(`FAIL ${u.name} (${res.status}) ${u.profilePicture}`);
    }
  } catch (e) {
    fail++;
    console.log(`ERR  ${u.name}: ${e.message}`);
  }
}

console.log(`\n${ok} accessible, ${fail} failed of ${users.length}`);
await mongoose.disconnect();
