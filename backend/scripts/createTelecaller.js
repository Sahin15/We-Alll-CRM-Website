import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";
import Department from "../src/models/departmentModel.js";

dotenv.config();

const createTelecaller = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if telecaller already exists
    const existingTelecaller = await User.findOne({ email: "telecaller@example.com" });
    if (existingTelecaller) {
      console.log("⚠️  Telecaller already exists:");
      console.log(`   Email: ${existingTelecaller.email}`);
      console.log(`   Name: ${existingTelecaller.name}`);
      process.exit(0);
    }

    // Find or create Telecaller department
    let telecallerDept = await Department.findOne({ name: "Telecaller" });
    if (!telecallerDept) {
      telecallerDept = await Department.create({
        name: "Telecaller",
        description: "Telecalling and Raw Data Management",
        status: "active"
      });
      console.log("✅ Telecaller department created");
    } else {
      console.log("✅ Telecaller department found");
    }

    // Telecaller details
    const telecallerData = {
      name: "Telecaller",
      email: "telecaller@example.com",
      password: "123456",
      phone: "+91 9876543210",
      role: "employee",
      status: "active",
      employeeId: "TC001",
      designation: "Telecaller",
      department: telecallerDept._id,
      joiningDate: new Date(),
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    telecallerData.password = await bcrypt.hash(telecallerData.password, salt);

    // Create telecaller
    const telecaller = await User.create(telecallerData);

    console.log("\n✅ Telecaller employee created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email: telecaller@example.com");
    console.log("🔑 Password: 123456");
    console.log("👤 Name:", telecaller.name);
    console.log("🆔 ID:", telecaller._id);
    console.log("🏢 Department:", telecallerDept.name);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating telecaller:", error.message);
    process.exit(1);
  }
};

createTelecaller();
