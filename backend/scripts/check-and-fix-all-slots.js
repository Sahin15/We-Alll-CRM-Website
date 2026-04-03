import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const checkAndFixAllSlots = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find all slots
    const allSlots = await Slot.find({}).populate('project', 'name');

    

    // Group by project
    const slotsByProject = {};
    allSlots.forEach(slot => {
      const projectName = slot.project?.name || 'Unknown';
      if (!slotsByProject[projectName]) {
        slotsByProject[projectName] = [];
      }
      slotsByProject[projectName].push(slot);
    });

    // Check and fix each project's slots
    let totalUpdated = 0;
    for (const [projectName, slots] of Object.entries(slotsByProject)) {
      
      

      let projectUpdated = 0;
      for (const slot of slots) {
        const expectedTitle = `${projectName} - Slot ${slot.slotNumber}`;
        const expectedDescription = `Work slot ${slot.slotNumber} for ${projectName} (${slot.period.periodIdentifier})`;

        if (slot.title !== expectedTitle || slot.description !== expectedDescription) {
          
          
          

          await Slot.findByIdAndUpdate(slot._id, {
            title: expectedTitle,
            description: expectedDescription
          });

          
          projectUpdated++;
          totalUpdated++;
        }
      }

      if (projectUpdated === 0) {
        
      }
    }

    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

checkAndFixAllSlots();
