import mongoose from "mongoose";
import User from "../src/models/userModel.js";
import Department from "../src/models/departmentModel.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: './backend/.env' });

/**
 * Validation function to check department assignment consistency
 * This can be run periodically to ensure data integrity
 */
export const validateDepartmentConsistency = async () => {
  try {
    console.log("🔍 Validating department assignment consistency...");

    const inconsistencies = [];

    // Get all users and departments
    const allUsers = await User.find({}).populate('department', 'name');
    const allDepartments = await Department.find({}).populate('employees', 'name department');

    // Check 1: Users with department field but not in department's employees array
    for (const user of allUsers) {
      if (user.department) {
        const dept = await Department.findById(user.department._id);
        if (dept && !dept.employees.includes(user._id)) {
          inconsistencies.push({
            type: 'USER_NOT_IN_DEPT_ARRAY',
            user: user.name,
            userId: user._id,
            userDepartment: user.department.name,
            departmentId: user.department._id,
            message: `${user.name} has department field set to ${user.department.name} but is not in that department's employees array`
          });
        }
      }
    }

    // Check 2: Users in department employees array but with wrong department field
    for (const dept of allDepartments) {
      for (const emp of dept.employees) {
        if (!emp.department || emp.department.toString() !== dept._id.toString()) {
          inconsistencies.push({
            type: 'USER_IN_WRONG_DEPT_ARRAY',
            user: emp.name,
            userId: emp._id,
            departmentName: dept.name,
            departmentId: dept._id,
            userDepartment: emp.department ? emp.department.toString() : 'null',
            message: `${emp.name} is in ${dept.name}'s employees array but their department field is ${emp.department ? 'different' : 'null'}`
          });
        }
      }
    }

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      totalUsers: allUsers.length,
      totalDepartments: allDepartments.length
    };

  } catch (error) {
    console.error("Error validating department consistency:", error);
    throw error;
  }
};

/**
 * Auto-fix function to resolve inconsistencies
 * Uses User.department field as source of truth
 */
export const autoFixDepartmentConsistency = async () => {
  try {
    console.log("🔧 Auto-fixing department assignment inconsistencies...");

    // Clear all department employees arrays
    await Department.updateMany({}, { $set: { employees: [] } });

    // Rebuild based on user.department field
    const usersWithDepartments = await User.find({ 
      department: { $exists: true, $ne: null } 
    });

    const departmentUpdates = {};
    
    for (const user of usersWithDepartments) {
      const deptId = user.department.toString();
      if (!departmentUpdates[deptId]) {
        departmentUpdates[deptId] = [];
      }
      departmentUpdates[deptId].push(user._id);
    }

    // Update each department
    for (const [deptId, employees] of Object.entries(departmentUpdates)) {
      await Department.findByIdAndUpdate(
        deptId,
        { $set: { employees } }
      );
    }

    console.log("✅ Department consistency auto-fix complete");
    return true;

  } catch (error) {
    console.error("Error auto-fixing department consistency:", error);
    throw error;
  }
};

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runValidation = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      
      const result = await validateDepartmentConsistency();
      
      if (result.isConsistent) {
        console.log("✅ All department assignments are consistent!");
      } else {
        console.log(`⚠️  Found ${result.inconsistencies.length} inconsistencies:`);
        result.inconsistencies.forEach((inc, index) => {
          console.log(`${index + 1}. ${inc.message}`);
        });
        
        console.log("\n🔧 Running auto-fix...");
        await autoFixDepartmentConsistency();
        
        // Validate again
        const recheck = await validateDepartmentConsistency();
        if (recheck.isConsistent) {
          console.log("✅ All inconsistencies have been resolved!");
        } else {
          console.log(`❌ ${recheck.inconsistencies.length} inconsistencies remain`);
        }
      }
      
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      await mongoose.disconnect();
    }
  };
  
  runValidation();
}