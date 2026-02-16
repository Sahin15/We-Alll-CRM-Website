/**
 * Quick Fix for Rahul Shaw's Attendance
 * Updates his status from "late" to "half-day"
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

async function fixRahulNow() {
  try {
    console.log('🔧 Fixing Rahul Shaw\'s Attendance...\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Rahul Shaw
    const rahul = await User.findOne({ 
      $or: [
        { name: /rahul.*shaw/i },
        { email: /rahul.*shaw/i }
      ]
    });

    if (!rahul) {
      console.log('❌ Rahul Shaw not found');
      console.log('Searching for users with "Rahul" in name...\n');
      
      const users = await User.find({ name: /rahul/i }).select('name email');
      if (users.length > 0) {
        console.log('Found:');
        users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
      }
      return;
    }

    console.log(`✅ Found: ${rahul.name} (${rahul.email})\n`);

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: rahul._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      console.log('❌ No attendance record found for today\n');
      
      // Show recent records
      const recent = await Attendance.find({ employee: rahul._id })
        .sort({ date: -1 })
        .limit(5);
      
      if (recent.length > 0) {
        console.log('Recent attendance:');
        recent.forEach(a => {
          const time = new Date(a.clockIn).toLocaleTimeString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit'
          });
          console.log(`  ${a.date.toDateString()}: ${time} - ${a.status}`);
        });
      }
      return;
    }

    // Show current status
    const clockInIST = new Date(attendance.clockIn).toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    console.log('📋 Current Record:');
    console.log(`   Date: ${attendance.date.toDateString()}`);
    console.log(`   Clock In (IST): ${clockInIST}`);
    console.log(`   Current Status: ${attendance.status}`);
    console.log(`   Should Be: half-day\n`);

    if (attendance.status === 'half-day') {
      console.log('✅ Status is already correct!\n');
      return;
    }

    // Fix the status
    console.log('🔧 Updating status to "half-day"...\n');
    
    attendance.status = 'half-day';
    attendance.isManuallyModified = true;
    attendance.modificationHistory.push({
      modifiedBy: rahul._id,
      modifiedAt: new Date(),
      reason: 'Auto-fix: Clock-in at 16:59 should be half-day',
      changes: {
        oldStatus: 'late',
        newStatus: 'half-day',
        oldClockIn: attendance.clockIn,
        newClockIn: attendance.clockIn,
        oldClockOut: attendance.clockOut,
        newClockOut: attendance.clockOut
      }
    });

    await attendance.save();

    console.log('✅ Status updated successfully!\n');
    console.log('📋 Updated Record:');
    console.log(`   Date: ${attendance.date.toDateString()}`);
    console.log(`   Clock In (IST): ${clockInIST}`);
    console.log(`   Status: ${attendance.status}\n`);
    console.log('🎉 Done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

fixRahulNow();
