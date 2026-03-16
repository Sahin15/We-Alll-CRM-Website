import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const resetAmitSantraSlots = async () => {
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

    // Get all slots for this project
    const allSlots = await Slot.find({ project: project._id }).sort({ 'period.periodIdentifier': 1, slotNumber: 1 });
    console.log(`\n📊 Current total slots: ${allSlots.length}`);

    // Group by period
    const slotsByPeriod = {};
    allSlots.forEach(slot => {
      const period = slot.period?.periodIdentifier || 'undefined';
      if (!slotsByPeriod[period]) {
        slotsByPeriod[period] = [];
      }
      slotsByPeriod[period].push(slot);
    });

    console.log('\nCurrent slots by period:');
    Object.entries(slotsByPeriod).forEach(([period, slots]) => {
      console.log(`   ${period}: ${slots.length} slots (${slots.map(s => s.slotNumber).join(', ')})`);
    });

    // Delete ALL slots for this project
    console.log('\n🗑️  Deleting ALL slots for Amit Santra project...');
    const deleteResult = await Slot.deleteMany({ project: project._id });
    console.log(`✅ Deleted ${deleteResult.deletedCount} slots`);

    // Recreate exactly 20 slots for March 2026
    console.log('\n✨ Creating 20 slots for March 2026...');
    const march2026Slots = [];
    for (let i = 1; i <= 20; i++) {
      march2026Slots.push({
        project: project._id,
        period: {
          year: 2026,
          month: 3,
          periodIdentifier: '2026-03'
        },
        slotNumber: i,
        slotIdentifier: `2026-03-Slot-${String(i).padStart(2, '0')}`,
        slotType: 'work',
        title: `${project.name} - Slot ${i}`,
        description: `Work slot ${i} for ${project.name} (2026-03)`,
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: 'available',
        createdBy: project.projectHead || project.createdBy,
        slotConfiguration: {
          isRequired: true,
          canBeSkipped: false,
          requiresApproval: false,
          estimatedEffort: 8,
          weight: 1.0
        },
        slotMetadata: {
          category: 'other',
          tags: ['monthly-slot']
        }
      });
    }

    const createdMarch = await Slot.insertMany(march2026Slots);
    console.log(`✅ Created ${createdMarch.length} slots for March 2026`);

    // Recreate exactly 20 slots for April 2026
    console.log('\n✨ Creating 20 slots for April 2026...');
    const april2026Slots = [];
    for (let i = 1; i <= 20; i++) {
      april2026Slots.push({
        project: project._id,
        period: {
          year: 2026,
          month: 4,
          periodIdentifier: '2026-04'
        },
        slotNumber: i,
        slotIdentifier: `2026-04-Slot-${String(i).padStart(2, '0')}`,
        slotType: 'work',
        title: `${project.name} - Slot ${i}`,
        description: `Work slot ${i} for ${project.name} (2026-04)`,
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: 'available',
        createdBy: project.projectHead || project.createdBy,
        slotConfiguration: {
          isRequired: true,
          canBeSkipped: false,
          requiresApproval: false,
          estimatedEffort: 8,
          weight: 1.0
        },
        slotMetadata: {
          category: 'other',
          tags: ['monthly-slot']
        }
      });
    }

    const createdApril = await Slot.insertMany(april2026Slots);
    console.log(`✅ Created ${createdApril.length} slots for April 2026`);

    // Show final result
    console.log('\n✅ Reset complete!');
    const finalSlots = await Slot.find({ project: project._id }).sort({ 'period.periodIdentifier': 1, slotNumber: 1 });
    console.log(`\n📊 Final total slots: ${finalSlots.length}`);

    const finalByPeriod = {};
    finalSlots.forEach(slot => {
      const period = slot.period.periodIdentifier;
      if (!finalByPeriod[period]) {
        finalByPeriod[period] = [];
      }
      finalByPeriod[period].push(slot.slotNumber);
    });

    console.log('\nFinal slots by period:');
    Object.entries(finalByPeriod).forEach(([period, slotNumbers]) => {
      console.log(`   ${period}: ${slotNumbers.length} slots (${slotNumbers.join(', ')})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting Amit Santra slots:', error);
    process.exit(1);
  }
};

resetAmitSantraSlots();
