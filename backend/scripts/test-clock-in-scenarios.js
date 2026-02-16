import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the actual Attendance model
import('../src/models/attendanceModel.js').then(async ({ default: Attendance }) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🧪 Testing Clock-In Status Calculation');
    console.log('='.repeat(80));
    
    // Test scenarios
    const testScenarios = [
      { time: '09:00', expected: 'present', description: 'Early arrival' },
      { time: '10:00', expected: 'present', description: 'On time' },
      { time: '10:30', expected: 'present', description: 'Exactly 10:30' },
      { time: '10:31', expected: 'late', description: 'One minute late' },
      { time: '10:45', expected: 'late', description: 'Late arrival' },
      { time: '11:59', expected: 'late', description: 'Just before noon' },
      { time: '12:00', expected: 'half-day', description: 'Noon arrival' },
      { time: '14:00', expected: 'half-day', description: 'Afternoon arrival' },
      { time: '18:59', expected: 'half-day', description: 'Just before 7 PM' },
      { time: '19:00', expected: 'half-day', description: 'Exactly 7 PM' },
      { time: '19:01', expected: 'absent', description: 'After 7 PM' },
    ];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const scenario of testScenarios) {
      const [hours, minutes] = scenario.time.split(':').map(Number);
      const clockInTime = new Date(today);
      clockInTime.setHours(hours, minutes, 0, 0);
      
      // Create a test attendance object (not saved to DB)
      const testAttendance = new Attendance({
        employee: new mongoose.Types.ObjectId(),
        date: today,
        clockIn: clockInTime,
      });
      
      const calculatedStatus = testAttendance.calculateStatus();
      const passed = calculatedStatus === scenario.expected;
      
      console.log(`\n${passed ? '✅' : '❌'} ${scenario.time} IST - ${scenario.description}`);
      console.log(`   Expected: ${scenario.expected}`);
      console.log(`   Got: ${calculatedStatus}`);
      
      if (!passed) {
        console.log(`   ⚠️  TEST FAILED!`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
