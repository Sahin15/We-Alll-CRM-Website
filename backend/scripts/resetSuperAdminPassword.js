import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";

dotenv.config();

const resetSuperAdminPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find superadmin
    const superAdmin = await User.findOne({ role: "superadmin" });
    
    if (!superAdmin) {
      console.log("❌ No superadmin found in database");
      process.exit(1);
    }

    console.log("\n📋 Current SuperAdmin:");
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Name: ${superAdmin.name}`);

    // New password - CHANGE THIS
    const newPassword = "Admin@123456";

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    superAdmin.password = await bcrypt.hash(newPassword, salt);

    await superAdmin.save();

    console.log("\n✅ SuperAdmin password reset successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:", superAdmin.email);
    console.log("🔑 New Password:", newPassword);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT: Change this password after login!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting password:", error.message);
    process.exit(1);
  }
};

resetSuperAdminPassword();
