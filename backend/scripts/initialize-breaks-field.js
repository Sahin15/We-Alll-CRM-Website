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
    console.log('🔄 Connecting to MongoDB...');
    
    // Check if MONGO_URI is loaded
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 Finding attendance records without breaks field...');
    
    // Find all attendance records
    const allRecords = await Attendance.find({});
    console.log(`📊 Total attendance records: ${allRecords.length}`);
    
    // Find records that need initialization
    const recordsToUpdate = await Attendance.find({
      $or: [
        { breaks: { $exists: false } },
        { breaks: null }
      ]
    });
    
    console.log(`📊 Records needing initialization: ${recordsToUpdate.length}`);
    
    if (recordsToUpdate.length === 0) {
      console.log('✅ All records already have breaks field initialized!');
      process.exit(0);
    }
    
    console.log('\n🔄 Initializing breaks field...');
    let updatedCount = 0;
    
    for (const record of recordsToUpdate) {
      record.breaks = [];
      record.totalBreakTime = 0;
      await record.save();
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`   ✓ Processed ${updatedCount}/${recordsToUpdate.length} records...`);
      }
    }
    
    console.log(`\n✅ Successfully initialized breaks field for ${updatedCount} records!`);
    
    // Verify the update
    const verifyRecords = await Attendance.find({
      $or: [
        { breaks: { $exists: false } },
        { breaks: null }
      ]
    });
    
    console.log(`\n📊 Verification: ${verifyRecords.length} records still need initialization`);
    
    if (verifyRecords.length === 0) {
      console.log('✅ All records successfully initialized!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

initializeBreaksField();
