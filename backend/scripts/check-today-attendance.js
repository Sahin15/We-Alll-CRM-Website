import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTodayRangeIST } from '../src/utils/timezone.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import('../src/models/attendanceModel.js').then(async ({ default: Attendance }) => {
  const User = (await import('../src/models/userModel.js')).default;
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔍 CHECKING TODAY\'S ATTENDANCE RECORDS');
    console.log('='.repeat(80));
    
    const { start, end } = getTodayRangeIST();
    
    console.log('📅 Today\'s Date Range (IST):');
    console.log(`   Start: ${start.toISOString()} (${start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`   End: ${end.toISOString()} (${end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
    console.log('');
    
    // Find all attendance records for today
    const todayAttendance = await Attendance.find({
      date: {
        $gte: start,
        $lt: end
      }
    }).populate('employee', 'name email').sort({ clockIn: 1 });
    
    console.log(`📊 Found ${todayAttendance.length} attendance record(s) for today\n`);
    
    if (todayAttendance.length === 0) {
      console.log('⚠️  No attendance records found for today!');
      console.log('   This might be why everyone shows as absent.');
    } else {
      console.log('📋 Today\'s Attendance Records:\n');
      
      todayAttendance.forEach((record, index) => {
        const clockInIST = record.clockIn ? new Date(record.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
        const clockOutIST = record.clockOut ? new Date(record.clockOut).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not clocked out';
        
        console.log(`${index + 1}. ${record.employee?.name || 'Unknown'}`);
        console.log(`   Email: ${record.employee?.email || 'N/A'}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Clock-in: ${clockInIST}`);
        console.log(`   Clock-out: ${clockOutIST}`);
        console.log(`   Date (UTC): ${record.date.toISOString()}`);
        console.log(`   Record ID: ${record._id}`);
        console.log('');
      });
      
      // Count by status
      const statusCounts = {
        present: todayAttendance.filter(r => r.status === 'present').length,
        late: todayAttendance.filter(r => r.status === 'late').length,
        'half-day': todayAttendance.filter(r => r.status === 'half-day').length,
        absent: todayAttendance.filter(r => r.status === 'absent').length,
        'on-leave': todayAttendance.filter(r => r.status === 'on-leave').length,
      };
      
      console.log('='.repeat(80));
      console.log('\n📈 Status Summary:');
      console.log(`   Present: ${statusCounts.present}`);
      console.log(`   Late: ${statusCounts.late}`);
      console.log(`   Half-day: ${statusCounts['half-day']}`);
      console.log(`   Absent: ${statusCounts.absent}`);
      console.log(`   On Leave: ${statusCounts['on-leave']}`);
      console.log(`   Total: ${todayAttendance.length}`);
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
