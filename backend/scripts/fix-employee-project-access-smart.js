import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "../src/models/projectModel.js";
import User from "../src/models/userModel.js";
import Department from "../src/models/departmentModel.js";

dotenv.config();

/**
 * Smart fix for employee project access
 * Assigns employees to projects based on department or all employees if no department structure
 */
const smartFixEmployeeProjectAccess = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if departments are being used
    const departmentCount = await Department.countDocuments();
    const useDepartments = departmentCount > 0;
    
    console.log(`🏢 Department system: ${useDepartments ? 'ENABLED' : 'DISABLED'} (${departmentCount} departments)`);

    // Get all auto-generated projects without assigned users
    const autoProjects = await Project.find({
      name: { $regex: ' Project$' },
      $or: [
        { assignedUsers: { $exists: false } },
        { assignedUsers: { $size: 0 } }
      ]
    }).populate('client', 'name serviceCompany').select('_id name client assignedUsers department departments');

    console.log(`🤖 Found ${autoProjects.length} auto-generated projects needing employee assignment`);

    if (autoProjects.length === 0) {
      console.log("✅ All auto-generated projects already have assigned users!");
      process.exit(0);
    }

    let updatedCount = 0;
    let errorCount = 0;

    if (useDepartments) {
      // Department-based assignment
      console.log("\n🎯 Using SMART department-based assignment...");
      
      for (const project of autoProjects) {
        try {
          let employeesToAssign = [];
          
          // If project has specific departments, assign employees from those departments
          if (project.departments && project.departments.length > 0) {
            const deptEmployees = await User.find({
              role: { $in: ['employee', 'hod'] },
              status: 'active',
              department: { $in: project.departments }
            }).select('_id');
            employeesToAssign = deptEmployees.map(emp => emp._id);
          }
          // If project has single department, assign employees from that department
          else if (project.department) {
            const deptEmployees = await User.find({
              role: { $in: ['employee', 'hod'] },
              status: 'active',
              department: project.department
            }).select('_id');
            employeesToAssign = deptEmployees.map(emp => emp._id);
          }
          // If no department specified, assign all employees
          else {
            const allEmployees = await User.find({
              role: { $in: ['employee', 'hod'] },
              status: 'active'
            }).select('_id');
            employeesToAssign = allEmployees.map(emp => emp._id);
          }

          if (employeesToAssign.length === 0) {
            console.log(`⚠️  No employees found for "${project.name}" - assigning all employees as fallback`);
            const allEmployees = await User.find({
              role: { $in: ['employee', 'hod'] },
              status: 'active'
            }).select('_id');
            employeesToAssign = allEmployees.map(emp => emp._id);
          }

          await Project.findByIdAndUpdate(
            project._id,
            { 
              $set: { 
                assignedUsers: employeesToAssign,
                teamMembers: employeesToAssign
              }
            }
          );

          console.log(`✅ "${project.name}" → ${employeesToAssign.length} employees assigned`);
          updatedCount++;
          
        } catch (error) {
          console.error(`❌ Failed to update "${project.name}": ${error.message}`);
          errorCount++;
        }
      }
    } else {
      // Simple assignment - all employees to all projects
      console.log("\n🌐 Using SIMPLE all-employees assignment...");
      
      const allEmployees = await User.find({
        role: { $in: ['employee', 'hod'] },
        status: 'active'
      }).select('_id');
      
      const employeeIds = allEmployees.map(emp => emp._id);
      console.log(`👥 Assigning ${employeeIds.length} employees to each project`);

      for (const project of autoProjects) {
        try {
          await Project.findByIdAndUpdate(
            project._id,
            { 
              $set: { 
                assignedUsers: employeeIds,
                teamMembers: employeeIds
              }
            }
          );

          console.log(`✅ "${project.name}" → ${employeeIds.length} employees assigned`);
          updatedCount++;
          
        } catch (error) {
          console.error(`❌ Failed to update "${project.name}": ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 SMART EMPLOYEE PROJECT ACCESS FIX SUMMARY");
    console.log("=".repeat(70));
    console.log(`🏢 Assignment method: ${useDepartments ? 'Department-based' : 'All-employees'}`);
    console.log(`✅ Successfully updated: ${updatedCount} projects`);
    console.log(`❌ Failed to update: ${errorCount} projects`);
    console.log("=".repeat(70));

    if (updatedCount > 0) {
      console.log("\n🎉 Employee project access has been FIXED!");
      console.log("💡 Benefits:");
      console.log("   ✅ Employees can now see relevant projects");
      console.log("   ✅ Work item creation is now possible");
      console.log("   ✅ Project workspace access enabled");
      console.log("   ✅ Department-based access (if applicable)");
      console.log("\n🔄 Refresh the frontend to see changes immediately!");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error in smart fix:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

// Run the script
smartFixEmployeeProjectAccess();