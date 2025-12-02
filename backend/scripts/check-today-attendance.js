import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config({ path: './backend/.env' });

const checkTodayAttendance = async () => {
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
    })
    .populate('employee', 'name')
    .sort({ clockIn: 1 });
    
    console.log(`📊 Today's Attendance (${attendance.length} records)\n`);
    
    attendance.forEach((record, index) => {
      const clockInTime = new Date(record.clockIn);
      const timeStr = clockInTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`${index + 1}. ${record.employee.name}`);
      console.log(`   Clock-in: ${timeStr}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Should be: ${clockInTime.getHours() >= 12 ? 'half-day' : (clockInTime.getHours() > 10 || (clockInTime.getHours() === 10 && clockInTime.getMinutes() > 30)) ? 'late' : 'present'}`);
      console.log('');
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkTodayAttendance();
