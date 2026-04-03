import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const fixAmitSantraSlots = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find Amit Santra project
    const project = await Project.findOne({ name: 'Amit Santra' });
    if (!project) {
      
      process.exit(1);
    }

    

    // Find all slots for this project
    const allSlots = await Slot.find({ project: project._id }).sort({ 'period.periodIdentifier': 1, slotNumber: 1 });
    

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
      
      

      if (slots.length > 20) {
        const slotsToDelete = slots.filter(s => s.slotNumber > 20);
        `);

        for (const slot of slotsToDelete) {
          await Slot.findByIdAndDelete(slot._id);
          
          deletedCount++;
        }
      } else {
        `);
      }
    }

    
    

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
      
    });

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

fixAmitSantraSlots();
