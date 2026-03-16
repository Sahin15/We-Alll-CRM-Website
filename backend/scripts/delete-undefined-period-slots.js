import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const deleteUndefinedPeriodSlots = async () => {
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

    // Find slots with undefined or missing period
    const undefinedSlots = await Slot.find({
      project: project._id,
      $or: [
        { 'period.periodIdentifier': { $exists: false } },
        { 'period.periodIdentifier': null },
        { 'period.periodIdentifier': 'undefined' }
      ]
    });

    console.log(`Found ${undefinedSlots.length} slots with undefined period`);

    if (undefinedSlots.length > 0) {
      console.log('\nDeleting slots with undefined period:');
      for (const slot of undefinedSlots) {
        console.log(`  ✅ Deleting slot ${slot.slotNumber} (ID: ${slot._id})`);
        await Slot.findByIdAndDelete(slot._id);
      }
    }

    console.log(`\n✅ Successfully deleted ${undefinedSlots.length} slots with undefined period`);

    // Show final counts
    const finalSlots = await Slot.find({ project: project._id }).sort({ 'period.periodIdentifier': 1, slotNumber: 1 });
    console.log(`\n📊 Final total slots: ${finalSlots.length}`);

    const finalByPeriod = {};
    finalSlots.forEach(slot => {
      const period = slot.period.periodIdentifier;
      if (!finalByPeriod[period]) {
        finalByPeriod[period] = 0;
      }
      finalByPeriod[period]++;
    });

    console.log('\nSlots by period:');
    Object.entries(finalByPeriod).forEach(([period, count]) => {
      console.log(`   ${period}: ${count} slots`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting undefined period slots:', error);
    process.exit(1);
  }
};

deleteUndefinedPeriodSlots();
