import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

dotenv.config();

const resetAmitSantraSlots = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find Amit Santra project
    const project = await Project.findOne({ name: 'Amit Santra' });
    if (!project) {
      
      process.exit(1);
    }

    

    // Get all slots for this project
    const allSlots = await Slot.find({ project: project._id }).sort({ 'period.periodIdentifier': 1, slotNumber: 1 });
    

    // Group by period
    const slotsByPeriod = {};
    allSlots.forEach(slot => {
      const period = slot.period?.periodIdentifier || 'undefined';
      if (!slotsByPeriod[period]) {
        slotsByPeriod[period] = [];
      }
      slotsByPeriod[period].push(slot);
    });

    
    Object.entries(slotsByPeriod).forEach(([period, slots]) => {
      .join(', ')})`);
    });

    // Delete ALL slots for this project
    
    const deleteResult = await Slot.deleteMany({ project: project._id });
    

    // Recreate exactly 20 slots for March 2026
    
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
    

    // Recreate exactly 20 slots for April 2026
    
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
    

    // Show final result
    
    const finalSlots = await Slot.find({ project: project._id }).sort({ 'period.periodIdentifier': 1, slotNumber: 1 });
    

    const finalByPeriod = {};
    finalSlots.forEach(slot => {
      const period = slot.period.periodIdentifier;
      if (!finalByPeriod[period]) {
        finalByPeriod[period] = [];
      }
      finalByPeriod[period].push(slot.slotNumber);
    });

    
    Object.entries(finalByPeriod).forEach(([period, slotNumbers]) => {
      })`);
    });

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

resetAmitSantraSlots();
