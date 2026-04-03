import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';

dotenv.config();

const fixProgressTracking = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Get all projects with slot system enabled
    const projects = await Project.find({ 'slotConfiguration.enableSlotSystem': true });
    

    for (const project of projects) {
      

      // Get current month slots
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentPeriodIdentifier = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      // Count total slots for current month
      const totalSlotsCount = await Slot.countDocuments({
        project: project._id,
        'period.periodIdentifier': currentPeriodIdentifier
      });

      // Count completed slots for current month
      const completedSlotsCount = await Slot.countDocuments({
        project: project._id,
        'period.periodIdentifier': currentPeriodIdentifier,
        'completionStatus.isCompleted': true
      });

      // Calculate progress percentage
      const progressPercentage = totalSlotsCount > 0 
        ? Math.round((completedSlotsCount / totalSlotsCount) * 100)
        : 0;

      
      
      
      `);

      // Update project progress tracking
      project.progressTracking = {
        calculationMethod: 'slot-based',
        completedSlots: completedSlotsCount,
        totalSlots: totalSlotsCount,
        progressPercentage: progressPercentage,
        lastProgressUpdate: new Date(),
        progressHistory: project.progressTracking?.progressHistory || []
      };

      // Update legacy progress field
      project.progress = progressPercentage;

      await project.save();
      
    }

    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

fixProgressTracking();
