import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const fixWeallSlots = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the "We Alll" project
    const project = await Project.findOne({ name: /we alll/i });
    if (!project) {
      console.log('We Alll project not found');
      process.exit(1);
    }

    console.log(`Found project: ${project.name} (ID: ${project._id})`);

    // Get current slots
    const currentSlots = await Slot.find({ project: project._id }).sort({ slotNumber: 1 });
    console.log(`Current slots: ${currentSlots.length}`);
    
    if (currentSlots.length > 0) {
      console.log('Current slot numbers:', currentSlots.map(s => s.slotNumber).join(', '));
    }

    // Get current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodIdentifier = `${year}-${String(month).padStart(2, '0')}`;

    // Check if slots exist for current period
    const currentPeriodSlots = await Slot.find({
      project: project._id,
      'period.periodIdentifier': periodIdentifier
    }).sort({ slotNumber: 1 });

    console.log(`\nSlots for current period (${periodIdentifier}): ${currentPeriodSlots.length}`);

    if (currentPeriodSlots.length === 0) {
      console.log('No slots for current period. Creating 20 slots...');
      
      // Delete old slots if any
      await Slot.deleteMany({ project: project._id });
      console.log('Deleted old slots');

      // Create 20 new slots
      const createdSlots = await Slot.createMonthlySlots(project._id, year, month, {
        count: 20,
        createdBy: project.projectHead || project.createdBy
      });

      console.log(`Created ${createdSlots.length} new slots`);
      console.log('New slot numbers:', createdSlots.map(s => s.slotNumber).join(', '));
    } else if (currentPeriodSlots.length !== 20) {
      console.log(`Current period has ${currentPeriodSlots.length} slots, but should have 20`);
      console.log('Fixing slot numbers...');

      // Delete and recreate
      await Slot.deleteMany({ project: project._id, 'period.periodIdentifier': periodIdentifier });
      console.log('Deleted slots for current period');

      // Create 20 new slots
      const createdSlots = await Slot.createMonthlySlots(project._id, year, month, {
        count: 20,
        createdBy: project.projectHead || project.createdBy
      });

      console.log(`Created ${createdSlots.length} new slots`);
      console.log('New slot numbers:', createdSlots.map(s => s.slotNumber).join(', '));
    } else {
      console.log('Slots are correctly configured with 20 slots');
      
      // Verify slot numbers are sequential
      const slotNumbers = currentPeriodSlots.map(s => s.slotNumber);
      const isSequential = slotNumbers.every((num, idx) => num === idx + 1);
      
      if (!isSequential) {
        console.log('Slot numbers are not sequential. Fixing...');
        
        // Delete and recreate
        await Slot.deleteMany({ project: project._id, 'period.periodIdentifier': periodIdentifier });
        console.log('Deleted slots for current period');

        // Create 20 new slots
        const createdSlots = await Slot.createMonthlySlots(project._id, year, month, {
          count: 20,
          createdBy: project.projectHead || project.createdBy
        });

        console.log(`Created ${createdSlots.length} new slots`);
        console.log('New slot numbers:', createdSlots.map(s => s.slotNumber).join(', '));
      }
    }

    console.log('\n✅ We Alll project slots fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing wealll slots:', error);
    process.exit(1);
  }
};

fixWeallSlots();
