import mongoose from 'mongoose';
import Attendance from '../models/attendanceModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * ATTENDANCE STATUS FIX SCRIPT
 * 
 * This script fixes all existing attendance records to have the correct status
 * based on their clock-in time.
 * 
 * Rules:
 * - Before or at 10:30 AM = Present
 * - After 10:30 AM but before 12:00 PM = Late
 * - At or after 12:00 PM = Half-day
 * - No clockIn = Absent (unless manually set to on-leave)
 */

const calculateCorrectStatus = (clockIn, currentStatus) => {
  // Don't override manually set statuses
  if (currentStatus === 'absent' || currentStatus === 'on-leave') {
    return currentStatus;
  }
  
  if (!clockIn) {
    return 'absent';
  }
  
  const clockInTime = new Date(clockIn);
  const clockInHour = clockInTime.getHours();
  const clockInMinute = clockInTime.getMinutes();
  
  if (clockInHour >= 12) {
    return "half-day";
  } else if (clockInHour > 10 || (clockInHour === 10 && clockInMinute > 30)) {
    return "late";
  } else {
    return "present";
  }
};

const fixAttendanceStatus = async () => {
  try {
    console.log('🔄 Connecting to database...');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables. Please check your .env file.');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    console.log('\n🔍 Finding all attendance records...');
    const allAttendance = await Attendance.find({});
    console.log(`📊 Found ${allAttendance.length} attendance records`);

    let fixedCount = 0;
    let unchangedCount = 0;
    const changes = [];

    console.log('\n🔧 Processing records...\n');

    for (const record of allAttendance) {
      const correctStatus = calculateCorrectStatus(record.clockIn, record.status);
      
      if (record.status !== correctStatus) {
        const clockInTime = record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : 'N/A';
        
        console.log(`📝 Fixing record ${record._id}:`);
        console.log(`   Employee: ${record.employee}`);
        console.log(`   Date: ${new Date(record.date).toLocaleDateString()}`);
        console.log(`   Clock In: ${clockInTime}`);
        console.log(`   Old Status: ${record.status} ❌`);
        console.log(`   New Status: ${correctStatus} ✅\n`);
        
        changes.push({
          id: record._id,
          date: record.date,
          clockIn: clockInTime,
          oldStatus: record.status,
          newStatus: correctStatus
        });
        
        record.status = correctStatus;
        await record.save();
        fixedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Records: ${allAttendance.length}`);
    console.log(`Fixed: ${fixedCount} ✅`);
    console.log(`Unchanged: ${unchangedCount} ⏭️`);
    console.log('='.repeat(60));

    if (changes.length > 0) {
      console.log('\n📋 CHANGES MADE:');
      console.table(changes);
    }

    console.log('\n✅ Migration completed successfully!');
    
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the migration
fixAttendanceStatus();
