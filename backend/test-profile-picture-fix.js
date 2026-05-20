import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { convertS3UrlToProxyUrl } from "./src/utils/s3ProxyUrl.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const User = (await import("./src/models/userModel.js")).default;

console.log("🧪 Testing Profile Picture Fix...\n");

// Get a user with profile picture
const user = await User.findOne({ profilePicture: { $exists: true, $ne: null } })
  .select("name profilePicture");

if (!user) {
  console.log("❌ No users with profile pictures found");
  await mongoose.disconnect();
  process.exit(1);
}

console.log(`✅ Found user: ${user.name}`);
console.log(`\n📸 Original S3 URL:`);
console.log(`   ${user.profilePicture}`);

const proxyUrl = convertS3UrlToProxyUrl(user.profilePicture);
console.log(`\n🔄 Converted Proxy URL:`);
console.log(`   ${proxyUrl}`);

// Verify the conversion
if (proxyUrl.includes("/api/upload/profile-picture/")) {
  console.log(`\n✅ URL conversion successful!`);
  console.log(`\n📝 How it works:`);
  console.log(`   1. Frontend requests /api/users`);
  console.log(`   2. Backend returns profilePicture as proxy URL`);
  console.log(`   3. Frontend loads image from proxy endpoint`);
  console.log(`   4. Proxy endpoint fetches from S3 and streams to frontend`);
} else {
  console.log(`\n❌ URL conversion failed!`);
}

await mongoose.disconnect();
