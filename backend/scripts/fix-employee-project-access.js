import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "../src/models/projectModel.js";
import User from "../src/models/userModel.js";

dotenv.config();

/**
 * Fix employee project access by assigning all employees to auto-generated projects
 * This ensures employees can see projects and create work items
 */
const fixEmployeeProjectAccess = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all employees (including HoDs who are also employees)
    const employees = await User.find({ 
      role: { $in: ['employee', 'hod'] },
      status: 'active'
    }).select('_id name email role');
    
    console.log(`👥 Found ${employees.length} active employees/HoDs`);

    // Get all auto-generated projects (those with " Project" in name and no assigned users)
    const autoProjects = await Project.find({
      name: { $regex: ' Project$' },
      $or: [
        { assignedUsers: { $exists: false } },
        { assignedUsers: { $size: 0 } }
      ]
    }).select('_id name client assignedUsers');

    console.log(`🤖 Found ${autoProjects.length} auto-generated projects without assigned users`);

    if (autoProjects.length === 0) {
      console.log("✅ All auto-generated projects already have assigned users!");
      process.exit(0);
    }

    // Extract employee IDs
    const employeeIds = employees.map(emp => emp._id);

    let updatedCount = 0;
    let errorCount = 0;

    // Assign all employees to each auto-generated project
    for (const project of autoProjects) {
      try {
        await Project.findByIdAndUpdate(
          project._id,
          { 
            $set: { 
              assignedUsers: employeeIds,
              teamMembers: employeeIds // Also add to team members for consistency
            }
          }
        );

        console.log(`✅ Updated "${project.name}" - assigned ${employeeIds.length} employees`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to update "${project.name}": ${error.message}`);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 EMPLOYEE PROJECT ACCESS FIX SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount} projects`);
    console.log(`❌ Failed to update: ${errorCount} projects`);
    console.log(`👥 Employees assigned per project: ${employeeIds.length}`);
    console.log("=".repeat(60));

    if (updatedCount > 0) {
      console.log("\n🎉 Employee project access has been fixed!");
      console.log("💡 Employees can now:");
      console.log("   • See all auto-generated projects");
      console.log("   • Create work items in these projects");
      console.log("   • Access project workspaces");
      console.log("\n🔄 Please refresh the frontend to see the changes.");
    }

    // Verify the fix
    console.log("\n🔍 VERIFICATION:");
    const verifyProject = await Project.findOne({
      name: { $regex: ' Project$' }
    }).select('name assignedUsers');
    
    if (verifyProject) {
      console.log(`📋 Sample project "${verifyProject.name}" now has ${verifyProject.assignedUsers?.length || 0} assigned users`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing employee project access:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

// Run the script
fixEmployeeProjectAccess();