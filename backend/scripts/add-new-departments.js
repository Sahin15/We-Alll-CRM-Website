#!/usr/bin/env node

/**
 * Script to add new departments to the system
 * Usage: node scripts/add-new-departments.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Department from '../src/models/departmentModel.js';

// Load environment variables
dotenv.config();

// New departments to add
const newDepartments = [
  // Operational Departments
  {
    name: "Content",
    description: "Content creation, copywriting, and content strategy for digital marketing campaigns",
    type: "operational",
    status: "active"
  },
  {
    name: "Telecalling",
    description: "Outbound calling, lead generation, and customer outreach services",
    type: "operational", 
    status: "active"
  },
  {
    name: "Sales",
    description: "Sales operations, client acquisition, and revenue generation activities",
    type: "operational",
    status: "active"
  },
  // Administrative Department
  {
    name: "Accounts",
    description: "Financial management, accounting, billing, and financial reporting",
    type: "administrative",
    status: "active"
  }
];

async function addNewDepartments() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n📋 Adding new departments...\n');

    for (const deptData of newDepartments) {
      try {
        // Check if department already exists
        const existingDept = await Department.findOne({ name: deptData.name });
        
        if (existingDept) {
          console.log(`⚠️  Department "${deptData.name}" already exists - skipping`);
          continue;
        }

        // Create new department
        const department = await Department.create(deptData);
        console.log(`✅ Created ${deptData.type} department: "${department.name}"`);
        console.log(`   Description: ${department.description}`);
        console.log(`   ID: ${department._id}`);
        console.log('');

      } catch (error) {
        console.log(`❌ Failed to create department "${deptData.name}":`, error.message);
      }
    }

    // Display summary of all departments
    console.log('\n📊 Current Department Summary:');
    console.log('=====================================');
    
    const allDepartments = await Department.find().sort({ type: 1, name: 1 });
    
    const operationalDepts = allDepartments.filter(d => d.type === 'operational');
    const administrativeDepts = allDepartments.filter(d => d.type === 'administrative');
    
    console.log('\n🔧 Operational Departments:');
    operationalDepts.forEach(dept => {
      console.log(`   • ${dept.name} (${dept.status})`);
    });
    
    console.log('\n🏢 Administrative Departments:');
    administrativeDepts.forEach(dept => {
      console.log(`   • ${dept.name} (${dept.status})`);
    });
    
    console.log(`\n📈 Total Departments: ${allDepartments.length}`);
    console.log(`   Operational: ${operationalDepts.length}`);
    console.log(`   Administrative: ${administrativeDepts.length}`);

    console.log('\n🎉 Department setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding departments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
addNewDepartments().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});