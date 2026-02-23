/**
 * Deep dive script to check Sales department and employee assignment
 * Run: node backend/scripts/check-sales-department.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config();

const checkSalesDepartment = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('SALES DEPARTMENT DEEP DIVE');
    console.log('='.repeat(80));
    console.log();

    // 1. Find Sales department
    console.log('1️⃣ FINDING SALES DEPARTMENT');
    console.log('-'.repeat(80));
    
    const salesDept = await Department.findOne({ name: /^sales$/i });
    
    if (!salesDept) {
      console.log('❌ Sales department NOT FOUND in database!');
      console.log('\nAll departments:');
      const allDepts = await Department.find();
      allDepts.forEach(d => console.log(`  - "${d.name}" (ID: ${d._id})`));
      
      console.log('\n💡 Creating Sales department...');
      const newSalesDept = await Department.create({
        name: 'Sales',
        description: 'Sales Department',
        type: 'operational',
        status: 'active',
        employees: []
      });
      console.log(`✅ Created Sales department with ID: ${newSalesDept._id}`);
      return;
    }

    console.log('✅ Sales Department Found:');
    console.log(`   ID: ${salesDept._id}`);
    console.log(`   Name: "${salesDept.name}"`);
    console.log(`   Type: ${salesDept.type}`);
    console.log(`   Status: ${salesDept.status}`);
    console.log(`   Employees Array Length: ${salesDept.employees.length}`);
    console.log(`   Employees Array: [${salesDept.employees.join(', ')}]`);
    console.log();

    // 2. Find users with "sales" in name
    console.log('2️⃣ FINDING USERS WITH "SALES" IN NAME');
    console.log('-'.repeat(80));
    
    const salesUsers = await User.find({ name: /sales/i });
    console.log(`Found ${salesUsers.length} user(s) with "sales" in name:\n`);
    
    for (const user of salesUsers) {
      console.log(`User: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Department Field: ${user.department || 'NULL'}`);
      console.log(`  Department Type: ${typeof user.department}`);
      
      if (user.department) {
        const userDept = await Department.findById(user.department);
        console.log(`  Department Name: ${userDept?.name || 'NOT FOUND'}`);
        console.log(`  Matches Sales Dept: ${user.department.toString() === salesDept._id.toString()}`);
      }
      console.log();
    }

    // 3. Find ALL users assigned to Sales department
    console.log('3️⃣ FINDING ALL USERS ASSIGNED TO SALES DEPARTMENT');
    console.log('-'.repeat(80));
    
    const usersInSales = await User.find({ department: salesDept._id });
    console.log(`Found ${usersInSales.length} user(s) assigned to Sales department:\n`);
    
    if (usersInSales.length > 0) {
      usersInSales.forEach(user => {
        console.log(`  - ${user.name} (${user.email})`);
        console.log(`    ID: ${user._id}`);
        console.log(`    Role: ${user.role}`);
      });
    } else {
      console.log('  ❌ No users found!');
    }
    console.log();

    // 4. Check if employees array is populated
    console.log('4️⃣ CHECKING DEPARTMENT EMPLOYEES ARRAY');
    console.log('-'.repeat(80));
    
    if (salesDept.employees.length > 0) {
      console.log(`Employees array has ${salesDept.employees.length} ID(s):\n`);
      
      for (const empId of salesDept.employees) {
        const emp = await User.findById(empId);
        if (emp) {
          console.log(`  ✅ ${emp.name} (${emp.email})`);
        } else {
          console.log(`  ❌ ID ${empId} - User not found (orphaned reference)`);
        }
      }
    } else {
      console.log('❌ Employees array is EMPTY');
    }
    console.log();

    // 5. Check for mismatches
    console.log('5️⃣ CHECKING FOR MISMATCHES');
    console.log('-'.repeat(80));
    
    const userIds = usersInSales.map(u => u._id.toString());
    const empIds = salesDept.employees.map(e => e.toString());
    
    const inUsersNotInArray = userIds.filter(id => !empIds.includes(id));
    const inArrayNotInUsers = empIds.filter(id => !userIds.includes(id));
    
    if (inUsersNotInArray.length > 0) {
      console.log(`⚠️  ${inUsersNotInArray.length} user(s) have department=Sales but NOT in employees array:`);
      for (const userId of inUsersNotInArray) {
        const user = await User.findById(userId);
        console.log(`  - ${user.name} (${user.email})`);
      }
      console.log();
    }
    
    if (inArrayNotInUsers.length > 0) {
      console.log(`⚠️  ${inArrayNotInUsers.length} ID(s) in employees array but user.department != Sales:`);
      for (const empId of inArrayNotInUsers) {
        const user = await User.findById(empId);
        if (user) {
          console.log(`  - ${user.name}: department=${user.department}`);
        } else {
          console.log(`  - ${empId}: User not found (orphaned)`);
        }
      }
      console.log();
    }
    
    if (inUsersNotInArray.length === 0 && inArrayNotInUsers.length === 0) {
      console.log('✅ No mismatches found - data is in sync!');
      console.log();
    }

    // 6. Provide fix commands
    console.log('6️⃣ FIX COMMANDS');
    console.log('-'.repeat(80));
    
    if (usersInSales.length === 0 && salesUsers.length > 0) {
      console.log('⚠️  Users with "sales" in name exist but NOT assigned to Sales department\n');
      console.log('Fix commands:\n');
      
      for (const user of salesUsers) {
        console.log(`// Assign ${user.name} to Sales department`);
        console.log(`db.users.updateOne(`);
        console.log(`  { _id: ObjectId("${user._id}") },`);
        console.log(`  { $set: { department: ObjectId("${salesDept._id}") } }`);
        console.log(`);`);
        console.log();
      }
    }
    
    if (inUsersNotInArray.length > 0) {
      console.log('⚠️  Sync employees array:\n');
      console.log(`db.departments.updateOne(`);
      console.log(`  { _id: ObjectId("${salesDept._id}") },`);
      console.log(`  { $set: { employees: [${userIds.map(id => `ObjectId("${id}")`).join(', ')}] } }`);
      console.log(`);`);
      console.log();
    }

    // 7. Auto-fix option
    console.log('7️⃣ AUTO-FIX');
    console.log('-'.repeat(80));
    
    if (inUsersNotInArray.length > 0) {
      console.log('🔧 Fixing mismatch: Adding users to employees array...\n');
      
      for (const userId of inUsersNotInArray) {
        await Department.findByIdAndUpdate(
          salesDept._id,
          { $addToSet: { employees: userId } }
        );
        const user = await User.findById(userId);
        console.log(`  ✅ Added ${user.name} to employees array`);
      }
      
      console.log('\n✅ Fix applied! Verifying...\n');
      
      const updatedDept = await Department.findById(salesDept._id);
      console.log(`Updated employees array length: ${updatedDept.employees.length}`);
      console.log(`Users with department=Sales: ${usersInSales.length}`);
      console.log(`Match: ${updatedDept.employees.length === usersInSales.length ? '✅' : '❌'}`);
    } else if (usersInSales.length === 0) {
      console.log('⚠️  No users assigned to Sales department');
      console.log('   Please assign users via Employee Profile Management');
    } else {
      console.log('✅ No fixes needed - data is already in sync!');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check Complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkSalesDepartment();
