import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../src/models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const findAdminUser = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find admin users
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'superadmin', 'hr'] } 
    }, 'name email role').limit(10);
    
    console.log("👑 Admin users:");
    adminUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Try to find a user with a known password pattern
    console.log("\n🔍 Checking for users with common passwords...");
    
    // Check if there's a user created by the createAdminUser script
    const possibleAdmin = await User.findOne({ 
      email: { $regex: /admin|wealll\.cloud/i } 
    }, 'name email role');
    
    if (possibleAdmin) {
      console.log("🎯 Found potential admin user:", possibleAdmin);
    }

  } catch (error) {
    console.error("❌ Error finding admin user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

findAdminUser();