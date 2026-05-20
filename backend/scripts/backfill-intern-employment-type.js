/**
 * Ensure users already marked as intern have internshipDetails.isActive set.
 * Does NOT change employmentType for other users.
 *
 * Usage: node backend/scripts/backfill-intern-employment-type.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI or MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const User = (await import("../src/models/userModel.js")).default;

  const interns = await User.find({ employmentType: "intern" }).select(
    "name email employmentType internshipDetails"
  );

  let updated = 0;

  for (const user of interns) {
    if (!user.internshipDetails?.isActive) {
      if (!user.internshipDetails) user.internshipDetails = {};
      user.internshipDetails.isActive = true;
      await user.save();
      updated++;
      console.log(`✓ ${user.name}: set internshipDetails.isActive=true`);
    }
  }

  console.log(`\nDone. Updated ${updated} intern profile(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
