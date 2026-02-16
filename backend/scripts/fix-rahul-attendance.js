/**
 * Fix Rahul Shaw's attendance status
 * He logged in at 16:59 but showing as "late" instead of "half-day"
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

async function fixRahulAttendance() {
  try {
    console.log('🔍 Connecting to database...\n');
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
      console.log('❌ Rahul Shaw not found in database');
      console.log('Searching for similar names...\n');
      
      const users = await User.find({ name: /rahul/i }).select('name email role');
      if (users.length > 0) {
        console.log('Found users with "Rahul" in name:');
        users.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));
      }
      return;
    }

    console.log(`✅ Found user: ${rahul.name} (${rahul.email})\n`);

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: rahul._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (!attendance) {
      console.log('❌ No attendance record found for today');
      
      // Check recent attendance
      const recentAttendance = await Attendance.find({
        employee: rahul._id
      })
      .sort({ date: -1 })
      .limit(5)
      .lean();
      
      if (recentAttendance.length > 0) {
        console.log('\nRecent attendance records:');
        recentAttendance.forEach(a => {
          const clockInTime = new Date(a.clockIn);
          console.log(`  - ${a.date.toDateString()}: ${clockInTime.toLocaleTimeString()} - Status: ${a.status}`);
        });
      }
      return;
    }

    console.log('📋 Current Attendance Record:');
    console.log(`   Date: ${attendance.date.toDateString()}`);
    console.log(`   Clock In (UTC): ${attendance.clockIn.toISOString()}`);
    console.log(`   Clock In (Local): ${attendance.clockIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Current Status: ${attendance.status}`);
    console.log(`   Is Manually Modified: ${attendance.isManuallyModified}\n`);

    // Calculate what the status should be
    const clockInTime = new Date(attendance.clockIn);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(clockInTime.getTime() + istOffset);
    const clockInHour = istTime.getUTCHours();
    const clockInMinute = istTime.getUTCMinutes();
    const totalMinutes = clockInHour * 60 + clockInMinute;

    let correctStatus;
    if (totalMinutes >= 720) {
      correctStatus = "half-day";
    } else if (totalMinutes > 630) {
      correctStatus = "late";
    } else {
      correctStatus = "present";
    }

    console.log('🔍 Status Calculation:');
    console.log(`   IST Time: ${clockInHour}:${String(clockInMinute).padStart(2, '0')}`);
    console.log(`   Total Minutes: ${totalMinutes}`);
    console.log(`   Calculated Status: ${correctStatus}`);
    console.log(`   Current Status: ${attendance.status}\n`);

    if (attendance.status === correctStatus) {
      console.log('✅ Status is already correct! No fix needed.\n');
      return;
    }

    // Fix the status
    console.log(`🔧 Fixing status: ${attendance.status} → ${correctStatus}\n`);
    
    const oldStatus = attendance.status;
    attendance.status = correctStatus;
    
    // Track the manual modification
    attendance.trackManualModification(
      rahul._id,
      `Auto-fix: Clock-in at ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST should be ${correctStatus}`,
      {
        oldStatus: oldStatus,
        newStatus: correctStatus,
        oldClockIn: attendance.clockIn,
        newClockIn: attendance.clockIn,
        oldClockOut: attendance.clockOut,
        newClockOut: attendance.clockOut,
      }
    );

    await attendance.save();

    console.log('✅ Status fixed successfully!\n');
    console.log('📋 Updated Attendance Record:');
    console.log(`   Date: ${attendance.date.toDateString()}`);
    console.log(`   Clock In: ${attendance.clockIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Status: ${attendance.status}`);
    console.log(`   Is Manually Modified: ${attendance.isManuallyModified}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the fix
fixRahulAttendance();
