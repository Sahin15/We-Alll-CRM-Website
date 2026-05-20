import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const User = (await import("./src/models/userModel.js")).default;

console.log("🔍 Checking Profile Pictures in Database...\n");

// Get all users with profile pictures
const usersWithPictures = await User.find({ profilePicture: { $exists: true, $ne: null } })
  .select("name email profilePicture role")
  .limit(10);

console.log(`Found ${usersWithPictures.length} users with profile pictures:\n`);

usersWithPictures.forEach((user, index) => {
  console.log(`${index + 1}. ${user.name} (${user.email})`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Profile Picture URL: ${user.profilePicture}`);
  console.log(`   URL Type: ${user.profilePicture.startsWith('https://') ? 'Full URL' : 'S3 Key or Local Path'}`);
  console.log();
});

// Check for null profile pictures
const usersWithoutPictures = await User.find({ profilePicture: { $in: [null, undefined, ""] } })
  .select("name email")
  .limit(5);

console.log(`\n📊 Statistics:`);
console.log(`   Users with profile pictures: ${usersWithPictures.length}`);
console.log(`   Users without profile pictures: ${usersWithoutPictures.length}`);

await mongoose.disconnect();
