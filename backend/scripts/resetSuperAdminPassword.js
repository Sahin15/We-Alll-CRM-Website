import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";

dotenv.config();

const resetSuperAdminPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find superadmin
    const superAdmin = await User.findOne({ role: "superadmin" });
    
    if (!superAdmin) {
      
      process.exit(1);
    }

    
    
    

    // New password - CHANGE THIS
    const newPassword = "Admin@123456";

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    superAdmin.password = await bcrypt.hash(newPassword, salt);

    await superAdmin.save();

    
    
    
    
    
    

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

resetSuperAdminPassword();
