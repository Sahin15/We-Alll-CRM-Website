/**
 * Script to diagnose department employee assignment issues
 * Run: node backend/scripts/diagnose-department-employees.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config();

const diagnoseDepartmentEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('DEPARTMENT EMPLOYEE ASSIGNMENT DIAGNOSIS');
    console.log('='.repeat(80));
    console.log();

    // Get all departments
    const departments = await Department.find();
    console.log(`📊 Total Departments: ${departments.length}\n`);

    // Get all users
    const allUsers = await User.find().select('name email department role');
    console.log(`👥 Total Users: ${allUsers.length}\n`);

    // Check Sales department specifically
    console.log('🔍 SALES DEPARTMENT ANALYSIS');
    console.log('-'.repeat(80));
    
    const salesDept = await Department.findOne({ name: /^sales$/i });
    
    if (!salesDept) {
      console.log('❌ Sales department not found in database!');
      console.log('\nAvailable departments:');
      departments.forEach(dept => {
        console.log(`  - ${dept.name} (ID: ${dept._id})`);
      });
    } else {
      console.log(`✅ Sales Department Found`);
      console.log(`   ID: ${salesDept._id}`);
      console.log(`   Name: "${salesDept.name}"`);
      console.log(`   Description: ${salesDept.description || 'N/A'}`);
      console.log();

      // Find users assigned to Sales department
      console.log('👥 Users with Sales Department Assignment:');
      console.log('-'.repeat(80));
      
      // Method 1: Direct query
      const salesUsers = await User.find({ department: salesDept._id })
        .select('name email department role')
        .populate('department', 'name');
      
      console.log(`\nMethod 1 - Direct Query (department: ${salesDept._id}):`);
      console.log(`Found: ${salesUsers.length} user(s)`);
      
      if (salesUsers.length > 0) {
        salesUsers.forEach((user, index) => {
          console.log(`\n${index + 1}. ${user.name}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Department ID: ${user.department?._id || 'NULL'}`);
          console.log(`   Department Name: ${user.department?.name || 'NULL'}`);
        });
      } else {
        console.log('   ❌ No users found with this department assignment');
      }

      // Method 2: Check all users for any Sales-related department
      console.log('\n\nMethod 2 - Checking ALL users for Sales department:');
      console.log('-'.repeat(80));
      
      const usersWithDept = allUsers.filter(u => u.department);
      console.log(`Users with department assigned: ${usersWithDept.length}`);
      
      for (const user of usersWithDept) {
        const userDept = await Department.findById(user.department);
        if (userDept && userDept.name.toLowerCase() === 'sales') {
          console.log(`\n✅ Found: ${user.name}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Department ID in User: ${user.department}`);
          console.log(`   Department ID in DB: ${userDept._id}`);
          console.log(`   Department Name: ${userDept.name}`);
          console.log(`   IDs Match: ${user.department.toString() === salesDept._id.toString()}`);
        }
      }

      // Method 3: Check for users with name "sales"
      console.log('\n\nMethod 3 - Users with name containing "sales":');
      console.log('-'.repeat(80));
      
      const salesNamedUsers = await User.find({ 
        name: /sales/i 
      }).select('name email department role').populate('department', 'name');
      
      if (salesNamedUsers.length > 0) {
        salesNamedUsers.forEach((user, index) => {
          console.log(`\n${index + 1}. ${user.name}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Department: ${user.department?.name || 'NOT ASSIGNED'}`);
          console.log(`   Department ID: ${user.department?._id || 'NULL'}`);
          
          if (user.department) {
            console.log(`   Department ID Type: ${typeof user.department._id}`);
            console.log(`   Sales Dept ID Type: ${typeof salesDept._id}`);
            console.log(`   String comparison: "${user.department._id.toString()}" === "${salesDept._id.toString()}"`);
            console.log(`   Match: ${user.department._id.toString() === salesDept._id.toString()}`);
          }
        });
      } else {
        console.log('   No users found with "sales" in name');
      }
    }

    // Check for data type issues
    console.log('\n\n🔬 DATA TYPE ANALYSIS');
    console.log('-'.repeat(80));
    
    const sampleUser = await User.findOne({ department: { $exists: true, $ne: null } });
    if (sampleUser) {
      console.log('Sample user with department:');
      console.log(`  Name: ${sampleUser.name}`);
      console.log(`  Department field type: ${typeof sampleUser.department}`);
      console.log(`  Department value: ${sampleUser.department}`);
      console.log(`  Is ObjectId: ${mongoose.Types.ObjectId.isValid(sampleUser.department)}`);
    }

    // Summary
    console.log('\n\n📋 SUMMARY');
    console.log('-'.repeat(80));
    
    const usersWithoutDept = allUsers.filter(u => !u.department);
    const usersWithDept2 = allUsers.filter(u => u.department);
    
    console.log(`Total Users: ${allUsers.length}`);
    console.log(`Users WITH department: ${usersWithDept2.length}`);
    console.log(`Users WITHOUT department: ${usersWithoutDept.length}`);
    console.log();
    
    if (salesDept) {
      const salesCount = await User.countDocuments({ department: salesDept._id });
      console.log(`Users assigned to Sales department: ${salesCount}`);
    }

    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(80));
    
    if (salesUsers.length === 0 && salesNamedUsers.length > 0) {
      console.log('⚠️  User(s) with "sales" in name exist but not assigned to Sales department');
      console.log('   Action: Assign these users to the Sales department');
      salesNamedUsers.forEach(user => {
        if (!user.department || user.department.name !== 'Sales') {
          console.log(`\n   Fix command for ${user.name}:`);
          console.log(`   db.users.updateOne(`);
          console.log(`     { _id: ObjectId("${user._id}") },`);
          console.log(`     { $set: { department: ObjectId("${salesDept._id}") } }`);
          console.log(`   )`);
        }
      });
    }

    console.log('\n='.repeat(80));
    console.log('✅ Diagnosis Complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

diagnoseDepartmentEmployees();
