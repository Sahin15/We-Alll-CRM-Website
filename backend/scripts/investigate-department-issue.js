import mongoose from "mongoose";
import User from "../src/models/userModel.js";
import Department from "../src/models/departmentModel.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: './backend/.env' });

const investigateDepartmentIssue = async () => {
  try {
    console.log("🔍 Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    // 1. Find Jit Sarkar specifically
    console.log("\n🔍 Looking for Jit Sarkar...");
    const jitSarkar = await User.findOne({
      $or: [
        { name: { $regex: /jit.*sarkar/i } },
        { name: { $regex: /sarkar.*jit/i } },
        { email: { $regex: /jit/i } }
      ]
    }).populate('department', 'name');

    if (jitSarkar) {
      console.log("👤 Found Jit Sarkar:");
      console.log(`   ID: ${jitSarkar._id}`);
      console.log(`   Name: ${jitSarkar.name}`);
      console.log(`   Email: ${jitSarkar.email}`);
      console.log(`   Role: ${jitSarkar.role}`);
      console.log(`   Department: ${jitSarkar.department ? jitSarkar.department.name : 'None'}`);
      console.log(`   Department ID: ${jitSarkar.department ? jitSarkar.department._id : 'None'}`);
    } else {
      console.log("❌ Jit Sarkar not found");
    }

    // 2. Get all departments
    console.log("\n📋 All Departments:");
    const departments = await Department.find({})
      .populate('head', 'name email')
      .populate('employees', 'name email');

    for (const dept of departments) {
      console.log(`\n🏢 ${dept.name} (ID: ${dept._id})`);
      console.log(`   Head: ${dept.head ? dept.head.name : 'None'}`);
      console.log(`   Employees in department.employees array: ${dept.employees.length}`);
      
      // Check if Jit Sarkar is in this department's employees array
      if (jitSarkar && dept.employees.some(emp => emp._id.toString() === jitSarkar._id.toString())) {
        console.log(`   ⚠️  Jit Sarkar is in ${dept.name}'s employees array!`);
      }
    }

    // 3. Find all users and their department assignments
    console.log("\n👥 All Users and their departments:");
    const allUsers = await User.find({})
      .populate('department', 'name')
      .select('name email role department');

    const departmentGroups = {};
    const usersWithoutDepartment = [];

    for (const user of allUsers) {
      if (user.department) {
        const deptName = user.department.name;
        if (!departmentGroups[deptName]) {
          departmentGroups[deptName] = [];
        }
        departmentGroups[deptName].push({
          name: user.name,
          email: user.email,
          role: user.role,
          id: user._id.toString()
        });
      } else {
        usersWithoutDepartment.push({
          name: user.name,
          email: user.email,
          role: user.role,
          id: user._id.toString()
        });
      }
    }

    console.log("\n📊 Users grouped by department:");
    for (const [deptName, users] of Object.entries(departmentGroups)) {
      console.log(`\n🏢 ${deptName}:`);
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
        if (user.name.toLowerCase().includes('jit')) {
          console.log(`     ⚠️  This is Jit Sarkar in ${deptName}!`);
        }
      });
    }

    if (usersWithoutDepartment.length > 0) {
      console.log("\n❌ Users without department:");
      usersWithoutDepartment.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
    }

    // 4. Check for inconsistencies
    console.log("\n🔍 Checking for inconsistencies...");
    
    for (const dept of departments) {
      // Check if all users in department.employees have their department field set correctly
      for (const empId of dept.employees) {
        const user = await User.findById(empId).populate('department', 'name');
        if (!user.department || user.department._id.toString() !== dept._id.toString()) {
          console.log(`⚠️  INCONSISTENCY: ${user.name} is in ${dept.name}'s employees array but their department field is ${user.department ? user.department.name : 'null'}`);
        }
      }
    }

    // Check reverse - users with department field but not in department's employees array
    for (const user of allUsers) {
      if (user.department) {
        const dept = await Department.findById(user.department._id);
        if (dept && !dept.employees.includes(user._id)) {
          console.log(`⚠️  INCONSISTENCY: ${user.name} has department field set to ${user.department.name} but is not in that department's employees array`);
        }
      }
    }

    console.log("\n✅ Investigation complete!");

  } catch (error) {
    console.error("❌ Error during investigation:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
};

// Run the investigation
investigateDepartmentIssue();