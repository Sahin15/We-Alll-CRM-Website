import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fix() {
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
    console.log('   Email:', suman.email);
    
    // Get today's range in IST
    const now = new Date();
    const istDateString = now.toLocaleDateString('en-CA', { 
      timeZone: 'Asia/Kolkata' 
    });
    const todayStart = new Date(istDateString + 'T00:00:00.000+05:30');
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('\n📅 Today (IST):', istDateString);
    console.log('   Range Start:', todayStart.toISOString(), '(', todayStart.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
    console.log('   Range End:', todayEnd.toISOString(), '(', todayEnd.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
    
    // Find ALL records for today (including any stuck ones)
    const todayRecords = await Attendance.find({
      employee: suman._id,
      date: { $gte: todayStart, $lt: todayEnd }
    });
    
    console.log(`\n🔍 Found ${todayRecords.length} record(s) for today`);
    
    if (todayRecords.length === 0) {
      console.log('✅ No records to delete - Suman Das should be able to clock in');
    } else {
      console.log('\n⚠️  Deleting stuck/duplicate records:\n');
      
      for (const record of todayRecords) {
        console.log(`   Deleting record:`);
        console.log(`     ID: ${record._id}`);
        console.log(`     Date: ${record.date.toISOString()}`);
        console.log(`     Clock-in: ${record.clockIn ? record.clockIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}`);
        console.log(`     Status: ${record.status}`);
        
        await Attendance.deleteOne({ _id: record._id });
        console.log(`     ✅ Deleted\n`);
      }
      
      console.log(`✅ Deleted ${todayRecords.length} record(s)`);
    }
    
    // Verify deletion
    const remaining = await Attendance.findOne({
      employee: suman._id,
      date: { $gte: todayStart, $lt: todayEnd }
    });
    
    if (remaining) {
      console.log('\n❌ ERROR: Still found a record after deletion!');
    } else {
      console.log('\n✅ Verified: No records for today - Suman Das can now clock in');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fix();
