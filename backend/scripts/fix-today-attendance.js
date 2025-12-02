import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixTodayAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('🔧 Fixing attendance records for:', today.toDateString());
    console.log('='.repeat(60));

    // Find all attendance records for today
    const records = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('employee', 'name email');

    console.log(`\n📊 Found ${records.length} attendance records today\n`);

    let fixedCount = 0;

    for (const record of records) {
      const clockInTime = new Date(record.clockIn);
      const hours = clockInTime.getHours();
      const minutes = clockInTime.getMinutes();
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      // Determine correct status based on the SAME logic as controller
      let correctStatus;
      if (hours >= 12) {
        correctStatus = 'half-day';
      } else if (hours > 10 || (hours === 10 && minutes > 30)) {
        correctStatus = 'late';
      } else {
        correctStatus = 'present';
      }

      if (correctStatus !== record.status) {
        console.log(`🔧 Fixing: ${record.employee.name}`);
        console.log(`   Clock-in: ${timeString}`);
        console.log(`   Changing: ${record.status} → ${correctStatus}`);
        
        // Update the record
        await Attendance.findByIdAndUpdate(record._id, {
          status: correctStatus
        });
        
        fixedCount++;
        console.log(`   ✅ Fixed!\n`);
      }
    }

    console.log('='.repeat(60));
    if (fixedCount > 0) {
      console.log(`🎉 Fixed ${fixedCount} attendance records`);
      console.log('\n💡 Status rules applied:');
      console.log('   - Before 10:30 AM → "present"');
      console.log('   - After 10:30 AM → "late"');
      console.log('   - After 12:00 PM → "half-day"');
    } else {
      console.log('✅ All attendance records are already correct!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

fixTodayAttendance();
