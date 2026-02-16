#!/usr/bin/env node

/**
 * Script to list all departments in the system
 * Usage: node scripts/list-departments.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Department from '../src/models/departmentModel.js';
import User from '../src/models/userModel.js'; // Import User model for populate

// Load environment variables
dotenv.config();

async function listDepartments() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all departments
    const departments = await Department.find()
      .populate('head', 'name email')
      .sort({ type: 1, name: 1 });

    console.log('📋 DEPARTMENT DIRECTORY');
    console.log('='.repeat(50));

    // Group by type
    const operationalDepts = departments.filter(d => d.type === 'operational');
    const administrativeDepts = departments.filter(d => d.type === 'administrative');

    // Display Operational Departments
    console.log('\n🔧 OPERATIONAL DEPARTMENTS');
    console.log('-'.repeat(30));
    operationalDepts.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.name}`);
      console.log(`   📝 Description: ${dept.description || 'No description'}`);
      console.log(`   👤 Head: ${dept.head?.name || 'Not assigned'}`);
      console.log(`   📊 Status: ${dept.status}`);
      console.log(`   🆔 ID: ${dept._id}`);
      console.log('');
    });

    // Display Administrative Departments  
    console.log('🏢 ADMINISTRATIVE DEPARTMENTS');
    console.log('-'.repeat(30));
    administrativeDepts.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.name}`);
      console.log(`   📝 Description: ${dept.description || 'No description'}`);
      console.log(`   👤 Head: ${dept.head?.name || 'Not assigned'}`);
      console.log(`   📊 Status: ${dept.status}`);
      console.log(`   🆔 ID: ${dept._id}`);
      console.log('');
    });

    // Summary
    console.log('📈 SUMMARY');
    console.log('-'.repeat(20));
    console.log(`Total Departments: ${departments.length}`);
    console.log(`├─ Operational: ${operationalDepts.length}`);
    console.log(`└─ Administrative: ${administrativeDepts.length}`);
    console.log('');
    console.log(`Active Departments: ${departments.filter(d => d.status === 'active').length}`);
    console.log(`Departments with Head: ${departments.filter(d => d.head).length}`);

    // Client Assignment Info
    console.log('\n🎯 CLIENT ASSIGNMENT INFO');
    console.log('-'.repeat(25));
    console.log('✅ Available for Client Assignment (Operational):');
    operationalDepts.forEach(dept => {
      console.log(`   • ${dept.name}`);
    });
    console.log('\n🔒 Not Available for Client Assignment (Administrative):');
    administrativeDepts.forEach(dept => {
      console.log(`   • ${dept.name} (has access to all clients)`);
    });

  } catch (error) {
    console.error('❌ Error listing departments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
listDepartments().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});