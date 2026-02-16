import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import timezone utilities
import { getTodayRangeIST, getCurrentISTTime, logTimezoneInfo } from '../src/utils/timezone.js';

// Import models
import('../src/models/attendanceModel.js').then(async ({ default: Attendance }) => {
  const User = mongoose.model('User', new mongoose.Schema({ 
    name: String, 
    email: String,
    role: String 
  }));

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find Suman Das
    const sumanDas = await User.findOne({ 
      email: /sumanwealll@gmail.com/i
    });
    
    if (!sumanDas) {
      console.log('❌ Suman Das not found');
      return;
    }
    
    console.log('👤 User: Suman Das');
    console.log(`   ID: ${sumanDas._id}`);
    console.log(`   Email: ${sumanDas.email}`);
    
    console.log('\n🕐 Current Time Information:');
    console.log('='.repeat(80));
    logTimezoneInfo();
    
    const currentTime = getCurrentISTTime();
    console.log('\n📅 Date Range Being Used for Check:');
    console.log('='.repeat(80));
    
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();
    console.log('Today Start (IST midnight):', todayStart.toISOString());
    console.log('Today Start (IST display):', todayStart.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('Today End (Tomorrow IST midnight):', todayEnd.toISOString());
    console.log('Today End (IST display):', todayEnd.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    console.log('\n🔍 Checking for Existing Attendance:');
    console.log('='.repeat(80));
    console.log('Query:', JSON.stringify({
      employee: sumanDas._id,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      }
    }, null, 2));
    
    // Check if already clocked in today using the SAME query as controller
    const existingAttendance = await Attendance.findOne({
      employee: sumanDas._id,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    });
    
    if (existingAttendance) {
      console.log('\n❌ FOUND EXISTING ATTENDANCE:');
      console.log('   Record ID:', existingAttendance._id);
      console.log('   Date field:', existingAttendance.date.toISOString());
      console.log('   Date (IST):', existingAttendance.date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      console.log('   Clock-in:', existingAttendance.clockIn.toISOString());
      console.log('   Clock-in (IST):', existingAttendance.clockIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      console.log('   Status:', existingAttendance.status);
      
      const clockInTimeStr = new Date(existingAttendance.clockIn).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log('\n📢 Error Message Would Be:');
      console.log(`   "You've already clocked in today at ${clockInTimeStr}"`);
      
      console.log('\n🔍 Why is this record matching?');
      console.log(`   Record date (${existingAttendance.date.toISOString()}) is >= ${todayStart.toISOString()}: ${existingAttendance.date >= todayStart}`);
      console.log(`   Record date (${existingAttendance.date.toISOString()}) is < ${todayEnd.toISOString()}: ${existingAttendance.date < todayEnd}`);
      
    } else {
      console.log('\n✅ NO EXISTING ATTENDANCE FOUND');
      console.log('   Suman Das can clock in now');
    }
    
    // Check ALL attendance records for Suman Das
    console.log('\n📊 ALL Attendance Records for Suman Das:');
    console.log('='.repeat(80));
    
    const allAttendances = await Attendance.find({
      employee: sumanDas._id
    }).sort({ date: -1 }).limit(10);
    
    if (allAttendances.length === 0) {
      console.log('No attendance records found');
    } else {
      allAttendances.forEach((att, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`   Date field: ${att.date.toISOString()}`);
        console.log(`   Date (IST): ${att.date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`   Clock-in: ${att.clockIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`   Status: ${att.status}`);
        console.log(`   Matches today range: ${att.date >= todayStart && att.date < todayEnd}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
