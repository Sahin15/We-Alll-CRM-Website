import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config();

const diagnoseAttendance = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's attendance
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employee', 'name email').sort({ clockIn: 1 });

    console.log('📊 TODAY\'S ATTENDANCE RECORDS:');
    console.log('='.repeat(80));
    console.log(`Total records: ${todayAttendance.length}\n`);

    if (todayAttendance.length === 0) {
      console.log('❌ No attendance records found for today');
    } else {
      todayAttendance.forEach((att, index) => {
        const clockInTime = new Date(att.clockIn);
        const hour = clockInTime.getHours();
        const minute = clockInTime.getMinutes();
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        // Calculate what status SHOULD be
        let correctStatus;
        if (hour >= 12) {
          correctStatus = "half-day";
        } else if (hour > 10 || (hour === 10 && minute > 30)) {
          correctStatus = "late";
        } else {
          correctStatus = "present";
        }
        
        const isCorrect = att.status === correctStatus;
        const statusIcon = isCorrect ? '✅' : '❌';
        
        console.log(`${index + 1}. ${att.employee?.name || 'Unknown'}`);
        console.log(`   Clock-in: ${timeStr}`);
        console.log(`   Current Status: ${att.status}`);
        console.log(`   Should Be: ${correctStatus} ${statusIcon}`);
        
        if (!isCorrect) {
          console.log(`   ⚠️  INCORRECT - Needs fixing!`);
        }
        
        console.log('');
      });
    }

    console.log('='.repeat(80));
    console.log('\n🔍 DIAGNOSIS:');
    
    const incorrectRecords = todayAttendance.filter(att => {
      const clockInTime = new Date(att.clockIn);
      const hour = clockInTime.getHours();
      const minute = clockInTime.getMinutes();
      
      let correctStatus;
      if (hour >= 12) {
        correctStatus = "half-day";
      } else if (hour > 10 || (hour === 10 && minute > 30)) {
        correctStatus = "late";
      } else {
        correctStatus = "present";
      }
      
      return att.status !== correctStatus;
    });

    if (incorrectRecords.length > 0) {
      console.log(`❌ Found ${incorrectRecords.length} incorrect record(s)`);
      console.log('💡 Run: node scripts/fix-all-late-attendance.js');
    } else {
      console.log('✅ All records are correct!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected');
    process.exit(0);
  }
};

diagnoseAttendance();
