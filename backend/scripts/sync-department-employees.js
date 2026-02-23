/**
 * Script to sync department employees arrays with user department assignments
 * This fixes the issue where users are assigned to departments but don't appear in the department's employee list
 * Run: node backend/scripts/sync-department-employees.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config();

const syncDepartmentEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('SYNCING DEPARTMENT EMPLOYEES');
    console.log('='.repeat(80));
    console.log();

    // Get all departments
    const departments = await Department.find();
    console.log(`📊 Found ${departments.length} departments\n`);

    let totalSynced = 0;
    let totalAdded = 0;
    let totalRemoved = 0;

    for (const dept of departments) {
      console.log(`\n🔄 Processing: ${dept.name}`);
      console.log('-'.repeat(60));

      // Find all users assigned to this department
      const usersInDept = await User.find({ department: dept._id }).select('_id name email');
      const userIds = usersInDept.map(u => u._id);

      console.log(`   Users with department="${dept.name}": ${usersInDept.length}`);
      console.log(`   Current employees array length: ${dept.employees.length}`);

      // Get current employee IDs as strings for comparison
      const currentEmployeeIds = dept.employees.map(id => id.toString());
      const newEmployeeIds = userIds.map(id => id.toString());

      // Find employees to add (in users but not in department.employees)
      const toAdd = userIds.filter(id => !currentEmployeeIds.includes(id.toString()));
      
      // Find employees to remove (in department.employees but not in users)
      const toRemove = dept.employees.filter(id => !newEmployeeIds.includes(id.toString()));

      if (toAdd.length > 0) {
        console.log(`   ➕ Adding ${toAdd.length} employee(s):`);
        const usersToAdd = usersInDept.filter(u => toAdd.some(id => id.toString() === u._id.toString()));
        usersToAdd.forEach(u => console.log(`      - ${u.name} (${u.email})`));
        totalAdded += toAdd.length;
      }

      if (toRemove.length > 0) {
        console.log(`   ➖ Removing ${toRemove.length} employee(s) (no longer assigned)`);
        totalRemoved += toRemove.length;
      }

      if (toAdd.length === 0 && toRemove.length === 0) {
        console.log(`   ✅ Already in sync`);
      } else {
        // Update department employees array
        dept.employees = userIds;
        await dept.save();
        console.log(`   ✅ Synced successfully`);
        totalSynced++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SYNC SUMMARY');
    console.log('='.repeat(80));
    console.log(`Departments processed: ${departments.length}`);
    console.log(`Departments updated: ${totalSynced}`);
    console.log(`Total employees added: ${totalAdded}`);
    console.log(`Total employees removed: ${totalRemoved}`);
    console.log();

    // Verification
    console.log('🔍 VERIFICATION');
    console.log('-'.repeat(80));
    
    for (const dept of departments) {
      const updatedDept = await Department.findById(dept._id);
      const userCount = await User.countDocuments({ department: dept._id });
      const match = updatedDept.employees.length === userCount;
      
      console.log(`${match ? '✅' : '❌'} ${dept.name}: ${updatedDept.employees.length} in array, ${userCount} users assigned`);
    }

    console.log('\n✅ Sync Complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

syncDepartmentEmployees();
