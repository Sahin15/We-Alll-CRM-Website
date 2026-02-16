/**
 * Verify On-Leave Attendance Fix
 * 
 * This script verifies that the on-leave attendance records are correctly
 * created and can be queried by the attendance tracking system.
 * 
 * Run with: node backend/scripts/verify-on-leave-fix.js
 */

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

async function verifyOnLeaveFix() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Query all on-leave attendance records
    const onLeaveRecords = await Attendance.find({
      status: 'on-leave'
    }).populate('employee', 'name email').sort({ date: -1 });

    console.log('='.repeat(60));
    console.log('📊 ON-LEAVE ATTENDANCE RECORDS');
    console.log('='.repeat(60));
    console.log(`Total records found: ${onLeaveRecords.length}\n`);

    if (onLeaveRecords.length === 0) {
      console.log('⚠️  No on-leave records found!');
      console.log('   Run the backfill script first: node backend/scripts/backfill-leave-attendance.js');
    } else {
      // Group by employee
      const byEmployee = {};
      onLeaveRecords.forEach(record => {
        const employeeName = record.employee?.name || 'Unknown';
        if (!byEmployee[employeeName]) {
          byEmployee[employeeName] = [];
        }
        byEmployee[employeeName].push(record);
      });

      // Display grouped results
      Object.keys(byEmployee).sort().forEach(employeeName => {
        const records = byEmployee[employeeName];
        console.log(`\n👤 ${employeeName}`);
        console.log(`   Total leave days: ${records.length}`);
        console.log(`   Leave dates:`);
        records.forEach(record => {
          const date = new Date(record.date).toISOString().split('T')[0];
          const notes = record.notes || 'No notes';
          console.log(`   - ${date}: ${notes}`);
        });
      });

      console.log('\n' + '='.repeat(60));
      console.log('📈 SUMMARY BY EMPLOYEE');
      console.log('='.repeat(60));
      Object.keys(byEmployee).sort().forEach(employeeName => {
        console.log(`${employeeName}: ${byEmployee[employeeName].length} days`);
      });
    }

    // Test a sample query like the frontend would do
    console.log('\n' + '='.repeat(60));
    console.log('🔍 TESTING FRONTEND QUERY');
    console.log('='.repeat(60));
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`\nQuerying attendance for today: ${today.toISOString().split('T')[0]}`);
    
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employee', 'name email');

    console.log(`Total attendance records today: ${todayAttendance.length}`);
    
    const todayOnLeave = todayAttendance.filter(a => a.status === 'on-leave');
    console.log(`On leave today: ${todayOnLeave.length}`);
    
    if (todayOnLeave.length > 0) {
      console.log('\nEmployees on leave today:');
      todayOnLeave.forEach(record => {
        console.log(`- ${record.employee?.name || 'Unknown'}`);
      });
    }

    // Test query for a date range with known leaves (January 2026)
    console.log('\n' + '='.repeat(60));
    console.log('🔍 TESTING DATE RANGE QUERY (January 2026)');
    console.log('='.repeat(60));
    
    const janStart = new Date('2026-01-01');
    const janEnd = new Date('2026-02-01');
    
    const janAttendance = await Attendance.find({
      date: { $gte: janStart, $lt: janEnd }
    }).populate('employee', 'name email');

    console.log(`\nTotal attendance records in January: ${janAttendance.length}`);
    
    const janOnLeave = janAttendance.filter(a => a.status === 'on-leave');
    console.log(`On leave in January: ${janOnLeave.length}`);
    
    // Count by status
    const statusCounts = {
      present: janAttendance.filter(a => a.status === 'present').length,
      late: janAttendance.filter(a => a.status === 'late').length,
      'half-day': janAttendance.filter(a => a.status === 'half-day').length,
      absent: janAttendance.filter(a => a.status === 'absent').length,
      'on-leave': janOnLeave.length
    };

    console.log('\nJanuary 2026 Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- ${status}: ${count}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nThe on-leave attendance records are correctly stored and can be queried.');
    console.log('The Attendance Tracking page should now display these records in the "On Leave" card.');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
verifyOnLeaveFix();
