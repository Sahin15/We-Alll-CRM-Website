#!/usr/bin/env node

/**
 * Production Profile Picture Debug Script
 * 
 * This script helps debug profile picture issues in production
 */

import mongoose from "mongoose";
import User from "../src/models/userModel.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in environment variables");
  process.exit(1);
}

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
}

async function debugProfilePictures() {
  console.log("🔍 Production Profile Picture Debug");
  console.log("=" .repeat(50));

  try {
    // Test 1: Check if users have profile pictures in database
    console.log("\n1. Checking users with profile pictures in database...");
    const usersWithPictures = await User.find({
      profilePicture: { $exists: true, $ne: null, $ne: "" }
    }).select("_id name email profilePicture role");

    console.log(`Found ${usersWithPictures.length} users with profile pictures:`);
    usersWithPictures.forEach(user => {
      console.log(`  • ${user.name} (${user.email}): ${user.profilePicture}`);
    });

    // Test 2: Simulate the /me endpoint query
    if (usersWithPictures.length > 0) {
      const testUser = usersWithPictures[0];
      console.log(`\n2. Testing /me endpoint simulation for user: ${testUser.name}`);
      
      const userFromMe = await User.findById(testUser._id)
        .select('-password')
        .select('+governmentIds.aadhaarNumber +governmentIds.panNumber +governmentIds.uanNumber +governmentIds.esicNumber')
        .select('+bankDetails.accountNumber')
        .populate('department', 'name')
        .populate('reportingManager', 'name email')
        .populate('headOfDepartment', 'name')
        .populate('headOfProjects', 'name');

      console.log("Profile picture in /me query result:", userFromMe?.profilePicture);
      console.log("Full user object keys:", Object.keys(userFromMe?.toObject() || {}));
    }

    // Test 3: Check environment variables
    console.log("\n3. Checking environment variables...");
    console.log("AWS_S3_BUCKET_NAME:", process.env.AWS_S3_BUCKET_NAME);
    console.log("AWS_REGION:", process.env.AWS_REGION);
    console.log("NODE_ENV:", process.env.NODE_ENV);

    // Test 4: Test S3 URL accessibility
    if (usersWithPictures.length > 0) {
      console.log("\n4. Testing S3 URL accessibility...");
      const testUrl = usersWithPictures[0].profilePicture;
      
      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        console.log(`S3 URL accessible: ${response.ok} (Status: ${response.status})`);
        if (!response.ok) {
          console.log("Response headers:", [...response.headers.entries()]);
        }
      } catch (error) {
        console.log("S3 URL fetch error:", error.message);
      }
    }

    // Test 5: Check for any middleware or hooks affecting profilePicture
    console.log("\n5. Checking user model schema...");
    const schema = User.schema;
    const profilePictureField = schema.paths.profilePicture;
    console.log("ProfilePicture field config:", {
      type: profilePictureField?.instance,
      required: profilePictureField?.isRequired,
      select: profilePictureField?.selected,
      default: profilePictureField?.defaultValue
    });

  } catch (error) {
    console.error("❌ Debug failed:", error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    await debugProfilePictures();
    
    console.log("\n" + "=".repeat(50));
    console.log("🔍 DEBUG COMPLETE");
    console.log("Check the output above for any issues");
    console.log("Common production issues:");
    console.log("• S3 URLs not accessible from production server");
    console.log("• Environment variables missing or incorrect");
    console.log("• Database connection issues");
    console.log("• CORS issues with S3 bucket");
    
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the script
main();