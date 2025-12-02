import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config();

const fixAllLateAttendance = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all attendance records
    const allAttendance = await Attendance.find({}).populate('employee', 'name email');
    
    console.log(`📊 Found ${allAttendance.length} total attendance records\n`);
    
    let fixedCount = 0;
    let alreadyCorrect = 0;
    
    for (const attendance of allAttendance) {
      if (!attendance.clockIn) {
        console.log(`⚠️  Skipping ${attendance.employee?.name || 'Unknown'} - No clock-in time`);
        continue;
      }
      
      const clockInTime = new Date(attendance.clockIn);
      const clockInHour = clockInTime.getHours();
      const clockInMinute = clockInTime.getMinutes();
      
      // Determine correct status based on clock-in time
      let correctStatus;
      if (clockInHour >= 12) {
        correctStatus = "half-day";
      } else if (clockInHour > 10 || (clockInHour === 10 && clockInMinute > 30)) {
        correctStatus = "late";
      } else {
        correctStatus = "present";
      }
      
      // Check if status needs to be updated
      if (attendance.status !== correctStatus) {
        const oldStatus = attendance.status;
        attendance.status = correctStatus;
        await attendance.save();
        
        const timeStr = `${String(clockInHour).padStart(2, '0')}:${String(clockInMinute).padStart(2, '0')}`;
        const dateStr = clockInTime.toLocaleDateString();
        
        console.log(`✅ Fixed: ${attendance.employee?.name || 'Unknown'}`);
        console.log(`   Date: ${dateStr}`);
        console.log(`   Time: ${timeStr}`);
        console.log(`   Changed: ${oldStatus} → ${correctStatus}\n`);
        
        fixedCount++;
      } else {
        alreadyCorrect++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total records checked: ${allAttendance.length}`);
    console.log(`✅ Fixed: ${fixedCount}`);
    console.log(`✓ Already correct: ${alreadyCorrect}`);
    console.log('='.repeat(50));
    
    if (fixedCount > 0) {
      console.log('\n🎉 Attendance records have been corrected!');
      console.log('💡 Refresh your browser to see the changes.');
    } else {
      console.log('\n✓ All attendance records are already correct!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

fixAllLateAttendance();
