import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const fixSlotTitles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find all slots that don't have project name in title
    const slots = await Slot.find({
      $or: [
        { title: /^Slot \d+$/ }, // Matches "Slot 1", "Slot 2", etc.
        { title: { $regex: /^Slot \d+$/ } }
      ]
    }).populate('project', 'name');

    

    let updated = 0;
    for (const slot of slots) {
      if (slot.project && slot.project.name) {
        const newTitle = `${slot.project.name} - Slot ${slot.slotNumber}`;
        const newDescription = `Work slot ${slot.slotNumber} for ${slot.project.name} (${slot.period.periodIdentifier})`;

        await Slot.findByIdAndUpdate(slot._id, {
          title: newTitle,
          description: newDescription
        });

        
        updated++;
      }
    }

    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

fixSlotTitles();
