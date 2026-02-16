import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the actual Attendance model
import('../src/models/attendanceModel.js').then(async ({ default: Attendance }) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Fixing attendance records for today:', today.toDateString());
    console.log('='.repeat(80));
    
    // Find all attendance records for today
    const attendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    });
    
    console.log(`\n📊 Found ${attendances.length} attendance records\n`);
    
    let fixedCount = 0;
    
    for (const attendance of attendances) {
      const oldStatus = attendance.status;
      const calculatedStatus = attendance.calculateStatus();
      
      if (oldStatus !== calculatedStatus) {
        const clockInTime = new Date(attendance.clockIn);
        const istTime = clockInTime.toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log(`\n🔧 Fixing: Employee ID ${attendance.employee}`);
        console.log(`   Clock-in: ${istTime} IST`);
        console.log(`   Old Status: ${oldStatus}`);
        console.log(`   New Status: ${calculatedStatus}`);
        
        // Update the status
        attendance.status = calculatedStatus;
        await attendance.save();
        
        fixedCount++;
        console.log(`   ✅ Fixed!`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Fixed ${fixedCount} attendance record(s)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
