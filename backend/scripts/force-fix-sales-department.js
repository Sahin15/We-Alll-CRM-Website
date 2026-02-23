/**
 * Force fix Sales department employee assignment
 * This script will:
 * 1. Find or create Sales department
 * 2. Find user named "sales"
 * 3. Assign user to Sales department (both ways)
 * 4. Verify the fix
 * 
 * Run: node backend/scripts/force-fix-sales-department.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config();

const forceFixSalesDepartment = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('FORCE FIX: SALES DEPARTMENT');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Find or create Sales department
    console.log('Step 1: Finding/Creating Sales Department');
    console.log('-'.repeat(80));
    
    let salesDept = await Department.findOne({ name: /^sales$/i });
    
    if (!salesDept) {
      console.log('❌ Sales department not found. Creating...');
      salesDept = await Department.create({
        name: 'Sales',
        description: 'Sales Department',
        type: 'operational',
        status: 'active',
        employees: []
      });
      console.log(`✅ Created Sales department: ${salesDept._id}`);
    } else {
      console.log(`✅ Found Sales department: ${salesDept._id}`);
      console.log(`   Current employees: ${salesDept.employees.length}`);
    }
    console.log();

    // Step 2: Find user(s) named "sales"
    console.log('Step 2: Finding User(s) Named "sales"');
    console.log('-'.repeat(80));
    
    const salesUsers = await User.find({ name: /sales/i });
    
    if (salesUsers.length === 0) {
      console.log('❌ No users found with "sales" in name');
      console.log('   Please create a user first or check the username');
      return;
    }
    
    console.log(`✅ Found ${salesUsers.length} user(s):`);
    salesUsers.forEach(u => {
      console.log(`   - ${u.name} (${u.email}) - ID: ${u._id}`);
      console.log(`     Current department: ${u.department || 'None'}`);
    });
    console.log();

    // Step 3: Assign each user to Sales department
    console.log('Step 3: Assigning Users to Sales Department');
    console.log('-'.repeat(80));
    
    for (const user of salesUsers) {
      console.log(`\nProcessing: ${user.name}`);
      
      // Get old department
      const oldDeptId = user.department ? user.department.toString() : null;
      
      // Update user.department
      user.department = salesDept._id;
      await user.save();
      console.log(`  ✅ Updated user.department to Sales`);
      
      // Remove from old department's employees array
      if (oldDeptId && oldDeptId !== salesDept._id.toString()) {
        await Department.findByIdAndUpdate(
          oldDeptId,
          { $pull: { employees: user._id } }
        );
        console.log(`  ✅ Removed from old department`);
      }
      
      // Add to Sales department's employees array
      await Department.findByIdAndUpdate(
        salesDept._id,
        { $addToSet: { employees: user._id } }
      );
      console.log(`  ✅ Added to Sales department employees array`);
    }
    console.log();

    // Step 4: Verify the fix
    console.log('Step 4: Verifying Fix');
    console.log('-'.repeat(80));
    
    // Reload department
    const updatedDept = await Department.findById(salesDept._id)
      .populate('employees', 'name email');
    
    console.log(`\nSales Department Status:`);
    console.log(`  ID: ${updatedDept._id}`);
    console.log(`  Name: ${updatedDept.name}`);
    console.log(`  Employees Array Length: ${updatedDept.employees.length}`);
    console.log(`  Employees:`);
    
    if (updatedDept.employees.length > 0) {
      updatedDept.employees.forEach((emp, index) => {
        console.log(`    ${index + 1}. ${emp.name} (${emp.email})`);
      });
    } else {
      console.log(`    ❌ Still empty!`);
    }
    console.log();

    // Verify users
    console.log('User Verification:');
    for (const salesUser of salesUsers) {
      const verifyUser = await User.findById(salesUser._id).populate('department', 'name');
      console.log(`  ${verifyUser.name}:`);
      console.log(`    Department: ${verifyUser.department?.name || 'None'}`);
      console.log(`    Department ID: ${verifyUser.department?._id || 'None'}`);
      console.log(`    Matches Sales: ${verifyUser.department?._id?.toString() === salesDept._id.toString() ? '✅' : '❌'}`);
    }
    console.log();

    // Final check
    const usersInSales = await User.countDocuments({ department: salesDept._id });
    const employeesInArray = updatedDept.employees.length;
    
    console.log('Final Verification:');
    console.log(`  Users with department=Sales: ${usersInSales}`);
    console.log(`  Employees in array: ${employeesInArray}`);
    console.log(`  Match: ${usersInSales === employeesInArray ? '✅ SUCCESS' : '❌ MISMATCH'}`);
    
    if (usersInSales === employeesInArray && usersInSales > 0) {
      console.log('\n🎉 SUCCESS! Sales department is now properly configured!');
    } else if (usersInSales === 0) {
      console.log('\n⚠️  No users assigned to Sales department');
    } else {
      console.log('\n⚠️  Still have a mismatch. Please check manually.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Force Fix Complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

forceFixSalesDepartment();
