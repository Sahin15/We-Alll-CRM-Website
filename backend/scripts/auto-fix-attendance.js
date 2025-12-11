#!/usr/bin/env node

/**
 * AUTO-FIX ATTENDANCE STATUS
 * 
 * This script automatically fixes attendance records where the status
 * doesn't match the clock-in time according to business rules.
 * 
 * Business Rules:
 * - Before 10:30 AM → "present"
 * - 10:31 AM to 11:59 AM → "late"  
 * - 12:00 PM or later → "half-day"
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import '../src/models/userModel.js';
import '../src/models/attendanceModel.js';
const Attendance = mongoose.model('Attendance');

const autoFixAttendance = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance records that have clockIn
    const attendanceRecords = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      clockIn: { $exists: true },
      status: { $nin: ['absent', 'on-leave'] } // Don't fix manually set statuses
    }).populate('employee', 'name');

    console.log(`\n🔍 Checking ${attendanceRecords.length} attendance records for today...`);

    let fixedCount = 0;

    for (const record of attendanceRecords) {
      const clockInTime = new Date(record.clockIn);
      const clockInHour = clockInTime.getHours();
      const clockInMinute = clockInTime.getMinutes();
      const totalMinutes = clockInHour * 60 + clockInMinute;

      // Calculate correct status
      let correctStatus;
      if (totalMinutes >= 720) {
        // 12:00 PM (720 minutes) or later = Half day
        correctStatus = "half-day";
      } else if (totalMinutes > 630) {
        // 10:31 AM (631 minutes) to 11:59 AM (719 minutes) = Late
        correctStatus = "late";
      } else {
        // 00:00 to 10:30 AM (0-630 minutes) = Present
        correctStatus = "present";
      }

      // Check if status needs fixing
      if (record.status !== correctStatus) {
        const oldStatus = record.status;
        record.status = correctStatus;
        await record.save();

        const timeStr = `${String(clockInHour).padStart(2, '0')}:${String(clockInMinute).padStart(2, '0')}`;
        console.log(`🔧 Fixed: ${record.employee?.name || 'Unknown'} - ${timeStr} - ${oldStatus} → ${correctStatus}`);
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      console.log(`\n✅ Fixed ${fixedCount} attendance records!`);
    } else {
      console.log(`\n✅ All attendance records are already correct!`);
    }

    console.log('\n📋 Status Rules:');
    console.log('   • Before 10:30 AM → "present"');
    console.log('   • 10:31 AM - 11:59 AM → "late"');
    console.log('   • 12:00 PM or later → "half-day"');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

// Run the fix
autoFixAttendance();