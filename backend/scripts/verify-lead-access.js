/**
 * Script to verify lead access permissions for different users
 * Run: node backend/scripts/verify-lead-access.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config();

const verifyLeadAccess = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('LEAD ACCESS VERIFICATION REPORT');
    console.log('='.repeat(80));
    console.log();

    // Get all users
    const users = await User.find().populate('department');
    
    console.log(`Total Users: ${users.length}\n`);

    // Categorize users by access
    const hasAccess = [];
    const noAccess = [];

    for (const user of users) {
      const accessReason = [];
      let canAccess = false;

      // Check role-based access
      if (['admin', 'superadmin', 'manager'].includes(user.role)) {
        canAccess = true;
        accessReason.push(`Role: ${user.role}`);
      }

      // Check department-based access
      if (user.department) {
        const deptName = user.department.name.toLowerCase();
        if (deptName === 'sales') {
          canAccess = true;
          accessReason.push(`Department: ${user.department.name}`);
        }
      }

      if (canAccess) {
        hasAccess.push({
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department?.name || 'None',
          reason: accessReason.join(', ')
        });
      } else {
        noAccess.push({
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department?.name || 'None'
        });
      }
    }

    // Display users WITH access
    console.log('✅ USERS WITH LEAD ACCESS');
    console.log('-'.repeat(80));
    if (hasAccess.length > 0) {
      hasAccess.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Department: ${user.department}`);
        console.log(`   Access Reason: ${user.reason}`);
        console.log();
      });
      console.log(`Total: ${hasAccess.length} users\n`);
    } else {
      console.log('No users with lead access found!\n');
    }

    // Display users WITHOUT access
    console.log('❌ USERS WITHOUT LEAD ACCESS');
    console.log('-'.repeat(80));
    if (noAccess.length > 0) {
      noAccess.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Department: ${user.department}`);
        console.log();
      });
      console.log(`Total: ${noAccess.length} users\n`);
    } else {
      console.log('All users have lead access!\n');
    }

    // Summary by role
    console.log('📊 SUMMARY BY ROLE');
    console.log('-'.repeat(80));
    const roleStats = {};
    users.forEach(user => {
      roleStats[user.role] = (roleStats[user.role] || 0) + 1;
    });
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`${role}: ${count} user(s)`);
    });
    console.log();

    // Summary by department
    console.log('📊 SUMMARY BY DEPARTMENT');
    console.log('-'.repeat(80));
    const deptStats = {};
    users.forEach(user => {
      const dept = user.department?.name || 'No Department';
      deptStats[dept] = (deptStats[dept] || 0) + 1;
    });
    Object.entries(deptStats).forEach(([dept, count]) => {
      console.log(`${dept}: ${count} user(s)`);
    });
    console.log();

    // Access control rules
    console.log('📋 ACCESS CONTROL RULES');
    console.log('-'.repeat(80));
    console.log('Roles with access:');
    console.log('  • admin');
    console.log('  • superadmin');
    console.log('  • manager');
    console.log();
    console.log('Departments with access:');
    console.log('  • Sales');
    console.log();

    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('-'.repeat(80));
    
    const salesDept = await Department.findOne({ name: /sales/i });
    
    if (!salesDept) {
      console.log('⚠️  Sales department not found. Create it:');
      console.log('   db.departments.insertOne({ name: "Sales", description: "Sales Department" })');
      console.log();
    }

    const usersWithoutDept = users.filter(u => !u.department && !['admin', 'superadmin', 'manager'].includes(u.role));
    if (usersWithoutDept.length > 0) {
      console.log(`⚠️  ${usersWithoutDept.length} user(s) without department assignment:`);
      usersWithoutDept.forEach(u => {
        console.log(`   • ${u.name} (${u.email}) - Role: ${u.role}`);
      });
      console.log();
    }

    console.log('='.repeat(80));
    console.log('✅ Verification Complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

verifyLeadAccess();
