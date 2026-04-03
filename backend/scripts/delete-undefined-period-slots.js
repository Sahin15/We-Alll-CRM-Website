import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const deleteUndefinedPeriodSlots = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find Amit Santra project
    const project = await Project.findOne({ name: 'Amit Santra' });
    if (!project) {
      
      process.exit(1);
    }

    

    // Find slots with undefined or missing period
    const undefinedSlots = await Slot.find({
      project: project._id,
      $or: [
        { 'period.periodIdentifier': { $exists: false } },
        { 'period.periodIdentifier': null },
        { 'period.periodIdentifier': 'undefined' }
      ]
    });

    

    if (undefinedSlots.length > 0) {
      
      for (const slot of undefinedSlots) {
        `);
        await Slot.findByIdAndDelete(slot._id);
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

deleteUndefinedPeriodSlots();
