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
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find the first employee user
    const user = await User.findOne({ email: "rakeshwealll@gmail.com" });
    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`);

    // Set new password
    const newPassword = "password123";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    console.log("✅ Password reset successfully!");
    console.log(`🔑 New password: ${newPassword}`);

  } catch (error) {
    console.error("❌ Error resetting password:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

resetUserPassword();