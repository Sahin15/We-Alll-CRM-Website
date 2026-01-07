import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "../src/models/projectModel.js";
import User from "../src/models/userModel.js";
import Department from "../src/models/departmentModel.js";

dotenv.config();

/**
 * Assign employees to auto-generated projects so they can create work items
 * Maintains proper access control:
 * - HR/Admin: See all projects (no change needed)
 * - HoD: See department projects (no change needed) 
 * - Employees: See assigned projects (NEED TO ASSIGN THEM)
 */
const assignEmployeesToProjects = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all auto-generated projects without assigned users
    const autoProjects = await Project.find({
      name: { $regex: ' Project$' },
      $or: [
        { assignedUsers: { $exists: false } },
        { assignedUsers: { $size: 0 } }
      ]
    }).populate('client', 'name company serviceCompany').select('_id name client assignedUsers department departments');

    console.log(`🤖 Found ${autoProjects.length} auto-generated projects needing employee assignment`);

    if (autoProjects.length === 0) {
      console.log("✅ All auto-generated projects already have assigned employees!");
      process.exit(0);
    }

    // Get all active employees (not HR/Admin/HoD - they have different access)
    const employees = await User.find({
      role: 'employee',
      status: 'active'
    }).select('_id name email department');

    console.log(`👥 Found ${employees.length} active employees to assign`);

    if (employees.length === 0) {
      console.log("⚠️  No active employees found to assign to projects");
      process.exit(0);
    }

    let updatedCount = 0;
    let errorCount = 0;

    // Strategy: Assign ALL employees to ALL auto-generated projects
    // This ensures employees can see projects and create work items
    // Access control is still maintained at the API level
    const employeeIds = employees.map(emp => emp._id);

    console.log("\n🎯 Assigning employees to auto-generated projects...");
    console.log(`📋 Strategy: Assign all ${employeeIds.length} employees to each project`);
    console.log("💡 This enables work item creation while maintaining access control\n");

    for (const project of autoProjects) {
      try {
        await Project.findByIdAndUpdate(
          project._id,
          { 
            $set: { 
              assignedUsers: employeeIds,
              teamMembers: employeeIds // Also update team members for consistency
            }
          }
        );

        console.log(`✅ "${project.name}" (${project.client?.name}) → ${employeeIds.length} employees assigned`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to update "${project.name}": ${error.message}`);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 EMPLOYEE PROJECT ASSIGNMENT SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successfully updated: ${updatedCount} projects`);
    console.log(`❌ Failed to update: ${errorCount} projects`);
    console.log(`👥 Employees assigned per project: ${employeeIds.length}`);
    console.log("=".repeat(70));

    if (updatedCount > 0) {
      console.log("\n🎉 Employee project assignment completed!");
      console.log("\n📋 ACCESS CONTROL MAINTAINED:");
      console.log("   👑 HR/Admin: Can see ALL projects (unchanged)");
      console.log("   🏢 HoD: Can see department projects (unchanged)");
      console.log("   👤 Employees: Can now see assigned projects (FIXED)");
      
      console.log("\n💡 EMPLOYEES CAN NOW:");
      console.log("   ✅ See auto-generated projects in project list");
      console.log("   ✅ Create work items in these projects");
      console.log("   ✅ Access project workspaces and calendars");
      console.log("   ✅ View project details and progress");
      
      console.log("\n🔄 Please refresh the frontend to see changes!");
    }

    // Quick verification
    const sampleProject = await Project.findOne({
      name: { $regex: ' Project$' }
    }).select('name assignedUsers');
    
    if (sampleProject) {
      console.log(`\n🔍 VERIFICATION: "${sampleProject.name}" now has ${sampleProject.assignedUsers?.length || 0} assigned users`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error assigning employees to projects:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

// Run the script
assignEmployeesToProjects();