import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "../src/models/departmentModel.js";

dotenv.config();

const deleteTelecallingDepartment = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find Telecalling department
    const telecallingDept = await Department.findOne({ name: "Telecalling" });
    
    if (!telecallingDept) {
      
      process.exit(0);
    }

    
    
    

    // Delete the department
    await Department.findByIdAndDelete(telecallingDept._id);
    

    // Verify Telecaller department still exists
    const telecallerDept = await Department.findOne({ name: "Telecaller" });
    if (telecallerDept) {
      
      
      
    }

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

deleteTelecallingDepartment();
