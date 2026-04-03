import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models and services
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import slotManagementService from '../src/services/slotManagementService.js';

const TARGET_SLOT_COUNT = 20;

const updateAllProjectsTo20Slots = async () => {
  try {
    
    await mongoose.connect(process.env.MONGO_URI);
    

    // Get all projects
    const allProjects = await Project.find({})
      .select('name slotConfiguration progressTracking createdBy projectHead')
      .lean();

    

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const project of allProjects) {
      try {
        

        // Get current slot count
        const currentSlotCount = await Slot.countDocuments({ project: project._id });
        

        if (currentSlotCount >= TARGET_SLOT_COUNT) {
          , skipping`);
          skippedCount++;
          continue;
        }

        // Calculate how many slots to add
        const slotsToAdd = TARGET_SLOT_COUNT - currentSlotCount;
        

        // Update project configuration
        await Project.findByIdAndUpdate(project._id, {
          'slotConfiguration.enableSlotSystem': true,
          'slotConfiguration.totalSlots': TARGET_SLOT_COUNT,
          'slotConfiguration.autoCreateSlots': true,
          'progressTracking.calculationMethod': 'slot-based',
          'progressTracking.totalSlots': TARGET_SLOT_COUNT
        });

        // Create additional slots
        const fallbackUserId = project.createdBy || project.projectHead;
        
        const result = await slotManagementService.createSlotsForProject(project._id, {
          count: slotsToAdd,
          startingSlotNumber: currentSlotCount + 1,
          slotType: 'work',
          createdBy: fallbackUserId
        });

        
        
        
        updatedCount++;

      } catch (error) {
        
        errorCount++;
      }
    }

    );
    
    );
    
    : ${skippedCount}`);
    
    
    );

    await mongoose.connection.close();
    
  } catch (error) {
    
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
updateAllProjectsTo20Slots();
