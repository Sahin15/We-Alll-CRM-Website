import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import Attendance model
import Attendance from '../src/models/attendanceModel.js';

const initializeBreaksField = async () => {
  try {
    
    
    // Check if MONGO_URI is loaded
    if (!process.env.MONGO_URI) {
      
      .filter(k => k.includes('MONGO')));
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    

    
    
    // Find all attendance records
    const allRecords = await Attendance.find({});
    
    
    // Find records that need initialization
    const recordsToUpdate = await Attendance.find({
      $or: [
        { breaks: { $exists: false } },
        { breaks: null }
      ]
    });
    
    
    
    if (recordsToUpdate.length === 0) {
      
      process.exit(0);
    }
    
    
    let updatedCount = 0;
    
    for (const record of recordsToUpdate) {
      record.breaks = [];
      record.totalBreakTime = 0;
      await record.save();
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        
      }
    }
    
    
    
    // Verify the update
    const verifyRecords = await Attendance.find({
      $or: [
        { breaks: { $exists: false } },
        { breaks: null }
      ]
    });
    
    
    
    if (verifyRecords.length === 0) {
      
    }
    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

initializeBreaksField();
