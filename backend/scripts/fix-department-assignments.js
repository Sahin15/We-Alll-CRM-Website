import mongoose from "mongoose";
import User from "../src/models/userModel.js";
import Department from "../src/models/departmentModel.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: './backend/.env' });

const fixDepartmentAssignments = async () => {
  try {
    console.log("🔧 Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    console.log("\n🔧 Starting department assignment fix...");

    // Strategy: Use the User.department field as the source of truth
    // and update the Department.employees arrays accordingly

    // 1. Clear all department employees arrays first
    console.log("\n🧹 Clearing all department employees arrays...");
    await Department.updateMany({}, { $set: { employees: [] } });
    console.log("✅ All department employees arrays cleared");

    // 2. Get all users with departments
    console.log("\n👥 Getting all users with department assignments...");
    const usersWithDepartments = await User.find({ 
      department: { $exists: true, $ne: null } 
    }).populate('department', 'name');

    console.log(`Found ${usersWithDepartments.length} users with department assignments`);

    // 3. Rebuild department employees arrays based on user.department field
    const departmentUpdates = {};
    
    for (const user of usersWithDepartments) {
      if (user.department) {
        const deptId = user.department._id.toString();
        if (!departmentUpdates[deptId]) {
          departmentUpdates[deptId] = {
            name: user.department.name,
            employees: []
          };
        }
        departmentUpdates[deptId].employees.push(user._id);
        
        console.log(`📝 Adding ${user.name} to ${user.department.name} department`);
      }
    }

    // 4. Update each department with the correct employees array
    console.log("\n🔄 Updating department employees arrays...");
    for (const [deptId, deptData] of Object.entries(departmentUpdates)) {
      await Department.findByIdAndUpdate(
        deptId,
        { $set: { employees: deptData.employees } }
      );
      console.log(`✅ Updated ${deptData.name}: ${deptData.employees.length} employees`);
    }

    // 5. Verify the fix by checking Jit Sarkar specifically
    console.log("\n🔍 Verifying fix for Jit Sarkar...");
    const jitSarkar = await User.findOne({
      $or: [
        { name: { $regex: /jit.*sarkar/i } },
        { email: { $regex: /jit/i } }
      ]
    }).populate('department', 'name');

    if (jitSarkar) {
      console.log(`👤 Jit Sarkar:`);
      console.log(`   Name: ${jitSarkar.name}`);
      console.log(`   Department field: ${jitSarkar.department ? jitSarkar.department.name : 'None'}`);
      
      if (jitSarkar.department) {
        const dept = await Department.findById(jitSarkar.department._id);
        const isInEmployeesArray = dept.employees.includes(jitSarkar._id);
        console.log(`   In department employees array: ${isInEmployeesArray ? 'Yes' : 'No'}`);
        
        if (isInEmployeesArray) {
          console.log("✅ Jit Sarkar's assignment is now consistent!");
        } else {
          console.log("❌ Still inconsistent - this shouldn't happen");
        }
      }
    }

    // 6. Final verification - check for any remaining inconsistencies
    console.log("\n🔍 Final verification...");
    let inconsistenciesFound = 0;

    // Check all users
    const allUsers = await User.find({}).populate('department', 'name');
    for (const user of allUsers) {
      if (user.department) {
        const dept = await Department.findById(user.department._id);
        if (dept && !dept.employees.includes(user._id)) {
          console.log(`❌ STILL INCONSISTENT: ${user.name} -> ${user.department.name}`);
          inconsistenciesFound++;
        }
      }
    }

    // Check all departments
    const allDepartments = await Department.find({}).populate('employees', 'name department');
    for (const dept of allDepartments) {
      for (const emp of dept.employees) {
        if (!emp.department || emp.department.toString() !== dept._id.toString()) {
          console.log(`❌ STILL INCONSISTENT: ${emp.name} in ${dept.name} employees array but department field is different`);
          inconsistenciesFound++;
        }
      }
    }

    if (inconsistenciesFound === 0) {
      console.log("✅ All department assignments are now consistent!");
    } else {
      console.log(`⚠️  Found ${inconsistenciesFound} remaining inconsistencies`);
    }

    // 7. Summary
    console.log("\n📊 Summary:");
    const finalDepartments = await Department.find({}).populate('employees', 'name');
    for (const dept of finalDepartments) {
      console.log(`🏢 ${dept.name}: ${dept.employees.length} employees`);
      dept.employees.forEach(emp => {
        console.log(`   - ${emp.name}`);
      });
    }

    console.log("\n✅ Department assignment fix complete!");

  } catch (error) {
    console.error("❌ Error during fix:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
};

// Run the fix
fixDepartmentAssignments();