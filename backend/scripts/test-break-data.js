import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

const testBreakData = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📊 Checking today\'s attendance records...\n');

    // Find today's attendance records
    const todayRecords = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      }
    }).populate('employee', 'name email').lean();

    console.log(`Found ${todayRecords.length} attendance records for today\n`);

    if (todayRecords.length === 0) {
      console.log('⚠️  No attendance records found for today');
      console.log('💡 Tip: Clock in first, then test break functionality\n');
      process.exit(0);
    }

    // Display each record
    todayRecords.forEach((record, index) => {
      console.log(`\n📋 Record ${index + 1}:`);
      console.log(`   Employee: ${record.employee?.name || 'Unknown'}`);
      console.log(`   Clock In: ${record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : 'N/A'}`);
      console.log(`   Clock Out: ${record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : 'Not yet'}`);
      console.log(`   Breaks Field Exists: ${record.hasOwnProperty('breaks')}`);
      console.log(`   Breaks: ${JSON.stringify(record.breaks || [])}`);
      console.log(`   Total Break Time: ${record.totalBreakTime || 0} minutes`);
      console.log(`   Status: ${record.status}`);
    });

    // Check if any record has breaks
    const recordsWithBreaks = todayRecords.filter(r => r.breaks && r.breaks.length > 0);
    console.log(`\n\n📊 Summary:`);
    console.log(`   Total Records: ${todayRecords.length}`);
    console.log(`   Records with Breaks: ${recordsWithBreaks.length}`);
    console.log(`   Records without Breaks: ${todayRecords.length - recordsWithBreaks.length}`);

    if (recordsWithBreaks.length === 0) {
      console.log('\n💡 No breaks found. To test:');
      console.log('   1. Clock in');
      console.log('   2. Click "Break" button');
      console.log('   3. Wait a moment');
      console.log('   4. Click "Resume" button');
      console.log('   5. Run this script again');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testBreakData();
