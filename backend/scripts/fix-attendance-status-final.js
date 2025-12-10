import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Attendance from '../src/models/attendanceModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixAttendanceStatus = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all attendance records that have a clockIn time
    const attendances = await Attendance.find({ 
      clockIn: { $exists: true },
      status: { $in: ['present', 'late', 'half-day'] } // Don't touch absent or on-leave
    });

    console.log(`\n📊 Found ${attendances.length} attendance records to check\n`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const attendance of attendances) {
      const clockInTime = new Date(attendance.clockIn);
      const clockInHour = clockInTime.getHours();
      const clockInMinute = clockInTime.getMinutes();
      const totalMinutes = clockInHour * 60 + clockInMinute;
      
      let correctStatus;
      
      // SIMPLE BUSINESS RULES:
      // - 00:00 to 10:30 (0-630 minutes) = Present
      // - 10:31 to 11:59 (631-719 minutes) = Late
      // - 12:00 onwards (720+ minutes) = Half-day
      
      if (totalMinutes >= 720) {
        correctStatus = 'half-day';
      } else if (totalMinutes > 630) {
        correctStatus = 'late';
      } else {
        correctStatus = 'present';
      }

      const timeStr = `${String(clockInHour).padStart(2, '0')}:${String(clockInMinute).padStart(2, '0')}`;
      
      if (attendance.status !== correctStatus) {
        console.log(`🔧 Fixing: ${timeStr} (${totalMinutes} min) | ${attendance.status} → ${correctStatus}`);
        attendance.status = correctStatus;
        await attendance.save();
        fixed++;
      } else {
        alreadyCorrect++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} records`);
    console.log(`✓ ${alreadyCorrect} records were already correct`);
    console.log(`📊 Total processed: ${attendances.length}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixAttendanceStatus();
