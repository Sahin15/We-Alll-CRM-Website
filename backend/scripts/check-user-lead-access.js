/**
 * Check if a specific user has lead access
 * Run: node backend/scripts/check-user-lead-access.js
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

const checkUserLeadAccess = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('USER LEAD ACCESS CHECK');
    console.log('='.repeat(80));
    console.log();

    // Find all users in Sales department
    const salesDept = await Department.findOne({ name: /^sales$/i });
    
    if (!salesDept) {
      console.log('❌ Sales department not found!');
      return;
    }

    console.log(`📊 Sales Department: ${salesDept.name} (ID: ${salesDept._id})`);
    console.log();

    // Find users in Sales department
    const salesUsers = await User.find({ department: salesDept._id })
      .select('name email role department')
      .populate('department', 'name');

    console.log(`👥 Users in Sales Department: ${salesUsers.length}`);
    console.log();

    if (salesUsers.length === 0) {
      console.log('⚠️  No users found in Sales department');
      return;
    }

    // Check each user's lead access
    const allowedRoles = ['admin', 'superadmin', 'manager'];
    const allowedDepartments = ['Sales'];

    salesUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Department: ${user.department?.name || 'NOT ASSIGNED'}`);
      
      // Check if user has lead access
      const hasRoleAccess = allowedRoles.includes(user.role);
      const hasDeptAccess = user.department && 
        allowedDepartments.some(dept => dept.toLowerCase() === user.department.name.toLowerCase());
      
      const hasAccess = hasRoleAccess || hasDeptAccess;
      
      console.log(`   Has Role Access: ${hasRoleAccess ? '✅' : '❌'} (role in ${allowedRoles.join(', ')})`);
      console.log(`   Has Dept Access: ${hasDeptAccess ? '✅' : '❌'} (dept in ${allowedDepartments.join(', ')})`);
      console.log(`   FINAL ACCESS: ${hasAccess ? '✅ YES' : '❌ NO'}`);
      console.log();
    });

    // Also check for manager role users
    console.log('🔍 Checking for Manager role users:');
    console.log('-'.repeat(80));
    const managers = await User.find({ role: 'manager' })
      .select('name email role department')
      .populate('department', 'name');
    
    if (managers.length > 0) {
      managers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Department: ${user.department?.name || 'NOT ASSIGNED'}`);
        console.log(`   ✅ Has lead access (manager role)`);
        console.log();
      });
    } else {
      console.log('No users with manager role found');
      console.log();
    }

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Lead access is granted to:`);
    console.log(`  Roles: ${allowedRoles.join(', ')}`);
    console.log(`  Departments: ${allowedDepartments.join(', ')}`);
    console.log();
    console.log(`Users with lead access:`);
    
    const usersWithAccess = salesUsers.filter(user => {
      const hasRoleAccess = allowedRoles.includes(user.role);
      const hasDeptAccess = user.department && 
        allowedDepartments.some(dept => dept.toLowerCase() === user.department.name.toLowerCase());
      return hasRoleAccess || hasDeptAccess;
    });
    
    console.log(`  ${usersWithAccess.length} user(s) in Sales department`);
    console.log(`  ${managers.length} manager(s)`);
    console.log(`  Total: ${usersWithAccess.length + managers.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkUserLeadAccess();
