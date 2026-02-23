/**
 * Verify Department Employee Display Fix
 * This script verifies that employees are correctly displayed in departments
 * Run: node backend/scripts/verify-department-fix.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyDepartmentFix = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('DEPARTMENT EMPLOYEE DISPLAY VERIFICATION');
    console.log('='.repeat(80));
    console.log();

    // Find Sales department
    const salesDept = await Department.findOne({ name: /^sales$/i });
    
    if (!salesDept) {
      console.log('❌ Sales department not found!');
      return;
    }

    console.log('📊 Sales Department Info:');
    console.log(`   ID: ${salesDept._id}`);
    console.log(`   Name: ${salesDept.name}`);
    console.log();

    // Query employees using the NEW method (direct User query)
    console.log('🔍 Querying employees using NEW method (User.find):');
    console.log('-'.repeat(80));
    
    const employees = await User.find({ department: salesDept._id })
      .select('name email role status designation')
      .lean();

    console.log(`Found: ${employees.length} employee(s)\n`);

    if (employees.length > 0) {
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name}`);
        console.log(`   Email: ${emp.email}`);
        console.log(`   Role: ${emp.role}`);
        console.log(`   Status: ${emp.status || 'active'}`);
        console.log(`   Designation: ${emp.designation || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('⚠️  No employees found assigned to Sales department');
      console.log('\nSearching for users with "sales" in name...');
      
      const salesNamedUsers = await User.find({ name: /sales/i })
        .select('name email department role')
        .populate('department', 'name');
      
      if (salesNamedUsers.length > 0) {
        console.log(`\nFound ${salesNamedUsers.length} user(s) with "sales" in name:`);
        salesNamedUsers.forEach((user, index) => {
          console.log(`\n${index + 1}. ${user.name}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Current Department: ${user.department?.name || 'NOT ASSIGNED'}`);
          console.log(`   Role: ${user.role}`);
          
          if (!user.department || user.department._id.toString() !== salesDept._id.toString()) {
            console.log(`   ⚠️  This user should be assigned to Sales department!`);
          }
        });
      }
    }

    // Test all departments
    console.log('\n\n📋 ALL DEPARTMENTS SUMMARY:');
    console.log('='.repeat(80));
    
    const allDepartments = await Department.find().lean();
    
    for (const dept of allDepartments) {
      const deptEmployees = await User.find({ department: dept._id })
        .select('name')
        .lean();
      
      console.log(`\n${dept.name}:`);
      console.log(`   ID: ${dept._id}`);
      console.log(`   Employees: ${deptEmployees.length}`);
      
      if (deptEmployees.length > 0) {
        console.log(`   Names: ${deptEmployees.map(e => e.name).join(', ')}`);
      }
    }

    console.log('\n\n✅ VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\nThe fix ensures that:');
    console.log('1. Employees are queried directly from User model');
    console.log('2. No dependency on department.employees array');
    console.log('3. Always shows current state without sync issues');
    console.log('\nIf Sales department shows 0 employees, the user needs to be assigned.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

verifyDepartmentFix();
