import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const fixAmitSantraSlots = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find Amit Santra project
    const project = await Project.findOne({ name: 'Amit Santra' });
    if (!project) {
      console.log('❌ Amit Santra project not found');
      process.exit(1);
    }

    console.log(`\n📋 Found project: ${project.name}`);

    // Find all slots for this project
    const allSlots = await Slot.find({ project: project._id }).sort({ 'period.periodIdentifier': 1, slotNumber: 1 });
    console.log(`Total slots: ${allSlots.length}`);

    // Group slots by period
    const slotsByPeriod = {};
    allSlots.forEach(slot => {
      const period = slot.period.periodIdentifier;
      if (!slotsByPeriod[period]) {
        slotsByPeriod[period] = [];
      }
      slotsByPeriod[period].push(slot);
    });

    // Delete slots beyond slot 20 for each period
    let deletedCount = 0;
    for (const [period, slots] of Object.entries(slotsByPeriod)) {
      console.log(`\n📅 Period: ${period}`);
      console.log(`   Total slots: ${slots.length}`);

      if (slots.length > 20) {
        const slotsToDelete = slots.filter(s => s.slotNumber > 20);
        console.log(`   Deleting ${slotsToDelete.length} slots (slot numbers > 20)`);

        for (const slot of slotsToDelete) {
          await Slot.findByIdAndDelete(slot._id);
          console.log(`   ✅ Deleted slot ${slot.slotNumber}`);
          deletedCount++;
        }
      } else {
        console.log(`   ✅ All slots are within limit (≤ 20)`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} extra slots`);
    console.log(`\n📊 Final slot count by period:`);

    // Show final counts
    const finalSlots = await Slot.find({ project: project._id }).sort({ 'period.periodIdentifier': 1, slotNumber: 1 });
    const finalByPeriod = {};
    finalSlots.forEach(slot => {
      const period = slot.period.periodIdentifier;
      if (!finalByPeriod[period]) {
        finalByPeriod[period] = 0;
      }
      finalByPeriod[period]++;
    });

    Object.entries(finalByPeriod).forEach(([period, count]) => {
      console.log(`   ${period}: ${count} slots`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing Amit Santra slots:', error);
    process.exit(1);
  }
};

fixAmitSantraSlots();
