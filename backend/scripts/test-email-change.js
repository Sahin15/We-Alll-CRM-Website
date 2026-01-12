#!/usr/bin/env node

/**
 * Test Email Change Script
 * Shows user data before and after email change to verify data preservation
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';
import Attendance from '../src/models/attendanceModel.js';

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

const getUserData = async (email) => {
  try {
    // Find user by email
    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      return null;
    }

    // Get user's projects
    const projects = await Project.find({ 
      assignedUsers: user._id 
    }).select('name status client').populate('client', 'name').lean();

    // Get user's work items
    const workItems = await WorkItem.find({ 
      assignedTo: user._id 
    }).select('title status project dueDate').populate('project', 'name').lean();

    // Get user's attendance records (last 10)
    const attendance = await Attendance.find({ 
      user: user._id 
    }).select('date clockIn clockOut status').sort({ date: -1 }).limit(10).lean();

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        department: user.department
      },
      projects: projects.length,
      workItems: workItems.length,
      attendanceRecords: attendance.length,
      projectDetails: projects.slice(0, 3), // Show first 3 projects
      workItemDetails: workItems.slice(0, 3), // Show first 3 work items
      attendanceDetails: attendance.slice(0, 3) // Show first 3 attendance records
    };
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    return null;
  }
};

const displayUserData = (userData, title) => {
  console.log(`\n${title}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log(`👤 User Info:`);
  console.log(`   Name: ${userData.user.name}`);
  console.log(`   Email: ${userData.user.email}`);
  console.log(`   Role: ${userData.user.role}`);
  console.log(`   Status: ${userData.user.status}`);
  console.log(`   ID: ${userData.user.id}`);
  
  console.log(`\n📊 Data Summary:`);
  console.log(`   Projects: ${userData.projects}`);
  console.log(`   Work Items: ${userData.workItems}`);
  console.log(`   Attendance Records: ${userData.attendanceRecords}`);
  
  if (userData.projectDetails.length > 0) {
    console.log(`\n📁 Recent Projects:`);
    userData.projectDetails.forEach((project, index) => {
      console.log(`   ${index + 1}. ${project.name} (${project.status}) - Client: ${project.client?.name || 'N/A'}`);
    });
  }
  
  if (userData.workItemDetails.length > 0) {
    console.log(`\n🎯 Recent Work Items:`);
    userData.workItemDetails.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.title} (${item.status}) - Project: ${item.project?.name || 'N/A'}`);
    });
  }
  
  if (userData.attendanceDetails.length > 0) {
    console.log(`\n⏰ Recent Attendance:`);
    userData.attendanceDetails.forEach((att, index) => {
      const date = new Date(att.date).toLocaleDateString('en-GB');
      console.log(`   ${index + 1}. ${date} - ${att.status} (In: ${att.clockIn ? new Date(att.clockIn).toLocaleTimeString() : 'N/A'})`);
    });
  }
};

const testEmailChange = async (currentEmail, newEmail) => {
  console.log('🧪 Testing Email Change - Data Preservation Verification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Get data before change
  console.log('\n📋 STEP 1: Getting user data BEFORE email change...');
  const dataBefore = await getUserData(currentEmail);
  
  if (!dataBefore) {
    console.log('❌ Cannot proceed - user not found');
    return;
  }
  
  displayUserData(dataBefore, '📊 DATA BEFORE EMAIL CHANGE');
  
  // Check if new email already exists
  const existingUser = await User.findOne({ email: newEmail });
  if (existingUser) {
    console.log(`\n❌ Cannot change email: "${newEmail}" is already in use by another user`);
    return;
  }
  
  // Change email
  console.log(`\n📋 STEP 2: Changing email from "${currentEmail}" to "${newEmail}"...`);
  const updateResult = await User.updateOne(
    { email: currentEmail },
    { $set: { email: newEmail } }
  );
  
  if (updateResult.matchedCount === 0) {
    console.log('❌ Email update failed - user not found');
    return;
  }
  
  console.log('✅ Email updated successfully!');
  
  // Get data after change
  console.log('\n📋 STEP 3: Getting user data AFTER email change...');
  const dataAfter = await getUserData(newEmail);
  
  if (!dataAfter) {
    console.log('❌ Error retrieving data after change');
    return;
  }
  
  displayUserData(dataAfter, '📊 DATA AFTER EMAIL CHANGE');
  
  // Verify data integrity
  console.log('\n📋 STEP 4: Verifying data integrity...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const verification = {
    userIdSame: dataBefore.user.id === dataAfter.user.id,
    nameSame: dataBefore.user.name === dataAfter.user.name,
    roleSame: dataBefore.user.role === dataAfter.user.role,
    projectCountSame: dataBefore.projects === dataAfter.projects,
    workItemCountSame: dataBefore.workItems === dataAfter.workItems,
    attendanceCountSame: dataBefore.attendanceRecords === dataAfter.attendanceRecords,
    emailChanged: dataBefore.user.email !== dataAfter.user.email
  };
  
  console.log('🔍 Verification Results:');
  console.log(`   ✅ User ID preserved: ${verification.userIdSame ? 'YES' : 'NO'}`);
  console.log(`   ✅ Name preserved: ${verification.nameSame ? 'YES' : 'NO'}`);
  console.log(`   ✅ Role preserved: ${verification.roleSame ? 'YES' : 'NO'}`);
  console.log(`   ✅ Project count same: ${verification.projectCountSame ? 'YES' : 'NO'} (${dataAfter.projects} projects)`);
  console.log(`   ✅ Work items same: ${verification.workItemCountSame ? 'YES' : 'NO'} (${dataAfter.workItems} work items)`);
  console.log(`   ✅ Attendance same: ${verification.attendanceCountSame ? 'YES' : 'NO'} (${dataAfter.attendanceRecords} records)`);
  console.log(`   ✅ Email changed: ${verification.emailChanged ? 'YES' : 'NO'}`);
  
  const allGood = Object.values(verification).every(v => v === true);
  
  if (allGood) {
    console.log('\n🎉 SUCCESS: Email change completed with 100% data preservation!');
    console.log('📧 User can now login with the new email and access all their data.');
  } else {
    console.log('\n⚠️  WARNING: Some verification checks failed. Please review the results above.');
  }
};

const main = async () => {
  await connectDB();
  
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('📧 Email Change Test Script');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Usage:');
    console.log('   node scripts/test-email-change.js current@email.com new@email.com');
    console.log('');
    console.log('💡 Example:');
    console.log('   node scripts/test-email-change.js admin@company.com admin@wealll.cloud');
    console.log('');
    console.log('🔍 This script will:');
    console.log('   1. Show all user data BEFORE email change');
    console.log('   2. Change the email address');
    console.log('   3. Show all user data AFTER email change');
    console.log('   4. Verify that all data is preserved');
    console.log('');
    console.log('⚠️  Note: This script actually changes the email in the database!');
    process.exit(0);
  }
  
  const [currentEmail, newEmail] = args;
  await testEmailChange(currentEmail, newEmail);
  
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
};

main().catch(console.error);