import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";

dotenv.config();

const demoteSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find all superadmins
    const superAdmins = await User.find({ role: "superadmin" });
    
    if (superAdmins.length === 0) {
      
      process.exit(1);
    }

    if (superAdmins.length === 1) {
      ");
      
      
      process.exit(0);
    }

    
    superAdmins.forEach((admin, index) => {
      `);
      
      
    });

    // Ask which one to demote (you'll need to edit this)
    // CHANGE THIS: Put the email of the user you want to demote
    const emailToDemote = "weallldevelopment@gmail.com"; // <-- CHANGE THIS TO THE WRONG SUPERADMIN'S EMAIL
    const newRole = "admin"; // <-- CHANGE THIS TO THEIR ORIGINAL ROLE (client, admin, hr, employee, etc.)

    const userToDemote = superAdmins.find(u => u.email === emailToDemote);
    
    if (!userToDemote) {
      
      
      process.exit(1);
    }

    // Temporarily disable the pre-save hook by directly updating
    await User.updateOne(
      { _id: userToDemote._id },
      { $set: { role: newRole } }
    );

    
    
    
    
    
    
    

    // Show remaining superadmin
    const remainingSuperAdmin = superAdmins.find(u => u.email !== emailToDemote);
    
    
    

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

demoteSuperAdmin();
