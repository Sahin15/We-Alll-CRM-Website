import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const checkAndFixAllSlots = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all slots
    const allSlots = await Slot.find({}).populate('project', 'name');

    console.log(`\nTotal slots in database: ${allSlots.length}\n`);

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
      console.log(`\n📋 Project: ${projectName}`);
      console.log(`   Total slots: ${slots.length}`);

      let projectUpdated = 0;
      for (const slot of slots) {
        const expectedTitle = `${projectName} - Slot ${slot.slotNumber}`;
        const expectedDescription = `Work slot ${slot.slotNumber} for ${projectName} (${slot.period.periodIdentifier})`;

        if (slot.title !== expectedTitle || slot.description !== expectedDescription) {
          console.log(`   ⚠️  Slot ${slot.slotNumber}:`);
          console.log(`      Current title: "${slot.title}"`);
          console.log(`      Expected title: "${expectedTitle}"`);

          await Slot.findByIdAndUpdate(slot._id, {
            title: expectedTitle,
            description: expectedDescription
          });

          console.log(`      ✅ Fixed`);
          projectUpdated++;
          totalUpdated++;
        }
      }

      if (projectUpdated === 0) {
        console.log(`   ✅ All slots are correct`);
      }
    }

    console.log(`\n✅ Successfully updated ${totalUpdated} slots`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking and fixing slots:', error);
    process.exit(1);
  }
};

checkAndFixAllSlots();
