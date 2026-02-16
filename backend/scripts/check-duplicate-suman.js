import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Define User schema
const User = mongoose.model('User', new mongoose.Schema({ 
  name: String, 
  email: String 
}));

// Import the actual Attendance model
import('../src/models/attendanceModel.js').then(async ({ default: Attendance }) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔍 CHECKING SUMAN DAS ATTENDANCE FOR FEBRUARY 16, 2026');
    console.log('='.repeat(80));
    
    // Find Suman Das
    const suman = await User.findOne({ email: 'sumanwealll@gmail.com' });
    
    if (!suman) {
      console.log('❌ Suman Das not found');
      process.exit(1);
    }
    
    console.log(`✅ Found: ${suman.name} (${suman.email})`);
    console.log(`   User ID: ${suman._id}\n`);
    
    // Get Feb 16, 2026 date range in IST
    const feb16Start = new Date('2026-02-16T00:00:00+05:30');
    const feb16End = new Date('2026-02-17T00:00:00+05:30');
    
    console.log('📅 Searching for records on Feb 16, 2026 (IST)');
    console.log(`   Start: ${feb16Start.toISOString()}`);
    console.log(`   End: ${feb16End.toISOString()}\n`);
    
    // Find all attendance records for Suman on Feb 16
    const records = await Attendance.find({
      employee: suman._id,
      date: {
        $gte: feb16Start,
        $lt: feb16End
      }
    }).sort({ clockIn: 1 });
    
    console.log(`📊 Found ${records.length} attendance record(s)\n`);
    
    if (records.length === 0) {
      console.log('✅ No records found for Feb 16, 2026');
    } else if (records.length === 1) {
      const record = records[0];
      const clockInIST = new Date(record.clockIn).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: false 
      });
      const clockOutIST = record.clockOut ? new Date(record.clockOut).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: false 
      }) : 'Not clocked out';
      
      console.log('✅ Single record found (correct):');
      console.log(`   Record ID: ${record._id}`);
      console.log(`   Date: ${new Date(record.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Clock In: ${clockInIST}`);
      console.log(`   Clock Out: ${clockOutIST}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Work Hours: ${record.workHours}`);
    } else {
      console.log(`⚠️  DUPLICATE RECORDS FOUND (${records.length} records):\n`);
      
      records.forEach((record, index) => {
        const clockInIST = new Date(record.clockIn).toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: false 
        });
        const clockOutIST = record.clockOut ? new Date(record.clockOut).toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: false 
        }) : 'Not clocked out';
        
        console.log(`Record #${index + 1}:`);
        console.log(`   Record ID: ${record._id}`);
        console.log(`   Date: ${new Date(record.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`   Clock In: ${clockInIST}`);
        console.log(`   Clock Out: ${clockOutIST}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Work Hours: ${record.workHours}`);
        console.log(`   Created At: ${record.createdAt}`);
        console.log('');
      });
      
      console.log('='.repeat(80));
      console.log('\n🔧 RECOMMENDATION:');
      console.log('   Keep the FIRST record (earliest clock-in)');
      console.log('   Delete the duplicate record(s)');
      console.log('\n   Run: node backend/scripts/fix-duplicate-suman.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
