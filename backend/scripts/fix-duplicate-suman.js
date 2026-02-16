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
    
    console.log('🔧 FIXING DUPLICATE ATTENDANCE FOR SUMAN DAS');
    console.log('='.repeat(80));
    
    // Find Suman Das
    const suman = await User.findOne({ email: 'sumanwealll@gmail.com' });
    
    if (!suman) {
      console.log('❌ Suman Das not found');
      process.exit(1);
    }
    
    console.log(`✅ Found: ${suman.name} (${suman.email})\n`);
    
    // Get Feb 16, 2026 date range in IST
    const feb16Start = new Date('2026-02-16T00:00:00+05:30');
    const feb16End = new Date('2026-02-17T00:00:00+05:30');
    
    // Find all attendance records for Suman on Feb 16
    const records = await Attendance.find({
      employee: suman._id,
      date: {
        $gte: feb16Start,
        $lt: feb16End
      }
    }).sort({ clockIn: 1 });
    
    console.log(`📊 Found ${records.length} attendance record(s)\n`);
    
    if (records.length <= 1) {
      console.log('✅ No duplicates found. Nothing to fix.');
    } else {
      console.log(`⚠️  Found ${records.length} records. Keeping the first, deleting ${records.length - 1} duplicate(s)...\n`);
      
      // Keep the first record (earliest clock-in)
      const keepRecord = records[0];
      const deleteRecords = records.slice(1);
      
      console.log('✅ KEEPING:');
      console.log(`   Record ID: ${keepRecord._id}`);
      console.log(`   Clock In: ${new Date(keepRecord.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}`);
      console.log(`   Status: ${keepRecord.status}\n`);
      
      console.log('🗑️  DELETING:');
      for (const record of deleteRecords) {
        console.log(`   Record ID: ${record._id}`);
        console.log(`   Clock In: ${new Date(record.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}`);
        
        // Delete the duplicate record
        await Attendance.findByIdAndDelete(record._id);
        console.log(`   ✅ Deleted\n`);
      }
      
      console.log('='.repeat(80));
      console.log('\n✅ FIX COMPLETE!');
      console.log(`   Kept 1 record, deleted ${deleteRecords.length} duplicate(s)`);
      console.log('\n   Suman Das now has only 1 attendance record for Feb 16, 2026');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
