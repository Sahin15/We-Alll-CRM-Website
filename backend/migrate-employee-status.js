/**
 * One-time migration: map legacy employee status values to new lifecycle model.
 *
 * Mappings:
 *   on_leave  → inactive
 *   suspended → inactive
 *
 * Run ONCE before deploying the new status enum:
 *   node migrate-employee-status.js
 */

import mongoose from "mongoose";
import User from "./src/models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const result = await User.updateMany(
      { status: { $in: ["on_leave", "suspended"] } },
      { $set: { status: "inactive" } }
    );

    console.log(`Migration complete. Modified ${result.modifiedCount} user(s).`);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

run();
