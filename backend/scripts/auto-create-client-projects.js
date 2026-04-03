import mongoose from "mongoose";
import dotenv from "dotenv";
import Client from "../src/models/clientModel.js";
import Project from "../src/models/projectModel.js";
import User from "../src/models/userModel.js";
import Slot from "../src/models/slotModel.js";

dotenv.config();

const DEFAULT_SLOT_COUNT = 20;

/**
 * Auto-create projects for clients who don't have any
 * This script can be run periodically or on-demand
 */
const autoCreateClientProjects = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Get all clients
    const allClients = await Client.find({}).select('_id name email company ownername createdBy');
    
    // Get all existing projects with their client IDs
    const existingProjects = await Project.find({}).select('client').lean();
    const clientsWithProjects = new Set(existingProjects.map(p => p.client?.toString()).filter(Boolean));
    
    // Find clients without projects
    const clientsWithoutProjects = allClients.filter(client => 
      !clientsWithProjects.has(client._id.toString())
    );

    
    
    
    
    if (clientsWithoutProjects.length === 0) {
      
      process.exit(0);
    }

    // Get a default user for createdBy
    const defaultUser = await User.findOne({ 
      role: { $in: ['superadmin', 'admin'] } 
    }).select('_id');

    if (!defaultUser) {
      
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
          projectHead: client.createdBy || defaultUser._id,
          progress: 0,
          budget: 0,
          assignedUsers: [],
          services: [],
          tags: [],
          milestones: [],
          tasks: [],
          teamMembers: [],
          deliverables: [],
          departments: [],
          // Enable slot system
          slotConfiguration: {
            enableSlotSystem: true,
            totalSlots: DEFAULT_SLOT_COUNT,
            slotType: 'generic',
            autoCreateSlots: false
          },
          progressTracking: {
            calculationMethod: 'slot-based',
            totalSlots: DEFAULT_SLOT_COUNT,
            completedSlots: 0
          }
        };

        const project = await Project.create(projectData);
        
        // Create slots for the project
        for (let i = 1; i <= DEFAULT_SLOT_COUNT; i++) {
          await Slot.create({
            project: project._id,
            client: client._id,
            slotNumber: i,
            slotIdentifier: `Slot ${i}`,
            title: `Slot ${i} - ${project.name}`,
            description: `Work slot ${i} for ${project.name}`,
            slotType: 'work',
            workType: 'Other',
            priority: 'Medium',
            assignmentStatus: 'available',
            status: 'Pending',
            createdBy: project.createdBy,
            slotConfiguration: {
              isRequired: false,
              canBeSkipped: true,
              requiresApproval: false,
              estimatedEffort: 8,
              weight: 1
            }
          });
        }
        
        `);
        successCount++;
        
      } catch (error) {
        
        errorCount++;
      }
    }

    );
    
    
    
    );

    if (successCount > 0) {
      
      
      
      
    }

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

// Check if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoCreateClientProjects();
}

export default autoCreateClientProjects;