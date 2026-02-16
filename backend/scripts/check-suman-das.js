import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

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
      $or: [
        { name: /suman.*das/i },
        { email: /suman.*das/i }
      ]
    });
    
    if (!sumanDas) {
      console.log('❌ Suman Das not found in database');
      console.log('\n🔍 Searching for similar names...');
      const similarUsers = await User.find({ 
        name: /suman/i 
      }).select('name email role');
      
      if (similarUsers.length > 0) {
        console.log('\nFound users with "Suman" in name:');
        similarUsers.forEach(u => {
          console.log(`  - ${u.name} (${u.email}) - Role: ${u.role}`);
        });
      } else {
        console.log('No users found with "Suman" in name');
      }
      
      return;
    }
    
    console.log('👤 Found User:');
    console.log(`   Name: ${sumanDas.name}`);
    console.log(`   Email: ${sumanDas.email}`);
    console.log(`   Role: ${sumanDas.role}`);
    console.log(`   ID: ${sumanDas._id}`);
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('\n📅 Checking attendance for today:', today.toDateString());
    console.log('='.repeat(80));
    
    // Find attendance records for today
    const attendances = await Attendance.find({
      employee: sumanDas._id,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ clockIn: 1 });
    
    if (attendances.length === 0) {
      console.log('\n✅ No attendance record found for today');
      console.log('   Suman Das has NOT clocked in yet today');
    } else {
      console.log(`\n⚠️  Found ${attendances.length} attendance record(s) for today:\n`);
      
      attendances.forEach((att, index) => {
        const clockInTime = new Date(att.clockIn);
        const clockInIST = clockInTime.toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        console.log(`Record ${index + 1}:`);
        console.log(`   Clock-in (UTC): ${clockInTime.toISOString()}`);
        console.log(`   Clock-in (IST): ${clockInIST}`);
        console.log(`   Status: ${att.status}`);
        console.log(`   Clock-out: ${att.clockOut ? new Date(att.clockOut).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not clocked out yet'}`);
        console.log(`   Record ID: ${att._id}`);
        console.log();
      });
      
      console.log('❌ This is why the error occurred - Suman Das already clocked in today');
    }
    
    // Check recent attendance history
    console.log('\n📊 Recent Attendance History (Last 7 days):');
    console.log('-'.repeat(80));
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentAttendances = await Attendance.find({
      employee: sumanDas._id,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 }).limit(10);
    
    if (recentAttendances.length === 0) {
      console.log('No attendance records in the last 7 days');
    } else {
      recentAttendances.forEach(att => {
        const date = new Date(att.date).toLocaleDateString('en-IN');
        const clockIn = new Date(att.clockIn).toLocaleTimeString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: true,
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log(`   ${date} - Clock-in: ${clockIn} - Status: ${att.status}`);
      });
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
