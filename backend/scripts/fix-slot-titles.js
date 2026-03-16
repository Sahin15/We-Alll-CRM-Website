import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const fixSlotTitles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all slots that don't have project name in title
    const slots = await Slot.find({
      $or: [
        { title: /^Slot \d+$/ }, // Matches "Slot 1", "Slot 2", etc.
        { title: { $regex: /^Slot \d+$/ } }
      ]
    }).populate('project', 'name');

    console.log(`Found ${slots.length} slots to fix`);

    let updated = 0;
    for (const slot of slots) {
      if (slot.project && slot.project.name) {
        const newTitle = `${slot.project.name} - Slot ${slot.slotNumber}`;
        const newDescription = `Work slot ${slot.slotNumber} for ${slot.project.name} (${slot.period.periodIdentifier})`;

        await Slot.findByIdAndUpdate(slot._id, {
          title: newTitle,
          description: newDescription
        });

        console.log(`✅ Updated slot ${slot._id}: "${newTitle}"`);
        updated++;
      }
    }

    console.log(`\n✅ Successfully updated ${updated} slots`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing slot titles:', error);
    process.exit(1);
  }
};

fixSlotTitles();
