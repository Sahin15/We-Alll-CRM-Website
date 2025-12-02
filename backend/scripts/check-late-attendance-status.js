import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkLateAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📅 Checking attendance for:', today.toDateString());
    console.log('='.repeat(60));

    // Get all today's attendance records
    const attendances = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('employee', 'name email')
    .sort({ clockIn: 1 });

    console.log(`\n📊 Total attendance records today: ${attendances.length}\n`);

    if (attendances.length === 0) {
      console.log('❌ No attendance records found for today');
      console.log('💡 Try clocking in first, then run this script again');
      return;
    }

    // Analyze each record
    attendances.forEach((att, index) => {
      const clockInTime = new Date(att.clockIn);
      const hours = clockInTime.getHours();
      const minutes = clockInTime.getMinutes();
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      // Determine what status SHOULD be
      let expectedStatus;
      if (hours >= 12) {
        expectedStatus = 'half-day';
      } else if (hours > 10 || (hours === 10 && minutes > 30)) {
        expectedStatus = 'late';
      } else {
        expectedStatus = 'present';
      }

      const isCorrect = att.status === expectedStatus;
      const statusIcon = isCorrect ? '✅' : '❌';

      console.log(`${index + 1}. ${att.employee.name}`);
      console.log(`   Email: ${att.employee.email}`);
      console.log(`   Clock-in: ${timeString}`);
      console.log(`   ${statusIcon} Saved Status: ${att.status}`);
      console.log(`   Expected Status: ${expectedStatus}`);
      
      if (!isCorrect) {
        console.log(`   ⚠️  MISMATCH! Status should be "${expectedStatus}" but is "${att.status}"`);
      }
      console.log('');
    });

    // Summary
    const statusCounts = {
      present: attendances.filter(a => a.status === 'present').length,
      late: attendances.filter(a => a.status === 'late').length,
      'half-day': attendances.filter(a => a.status === 'half-day').length,
      absent: attendances.filter(a => a.status === 'absent').length
    };

    console.log('='.repeat(60));
    console.log('📈 Status Summary:');
    console.log(`   Present: ${statusCounts.present}`);
    console.log(`   Late: ${statusCounts.late}`);
    console.log(`   Half-day: ${statusCounts['half-day']}`);
    console.log(`   Absent: ${statusCounts.absent}`);

    // Check for issues
    const lateClockIns = attendances.filter(a => {
      const time = new Date(a.clockIn);
      const h = time.getHours();
      const m = time.getMinutes();
      return (h > 10 || (h === 10 && m > 30)) && h < 12;
    });

    const markedAsPresent = lateClockIns.filter(a => a.status === 'present');

    if (markedAsPresent.length > 0) {
      console.log('\n⚠️  PROBLEM FOUND:');
      console.log(`   ${markedAsPresent.length} late clock-ins are marked as "present"`);
      console.log('\n   These should be "late":');
      markedAsPresent.forEach(a => {
        const time = new Date(a.clockIn);
        console.log(`   - ${a.employee.name}: ${time.toLocaleTimeString()}`);
      });
    } else {
      console.log('\n✅ All late clock-ins are correctly marked as "late"');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

checkLateAttendance();
