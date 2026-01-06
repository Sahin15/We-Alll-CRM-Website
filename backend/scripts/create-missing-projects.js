import mongoose from "mongoose";
import dotenv from "dotenv";
import Client from "../src/models/clientModel.js";
import Project from "../src/models/projectModel.js";
import User from "../src/models/userModel.js";

dotenv.config();

const createMissingProjects = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all clients
    const allClients = await Client.find({}).select('_id name email company ownername createdBy');
    console.log(`📊 Found ${allClients.length} total clients`);

    // Get all existing projects with their client IDs
    const existingProjects = await Project.find({}).select('client').lean();
    const clientsWithProjects = new Set(existingProjects.map(p => p.client?.toString()).filter(Boolean));
    
    console.log(`📊 Found ${existingProjects.length} existing projects for ${clientsWithProjects.size} clients`);

    // Find clients without projects
    const clientsWithoutProjects = allClients.filter(client => 
      !clientsWithProjects.has(client._id.toString())
    );

    console.log(`🎯 Found ${clientsWithoutProjects.length} clients without projects:`);
    
    if (clientsWithoutProjects.length === 0) {
      console.log("✅ All clients already have projects!");
      process.exit(0);
    }

    // Display clients without projects
    clientsWithoutProjects.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name} (${client.email}) - Company: ${client.company || 'N/A'}`);
    });

    console.log("\n🚀 Creating projects for clients without projects...\n");

    // Get a default user for createdBy (preferably admin or superadmin)
    const defaultUser = await User.findOne({ 
      role: { $in: ['superadmin', 'admin'] } 
    }).select('_id');

    if (!defaultUser) {
      console.error("❌ No admin or superadmin user found to assign as project creator");
      process.exit(1);
    }

    let successCount = 0;
    let errorCount = 0;

    // Create projects for each client without projects
    for (const client of clientsWithoutProjects) {
      try {
        const projectData = {
          name: `${client.name} Project`,
          description: `Project for ${client.name}${client.company ? ` (${client.company})` : ''}`,
          client: client._id,
          status: 'Pending',
          priority: 'medium',
          startDate: new Date(),
          createdBy: client.createdBy || defaultUser._id,
          // Default project settings
          progress: 0,
          budget: 0,
          slotConfiguration: {
            totalSlots: 10,
            slotType: 'generic',
            allowDynamicSlots: true,
            slotNamingPattern: 'Slot {number}',
            autoCreateSlots: true,
            enableSlotSystem: false
          },
          progressTracking: {
            calculationMethod: 'manual',
            completedSlots: 0,
            totalSlots: 10,
            progressPercentage: 0,
            lastProgressUpdate: new Date(),
            progressHistory: []
          },
          slotManagement: {
            allowSlotReassignment: true,
            requireApprovalForSlotChanges: false,
            slotCompletionRequiresApproval: false,
            autoReleaseOnWorkItemDeletion: true,
            notifyOnSlotCompletion: true
          },
          assignedUsers: [],
          services: [],
          tags: [],
          milestones: [],
          tasks: [],
          teamMembers: [],
          deliverables: [],
          departments: []
        };

        const project = await Project.create(projectData);
        
        console.log(`✅ Created project for ${client.name}: "${project.name}" (ID: ${project._id})`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to create project for ${client.name}: ${error.message}`);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 PROJECT CREATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully created: ${successCount} projects`);
    console.log(`❌ Failed to create: ${errorCount} projects`);
    console.log(`📊 Total clients processed: ${clientsWithoutProjects.length}`);
    console.log("=".repeat(60));

    if (successCount > 0) {
      console.log("\n🎉 Auto-generated projects have been created!");
      console.log("💡 These projects will appear in the 'Newly Created Projects - Needs Details' section");
      console.log("📝 Users can now edit these projects to add missing details like:");
      console.log("   • Detailed description");
      console.log("   • Budget information");
      console.log("   • Services/deliverables");
      console.log("   • Team members");
      console.log("   • Project timeline");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error in createMissingProjects:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

// Run the script
createMissingProjects();