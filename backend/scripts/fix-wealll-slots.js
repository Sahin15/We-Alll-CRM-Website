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
    

    // Find the "We Alll" project
    const project = await Project.findOne({ name: /we alll/i });
    if (!project) {
      
      process.exit(1);
    }

    `);

    // Get current slots
    const currentSlots = await Slot.find({ project: project._id }).sort({ slotNumber: 1 });
    
    
    if (currentSlots.length > 0) {
      .join(', '));
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

    : ${currentPeriodSlots.length}`);

    if (currentPeriodSlots.length === 0) {
      
      
      // Delete old slots if any
      await Slot.deleteMany({ project: project._id });
      

      // Create 20 new slots
      const createdSlots = await Slot.createMonthlySlots(project._id, year, month, {
        count: 20,
        createdBy: project.projectHead || project.createdBy
      });

      
      .join(', '));
    } else if (currentPeriodSlots.length !== 20) {
      
      

      // Delete and recreate
      await Slot.deleteMany({ project: project._id, 'period.periodIdentifier': periodIdentifier });
      

      // Create 20 new slots
      const createdSlots = await Slot.createMonthlySlots(project._id, year, month, {
        count: 20,
        createdBy: project.projectHead || project.createdBy
      });

      
      .join(', '));
    } else {
      
      
      // Verify slot numbers are sequential
      const slotNumbers = currentPeriodSlots.map(s => s.slotNumber);
      const isSequential = slotNumbers.every((num, idx) => num === idx + 1);
      
      if (!isSequential) {
        
        
        // Delete and recreate
        await Slot.deleteMany({ project: project._id, 'period.periodIdentifier': periodIdentifier });
        

        // Create 20 new slots
        const createdSlots = await Slot.createMonthlySlots(project._id, year, month, {
          count: 20,
          createdBy: project.projectHead || project.createdBy
        });

        
        .join(', '));
      }
    }

    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

fixWeallSlots();
