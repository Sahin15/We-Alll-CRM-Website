import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

// Import models
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

const attendanceSchema = new mongoose.Schema({}, { strict: false });
const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');

async function diagnoseRahulToday() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Rahul Shaw
    const rahul = await User.findOne({ name: /rahul.*shaw/i });
    
    if (!rahul) {
      console.log('❌ Rahul Shaw not found in database');
      return;
    }

    console.log('👤 Found User:');
    console.log(`   Name: ${rahul.name}`);
    console.log(`   Email: ${rahul.email}`);
    console.log(`   ID: ${rahul._id}\n`);

    // Get today's date in IST
    const today = new Date();
    const istDateString = today.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    console.log(`📅 Today's Date (IST): ${istDateString}\n`);

    // Find today's attendance record
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const attendanceRecords = await Attendance.find({
      employee: rahul._id,
      date: { $gte: todayStart, $lte: todayEnd }
    }).sort({ date: -1 });

    console.log(`📊 Found ${attendanceRecords.length} attendance record(s) for today\n`);

    if (attendanceRecords.length === 0) {
      console.log('❌ No attendance record found for today');
      return;
    }

    attendanceRecords.forEach((record, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`RECORD ${index + 1}:`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Record ID: ${record._id}`);
      console.log(`Date (stored): ${record.date}`);
      
      if (record.clockIn) {
        const clockInDate = new Date(record.clockIn);
        const clockInIST = clockInDate.toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        const clockInUTC = clockInDate.toISOString();
        
        console.log(`\n⏰ Clock In:`);
        console.log(`   Stored (UTC): ${clockInUTC}`);
        console.log(`   IST Time: ${clockInIST}`);
        
        // Calculate what status SHOULD be
        const [hour, minute] = clockInIST.split(':').map(Number);
        const totalMinutes = hour * 60 + minute;
        
        let expectedStatus;
        if (totalMinutes > 1140) {
          expectedStatus = 'absent';
        } else if (totalMinutes >= 720) {
          expectedStatus = 'half-day';
        } else if (totalMinutes > 630) {
          expectedStatus = 'late';
        } else {
          expectedStatus = 'present';
        }
        
        console.log(`   Total Minutes: ${totalMinutes}`);
        console.log(`   Expected Status: ${expectedStatus.toUpperCase()}`);
      }
      
      if (record.clockOut) {
        const clockOutDate = new Date(record.clockOut);
        const clockOutIST = clockOutDate.toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        console.log(`\n⏰ Clock Out:`);
        console.log(`   IST Time: ${clockOutIST}`);
      }
      
      console.log(`\n📋 Current Status: ${record.status ? record.status.toUpperCase() : 'NOT SET'}`);
      console.log(`Work Hours: ${record.workHours || 0}`);
      console.log(`Overtime: ${record.overtime || 0}`);
      
      console.log(`\n🔧 Raw Document:`);
      console.log(JSON.stringify(record.toObject(), null, 2));
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('DIAGNOSIS COMPLETE');
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

diagnoseRahulToday();
