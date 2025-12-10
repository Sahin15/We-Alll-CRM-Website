import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Attendance from '../src/models/attendanceModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const testClockIn = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test different clock-in times
    const testTimes = [
      { time: '09:30', expected: 'present' },
      { time: '10:30', expected: 'present' },
      { time: '10:31', expected: 'late' },
      { time: '11:00', expected: 'late' },
      { time: '11:59', expected: 'late' },
      { time: '12:00', expected: 'half-day' },
      { time: '14:30', expected: 'half-day' },
    ];

    console.log('🧪 Testing Clock-In Status Calculation\n');
    console.log('═'.repeat(60));

    for (const test of testTimes) {
      const [hours, minutes] = test.time.split(':').map(Number);
      const testDate = new Date();
      testDate.setHours(hours, minutes, 0, 0);

      // Create a test attendance object (not saved to DB)
      const attendance = new Attendance({
        employee: new mongoose.Types.ObjectId(),
        date: new Date(),
        clockIn: testDate,
      });

      // Calculate status
      const calculatedStatus = attendance.calculateStatus();
      const isCorrect = calculatedStatus === test.expected;
      const icon = isCorrect ? '✅' : '❌';

      console.log(`${icon} ${test.time} → ${calculatedStatus.padEnd(10)} (expected: ${test.expected})`);
    }

    console.log('═'.repeat(60));
    console.log('\n✅ Test completed successfully!');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testClockIn();
