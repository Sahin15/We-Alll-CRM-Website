#!/usr/bin/env node

/**
 * Update User Emails Script
 * Allows updating user emails individually or in bulk
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const updateUserEmail = async (currentEmail, newEmail) => {
  try {
    // Check if current email exists
    const user = await User.findOne({ email: currentEmail });
    if (!user) {
      console.log(`❌ User with email "${currentEmail}" not found`);
      return false;
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      console.log(`❌ Email "${newEmail}" is already in use by another user`);
      return false;
    }

    // Update the email
    await User.findByIdAndUpdate(user._id, { email: newEmail });
    console.log(`✅ Updated email for ${user.name}: ${currentEmail} → ${newEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating email for ${currentEmail}:`, error.message);
    return false;
  }
};

const updateMultipleEmails = async (emailUpdates) => {
  console.log(`🔄 Starting bulk email update for ${emailUpdates.length} users...\n`);
  
  let successCount = 0;
  let failCount = 0;

  for (const { currentEmail, newEmail } of emailUpdates) {
    const success = await updateUserEmail(currentEmail, newEmail);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n📊 Update Summary:');
  console.log(`   ✅ Successful updates: ${successCount}`);
  console.log(`   ❌ Failed updates: ${failCount}`);
  console.log(`   📝 Total processed: ${emailUpdates.length}`);
};

const listAllUsers = async () => {
  try {
    const users = await User.find({})
      .select('name email role status')
      .sort({ name: 1 });

    console.log('\n👥 Current Users in System:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name'.padEnd(25) + 'Email'.padEnd(35) + 'Role'.padEnd(15) + 'Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    users.forEach(user => {
      console.log(
        user.name.padEnd(25) + 
        user.email.padEnd(35) + 
        user.role.padEnd(15) + 
        user.status
      );
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${users.length}`);
  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
};

const main = async () => {
  await connectDB();

  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'list') {
    // List all users
    await listAllUsers();
  } else if (command === 'update' && args.length === 3) {
    // Update single email: node update-user-emails.js update old@email.com new@email.com
    const [, currentEmail, newEmail] = args;
    await updateUserEmail(currentEmail, newEmail);
  } else if (command === 'bulk') {
    // Bulk update - modify this array with your email changes
    const emailUpdates = [
      // Add your email updates here in this format:
      // { currentEmail: 'old1@example.com', newEmail: 'new1@example.com' },
      // { currentEmail: 'old2@example.com', newEmail: 'new2@example.com' },
      
      // Example updates (uncomment and modify as needed):
      // { currentEmail: 'admin@company.com', newEmail: 'admin@wealll.cloud' },
      // { currentEmail: 'hr@company.com', newEmail: 'hr@wealll.cloud' },
      // { currentEmail: 'employee@company.com', newEmail: 'employee@wealll.cloud' },
    ];

    if (emailUpdates.length === 0) {
      console.log('⚠️  No email updates defined. Please edit the script and add email updates to the emailUpdates array.');
    } else {
      await updateMultipleEmails(emailUpdates);
    }
  } else {
    // Show usage instructions
    console.log('📧 User Email Update Script');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Usage Options:');
    console.log('');
    console.log('1️⃣  List all users:');
    console.log('   node scripts/update-user-emails.js list');
    console.log('');
    console.log('2️⃣  Update single email:');
    console.log('   node scripts/update-user-emails.js update old@email.com new@email.com');
    console.log('');
    console.log('3️⃣  Bulk update emails:');
    console.log('   node scripts/update-user-emails.js bulk');
    console.log('   (Edit the script first to define your email updates)');
    console.log('');
    console.log('💡 Examples:');
    console.log('   node scripts/update-user-emails.js list');
    console.log('   node scripts/update-user-emails.js update admin@company.com admin@wealll.cloud');
    console.log('   node scripts/update-user-emails.js bulk');
    console.log('');
    console.log('⚠️  Important Notes:');
    console.log('   • Always backup your database before bulk updates');
    console.log('   • New emails must be unique (not already in use)');
    console.log('   • Users will need to login with their new email addresses');
    console.log('   • Consider notifying users about email changes');
  }

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
};

main().catch(console.error);