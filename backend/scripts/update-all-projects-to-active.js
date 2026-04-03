import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "../src/models/projectModel.js";

dotenv.config();

const updateProjectsToActive = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/mern-app";
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Update all projects to "Active" status
    const result = await Project.updateMany(
      {},
      { $set: { status: "Active" } }
    );

    console.log(`✅ Updated ${result.modifiedCount} projects to "Active" status`);
    console.log(`⚠️  ${result.matchedCount} projects were found in total`);

    // Verify the update
    const activeProjects = await Project.countDocuments({ status: "Active" });
    console.log(`✅ Verification: ${activeProjects} projects now have "Active" status`);

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error updating projects:", error.message);
    process.exit(1);
  }
};

updateProjectsToActive();
