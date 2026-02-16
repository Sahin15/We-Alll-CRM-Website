/**
 * Comprehensive test for attendance status calculation
 * Tests all time ranges and verifies IST timezone handling
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Test cases covering all time ranges
const testCases = [
  { time: '09:00', expected: 'present', description: 'Early morning (9:00 AM)' },
  { time: '10:00', expected: 'present', description: 'On time (10:00 AM)' },
  { time: '10:30', expected: 'present', description: 'Exactly on time (10:30 AM)' },
  { time: '10:31', expected: 'late', description: 'Just late (10:31 AM)' },
  { time: '11:00', expected: 'late', description: 'Late (11:00 AM)' },
  { time: '11:09', expected: 'late', description: 'Rahul\'s time (11:09 AM)' },
  { time: '11:30', expected: 'late', description: 'Late (11:30 AM)' },
  { time: '11:59', expected: 'late', description: 'Last minute late (11:59 AM)' },
  { time: '12:00', expected: 'half-day', description: 'Noon (12:00 PM)' },
  { time: '13:00', expected: 'half-day', description: 'Afternoon (1:00 PM)' },
  { time: '16:00', expected: 'half-day', description: 'Late afternoon (4:00 PM)' },
  { time: '18:59', expected: 'half-day', description: 'Just before cutoff (6:59 PM)' },
  { time: '19:00', expected: 'half-day', description: 'Exactly 7 PM' },
  { time: '19:01', expected: 'absent', description: 'Too late (7:01 PM)' },
  { time: '20:00', expected: 'absent', description: 'Way too late (8:00 PM)' },
];

Promise.all([
  import('../src/models/attendanceModel.js'),
  import('../src/models/userModel.js')
]).then(async ([{ default: Attendance }, { default: User }]) => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    console.log('=' .repeat(70));
    console.log('COMPREHENSIVE ATTENDANCE STATUS CALCULATION TEST');
    console.log('=' .repeat(70));
    console.log('\nBUSINESS RULES (IST):');
    console.log('  00:00 - 10:30 → PRESENT');
    console.log('  10:31 - 11:59 → LATE');
    console.log('  12:00 - 19:00 → HALF-DAY');
    console.log('  After 19:00  → ABSENT (too late)');
    console.log('=' .repeat(70));
    console.log('');

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      // Create a test date with the specified time in IST
      const [hours, minutes] = testCase.time.split(':').map(Number);
      
      // Create date in IST timezone
      const testDate = new Date();
      testDate.setHours(hours, minutes, 0, 0);
      
      // Convert to UTC for storage (MongoDB stores in UTC)
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const utcDate = new Date(testDate.getTime() - istOffset);

      // Create a temporary attendance object
      const tempAttendance = new Attendance({
        employee: new mongoose.Types.ObjectId(),
        date: new Date(),
        clockIn: utcDate,
      });

      // Calculate status
      const calculatedStatus = tempAttendance.calculateStatus();

      // Verify
      const passed_test = calculatedStatus === testCase.expected;
      if (passed_test) {
        passed++;
        console.log(`✅ ${testCase.description.padEnd(35)} ${testCase.time} → ${calculatedStatus.toUpperCase().padEnd(10)} (Expected: ${testCase.expected.toUpperCase()})`);
      } else {
        failed++;
        console.log(`❌ ${testCase.description.padEnd(35)} ${testCase.time} → ${calculatedStatus.toUpperCase().padEnd(10)} (Expected: ${testCase.expected.toUpperCase()})`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`TEST RESULTS: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
    console.log('='.repeat(70));

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Status calculation is working correctly.\n');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED! Please review the logic.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
});
