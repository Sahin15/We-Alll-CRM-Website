import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../src/models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const resetUserPassword = async () => {
  try {
    
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find the first employee user
    const user = await User.findOne({ email: "rakeshwealll@gmail.com" });
    if (!user) {
      
      return;
    }

    `);

    // Set new password
    const newPassword = "password123";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    
    

  } catch (error) {
    
  } finally {
    await mongoose.disconnect();
    
  }
};

resetUserPassword();