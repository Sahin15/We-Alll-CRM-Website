#!/usr/bin/env node

/**
 * Simple Email Update - Minimal Output
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';

// Suppress dotenv tips
process.env.DOTENV_CONFIG_SILENT = 'true';
dotenv.config({ silent: true });

const updateEmail = async (oldEmail, newEmail) => {
  try {
    // Connect quietly
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check if user exists
    const user = await User.findOne({ email: oldEmail });
    if (!user) {
      console.log(`❌ User not found: ${oldEmail}`);
      return;
    }
    
    // Check if new email is available
    const existing = await User.findOne({ email: newEmail });
    if (existing) {
      console.log(`❌ Email already in use: ${newEmail}`);
      return;
    }
    
    // Update email
    await User.updateOne({ email: oldEmail }, { email: newEmail });
    console.log(`✅ Email updated: ${user.name}`);
    console.log(`   ${oldEmail} → ${newEmail}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await mongoose.disconnect();
  }
};

// Get arguments
const [oldEmail, newEmail] = process.argv.slice(2);

if (!oldEmail || !newEmail) {
  console.log('Usage: node simple-email-update.js old@email.com new@email.com');
  process.exit(1);
}

updateEmail(oldEmail, newEmail);