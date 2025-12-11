#!/usr/bin/env node

/**
 * ATTENDANCE MONITORING SCRIPT
 * 
 * This script monitors attendance records and automatically fixes
 * any incorrect statuses. It can be run as a cron job.
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

const monitorAttendance = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance records
    const attendanceRecords = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      clockIn: { $exists: true },
      status: { $nin: ['absent', 'on-leave'] }
    }).populate('employee', 'name');

    let incorrectCount = 0;
    const incorrectRecords = [];

    for (const record of attendanceRecords) {
      const clockInTime = new Date(record.clockIn);
      const totalMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();

      // Calculate correct status
      let correctStatus;
      if (totalMinutes >= 720) {
        correctStatus = "half-day";
      } else if (totalMinutes > 630) {
        correctStatus = "late";
      } else {
        correctStatus = "present";
      }

      // Check if status is incorrect
      if (record.status !== correctStatus) {
        incorrectCount++;
        incorrectRecords.push({
          employee: record.employee?.name || 'Unknown',
          clockIn: clockInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          currentStatus: record.status,
          correctStatus: correctStatus
        });

        // Auto-fix the record
        record.status = correctStatus;
        await record.save();
      }
    }

    if (incorrectCount > 0) {
      console.log(`🔧 ATTENDANCE MONITOR: Fixed ${incorrectCount} incorrect records:`);
      incorrectRecords.forEach(record => {
        console.log(`   • ${record.employee} (${record.clockIn}): ${record.currentStatus} → ${record.correctStatus}`);
      });
    } else {
      console.log(`✅ ATTENDANCE MONITOR: All ${attendanceRecords.length} records are correct`);
    }

  } catch (error) {
    console.error('❌ ATTENDANCE MONITOR ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the monitor
monitorAttendance();