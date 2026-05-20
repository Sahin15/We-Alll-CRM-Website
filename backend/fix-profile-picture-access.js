import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PutObjectAclCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { AWS_CONFIG } from "./src/config/awsConfig.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const User = (await import("./src/models/userModel.js")).default;

console.log("🔧 Fixing Profile Picture S3 Access...\n");

// Get all users with profile pictures
const usersWithPictures = await User.find({ profilePicture: { $exists: true, $ne: null } });

console.log(`Found ${usersWithPictures.length} users with profile pictures\n`);

let fixed = 0;
let failed = 0;

for (const user of usersWithPictures) {
  try {
    // Extract S3 key from URL
    const urlParts = user.profilePicture.split(".amazonaws.com/");
    if (urlParts.length < 2) {
      console.log(`⚠️  Invalid URL format for ${user.name}: ${user.profilePicture}`);
      failed++;
      continue;
    }

    const s3Key = urlParts[1];

    // Try to make the object public by setting ACL
    const aclCommand = new PutObjectAclCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: s3Key,
      ACL: "public-read",
    });

    await s3Client.send(aclCommand);
    console.log(`✅ Fixed access for ${user.name}`);
    fixed++;
  } catch (error) {
    console.log(`❌ Failed to fix ${user.name}: ${error.message}`);
    failed++;
  }
}

console.log(`\n📊 Results:`);
console.log(`   Fixed: ${fixed}`);
console.log(`   Failed: ${failed}`);
console.log(`   Total: ${usersWithPictures.length}`);

// Test one URL to verify
if (usersWithPictures.length > 0) {
  console.log(`\n🧪 Testing first profile picture...`);
  try {
    const response = await fetch(usersWithPictures[0].profilePicture, { method: "HEAD" });
    if (response.ok) {
      console.log(`✅ Profile picture is now accessible!`);
    } else {
      console.log(`⚠️  Profile picture returned status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

await mongoose.disconnect();
