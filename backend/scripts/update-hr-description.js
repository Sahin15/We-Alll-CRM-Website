#!/usr/bin/env node

/**
 * Script to update HR department description
 * Usage: node scripts/update-hr-description.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Department from '../src/models/departmentModel.js';

// Load environment variables
dotenv.config();

async function updateHRDescription() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find HR Department
    const hrDepartment = await Department.findOne({ name: 'HR Department' });
    
    if (!hrDepartment) {
      console.log('❌ HR Department not found');
      return;
    }

    console.log('📋 Current HR Department Description:');
    console.log('=====================================');
    console.log(hrDepartment.description);
    console.log('');

    // New shorter description
    const newDescription = "Manages workforce operations including recruitment, employee relations, performance management, and organizational development. Ensures compliance and fosters positive workplace culture.";

    // Update the description
    hrDepartment.description = newDescription;
    await hrDepartment.save();

    console.log('✅ HR Department description updated successfully!');
    console.log('');
    console.log('📋 New HR Department Description:');
    console.log('=================================');
    console.log(newDescription);
    console.log('');
    
    // Get the old description length before it was updated
    const oldDescription = "covers the department or professionals managing an organization's workforce, focusing on the employee lifecycle: recruiting, hiring, onboarding, training, performance management, compensation/benefits, employee relations, legal compliance, and offboarding, all while fostering a positive culture and aligning people with business goals.";
    
    console.log('📊 Description Length:');
    console.log(`- Old: ${oldDescription.length} characters`);
    console.log(`- New: ${newDescription.length} characters`);
    console.log(`- Reduction: ${oldDescription.length - newDescription.length} characters`);

  } catch (error) {
    console.error('❌ Error updating HR description:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
updateHRDescription().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});