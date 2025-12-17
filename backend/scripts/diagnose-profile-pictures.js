#!/usr/bin/env node

/**
 * Profile Picture Diagnostic Script
 * 
 * This script helps diagnose profile picture issues by:
 * 1. Checking all users with profile pictures
 * 2. Verifying S3 accessibility
 * 3. Identifying broken URLs
 * 4. Optionally cleaning up broken references
 */

import mongoose from "mongoose";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { AWS_CONFIG } from "../src/config/awsConfig.js";
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

async function checkS3Object(imageUrl) {
  try {
    const urlParts = imageUrl.split(".amazonaws.com/");
    if (urlParts.length < 2) {
      return { accessible: false, error: "Invalid S3 URL format" };
    }
    
    const key = urlParts[1];
    
    const headCommand = new HeadObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    });
    
    const result = await s3Client.send(headCommand);
    
    return {
      accessible: true,
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType,
      etag: result.ETag
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message,
      code: error.name
    };
  }
}

async function diagnoseProfilePictures() {
  console.log("🔍 Starting profile picture diagnosis...\n");

  try {
    // Get all users with profile pictures
    const usersWithPictures = await User.find({
      profilePicture: { $exists: true, $ne: null, $ne: "" }
    }).select("_id name email profilePicture role createdAt updatedAt");

    console.log(`📊 Found ${usersWithPictures.length} users with profile pictures\n`);

    if (usersWithPictures.length === 0) {
      console.log("✅ No profile pictures to check");
      return;
    }

    const results = {
      total: usersWithPictures.length,
      accessible: 0,
      broken: 0,
      brokenUsers: [],
      errors: {}
    };

    console.log("Checking accessibility...\n");

    for (const user of usersWithPictures) {
      process.stdout.write(`Checking ${user.name} (${user.email})... `);
      
      const check = await checkS3Object(user.profilePicture);
      
      if (check.accessible) {
        console.log("✅ Accessible");
        results.accessible++;
      } else {
        console.log(`❌ Broken - ${check.error}`);
        results.broken++;
        results.brokenUsers.push({
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          error: check.error,
          errorCode: check.code,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        });

        // Count error types
        const errorType = check.code || check.error;
        results.errors[errorType] = (results.errors[errorType] || 0) + 1;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📋 DIAGNOSIS SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total users with profile pictures: ${results.total}`);
    console.log(`✅ Accessible: ${results.accessible}`);
    console.log(`❌ Broken: ${results.broken}`);
    
    if (results.broken > 0) {
      console.log("\n🔍 Error breakdown:");
      for (const [errorType, count] of Object.entries(results.errors)) {
        console.log(`   ${errorType}: ${count}`);
      }

      console.log("\n💔 Broken profile pictures:");
      for (const brokenUser of results.brokenUsers) {
        console.log(`   • ${brokenUser.name} (${brokenUser.email})`);
        console.log(`     URL: ${brokenUser.profilePicture}`);
        console.log(`     Error: ${brokenUser.error}`);
        console.log(`     Last updated: ${brokenUser.updatedAt}`);
        console.log("");
      }

      // Ask if user wants to clean up broken references
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question("\n🧹 Do you want to clean up broken profile picture references? (y/N): ", resolve);
      });

      rl.close();

      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log("\n🧹 Cleaning up broken references...");
        
        const brokenIds = results.brokenUsers.map(u => u.id);
        const updateResult = await User.updateMany(
          { _id: { $in: brokenIds } },
          { 
            $unset: { profilePicture: "" },
            $set: { updatedAt: new Date() }
          }
        );

        console.log(`✅ Cleaned up ${updateResult.modifiedCount} broken profile picture references`);
      } else {
        console.log("⏭️  Skipping cleanup");
      }
    }

    console.log("\n✅ Diagnosis completed!");

  } catch (error) {
    console.error("\n❌ Diagnosis failed:", error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    await diagnoseProfilePictures();
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