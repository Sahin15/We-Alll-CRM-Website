import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: "superadmin" });
    if (existingSuperAdmin) {
      
      
      
      
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

    
    
    
     // Show original password
    
    
    
    
    

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

createSuperAdmin();
