import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({
      employee: mongoose.Schema.Types.ObjectId,
      date: Date,
      clockIn: Date,
      clockOut: Date,
      status: String
    }));
    
    const User = mongoose.model('User', new mongoose.Schema({ 
      name: String, 
      email: String 
    }));
    
    const suman = await User.findOne({ email: /sumanwealll/i });
    console.log('👤 Suman Das ID:', suman._id.toString());
    
    // Get today's range
    const now = new Date();
    const istDateString = now.toLocaleDateString('en-CA', { 
      timeZone: 'Asia/Kolkata' 
    });
    const todayStart = new Date(istDateString + 'T00:00:00.000+05:30');
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('\n📅 Today (IST):', istDateString);
    console.log('   Current time:', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    // Find all attendance records for Suman Das
    const allRecords = await Attendance.find({ 
      employee: suman._id 
    }).sort({ date: -1 }).limit(10);
    
    console.log(`\n📊 Last 10 attendance records for Suman Das:\n`);
    console.log('='.repeat(80));
    
    const recordsToDelete = [];
    
    for (const record of allRecords) {
      const dateIST = new Date(record.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      const clockInIST = record.clockIn ? new Date(record.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
      
      console.log(`\nRecord:`);
      console.log(`  ID: ${record._id}`);
      console.log(`  Date: ${dateIST}`);
      console.log(`  Clock-in: ${clockInIST}`);
      console.log(`  Status: ${record.status}`);
      
      // Mark for deletion if:
      // 1. Status is "on-leave" (from deleted test leave request)
      // 2. OR it's today's record (so Suman can clock in fresh)
      if (record.status === 'on-leave') {
        console.log(`  ⚠️  MARKED FOR DELETION: on-leave status (from test leave)`);
        recordsToDelete.push(record);
      } else if (record.date >= todayStart && record.date < todayEnd) {
        console.log(`  ⚠️  MARKED FOR DELETION: Today's record (so Suman can clock in fresh)`);
        recordsToDelete.push(record);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📋 Summary: ${recordsToDelete.length} record(s) marked for deletion\n`);
    
    if (recordsToDelete.length === 0) {
      console.log('✅ No records to delete');
    } else {
      if (process.argv.includes('--delete')) {
        console.log('🗑️  Deleting marked records...\n');
        
        for (const record of recordsToDelete) {
          const dateIST = new Date(record.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
          await Attendance.deleteOne({ _id: record._id });
          console.log(`✅ Deleted: ${dateIST} - ${record.status}`);
        }
        
        console.log(`\n✅ Deleted ${recordsToDelete.length} attendance record(s)`);
        console.log('\n✅ Suman Das can now clock in fresh!');
      } else {
        console.log('⚠️  To delete these records, run:');
        console.log('   node backend/scripts/cleanup-suman-attendance.js --delete');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanup();
