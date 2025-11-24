import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: "superadmin" });
    if (existingSuperAdmin) {
      console.log("⚠️  SuperAdmin already exists:");
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Name: ${existingSuperAdmin.name}`);
      console.log("\n❌ Cannot create another superadmin. Delete the existing one first if needed.");
      process.exit(0);
    }

    // Superadmin details - CHANGE THESE VALUES
    const superAdminData = {
      name: "Super Admin",
      email: "admin@wealll.cloud",
      password: "Admin@123456", // Change this to a strong password
      phone: "+91 9876543210",
      role: "superadmin",
      status: "active",
      employeeId: "SA001",
      designation: "Super Administrator",
      joiningDate: new Date(),
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    superAdminData.password = await bcrypt.hash(superAdminData.password, salt);

    // Create superadmin
    const superAdmin = await User.create(superAdminData);

    console.log("\n✅ SuperAdmin created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:", superAdminData.email);
    console.log("🔑 Password:", "Admin@123456"); // Show original password
    console.log("👤 Name:", superAdmin.name);
    console.log("🆔 ID:", superAdmin._id);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
    console.log("🔒 This account cannot be deleted or modified by anyone.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating superadmin:", error.message);
    process.exit(1);
  }
};

createSuperAdmin();
