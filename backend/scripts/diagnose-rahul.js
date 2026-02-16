/**
 * Diagnose Rahul Shaw's Attendance Issue
 * Shows exactly what's in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

async function diagnoseRahul() {
  try {
    console.log('🔍 Diagnosing Rahul Shaw\'s Attendance Issue...\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users with "Rahul" in name
    console.log('📋 Searching for Rahul...\n');
    const users = await User.find({ 
      $or: [
        { name: /rahul/i },
        { email: /rahul/i }
      ]
    }).select('name email role');

    if (users.length === 0) {
      console.log('❌ No users found with "Rahul" in name or email\n');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (${u.email}) - ${u.role}`);
    });
    console.log('');

    // Check attendance for each user
    for (const user of users) {
      console.log('═'.repeat(70));
      console.log(`\n👤 User: ${user.name} (${user.email})\n`);

      // Get today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAttendance = await Attendance.findOne({
        employee: user._id,
        date: { $gte: today, $lt: tomorrow }
      });

      if (todayAttendance) {
        console.log('📅 TODAY\'S ATTENDANCE:');
        console.log('─'.repeat(70));
        
        // Get IST time
        const clockInIST = new Date(todayAttendance.clockIn).toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        // Calculate what it should be
        const clockInTime = new Date(todayAttendance.clockIn);
        const istTimeString = clockInTime.toLocaleString('en-US', { 
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        const [hour, minute] = istTimeString.split(':').map(Number);
        const totalMinutes = hour * 60 + minute;
        
        let shouldBe;
        if (totalMinutes >= 720) {
          shouldBe = 'half-day';
        } else if (totalMinutes > 630) {
          shouldBe = 'late';
        } else {
          shouldBe = 'present';
        }

        console.log(`Date: ${todayAttendance.date.toDateString()}`);
        console.log(`Clock In (UTC): ${todayAttendance.clockIn.toISOString()}`);
        console.log(`Clock In (IST): ${clockInIST}`);
        console.log(`Total Minutes: ${totalMinutes}`);
        console.log(`Current Status: ${todayAttendance.status}`);
        console.log(`Should Be: ${shouldBe}`);
        console.log(`Match: ${todayAttendance.status === shouldBe ? '✅ CORRECT' : '❌ WRONG'}`);
        
        if (todayAttendance.clockOut) {
          const clockOutIST = new Date(todayAttendance.clockOut).toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          console.log(`Clock Out (IST): ${clockOutIST}`);
        }
        
        console.log(`Manually Modified: ${todayAttendance.isManuallyModified || false}`);
        console.log(`Work Hours: ${todayAttendance.workHours || 0}`);
        console.log('');

        // If wrong, show how to fix
        if (todayAttendance.status !== shouldBe) {
          console.log('🔧 FIX NEEDED:');
          console.log('─'.repeat(70));
          console.log(`Run this command to fix:`);
          console.log(`\ndb.attendances.updateOne(`);
          console.log(`  { _id: ObjectId("${todayAttendance._id}") },`);
          console.log(`  { $set: { status: "${shouldBe}" } }`);
          console.log(`)\n`);
        }
      } else {
        console.log('❌ No attendance record for today\n');
      }

      // Show recent attendance
      const recentAttendance = await Attendance.find({
        employee: user._id
      })
      .sort({ date: -1 })
      .limit(5);

      if (recentAttendance.length > 0) {
        console.log('📊 RECENT ATTENDANCE (Last 5 days):');
        console.log('─'.repeat(70));
        recentAttendance.forEach(a => {
          const clockInIST = new Date(a.clockIn).toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          console.log(`${a.date.toDateString()}: ${clockInIST} - ${a.status}`);
        });
        console.log('');
      }
    }

    console.log('═'.repeat(70));
    console.log('\n✅ Diagnosis Complete\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

diagnoseRahul();
