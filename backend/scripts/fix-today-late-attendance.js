import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config({ path: './backend/.env' });

const fixTodayLateAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find today's attendance
    const attendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employee', 'name');
    
    console.log(`📊 Checking ${attendance.length} attendance records\n`);
    
    let fixed = 0;
    
    for (const record of attendance) {
      const clockInTime = new Date(record.clockIn);
      const hour = clockInTime.getHours();
      const minute = clockInTime.getMinutes();
      
      let correctStatus;
      if (hour >= 12) {
        correctStatus = 'half-day';
      } else if (hour > 10 || (hour === 10 && minute > 30)) {
        correctStatus = 'late';
      } else {
        correctStatus = 'present';
      }
      
      if (record.status !== correctStatus) {
        console.log(`Fixing: ${record.employee.name}`);
        console.log(`  Clock-in: ${hour}:${String(minute).padStart(2, '0')}`);
        console.log(`  Current: ${record.status} → Correct: ${correctStatus}`);
        
        record.status = correctStatus;
        await record.save();
        fixed++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixed} attendance records`);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixTodayLateAttendance();
