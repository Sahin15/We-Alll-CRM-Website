/**
 * Idempotent seed: create the operational "Posting" department if missing.
 *
 * After running:
 * - HR/Admin should assign Posting employees (User.department → Posting)
 * - Attach Posting to projects that need Graphic/Video → Posting handoff
 *
 * Usage (from backend/):
 *   node scripts/createPostingDepartment.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "../src/models/departmentModel.js";

dotenv.config();

const createPostingDepartment = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("MONGO_URI is not set");
      process.exit(1);
    }

    await mongoose.connect(uri);

    const existing = await Department.findOne({ name: "Posting" });
    if (existing) {
      console.log("Posting department already exists:", existing._id.toString());
      console.log("Status:", existing.status, "| Type:", existing.type);
      process.exit(0);
    }

    const department = await Department.create({
      name: "Posting",
      description:
        "Publishes approved graphic and video content; submits live post URLs as proof of posting",
      type: "operational",
      status: "active",
    });

    console.log("Created Posting department:", department._id.toString());
    console.log(
      "Next: assign Posting employees and add Posting to relevant project departments."
    );
    process.exit(0);
  } catch (error) {
    console.error("Failed to create Posting department:", error.message);
    process.exit(1);
  }
};

createPostingDepartment();
