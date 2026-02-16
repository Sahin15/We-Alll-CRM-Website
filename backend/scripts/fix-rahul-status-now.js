import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

// Import the actual models with all methods
Promise.all([
  import('../src/models/attendanceModel.js'),
  import('../src/models/userModel.js')
]).then(async ([{ default: Attendance }, { default: User }]) => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Rahul's attendance record for today
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const rahul = await User.findOne({ name: /rahul.*shaw/i });
    
    if (!rahul) {
      console.log('❌ Rahul Shaw not found');
      return;
    }

    console.log(`👤 Found: ${rahul.name} (${rahul.email})\n`);

    const attendance = await Attendance.findOne({
      employee: rahul._id,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (!attendance) {
      console.log('❌ No attendance record found for today');
      return;
    }

    console.log('📊 BEFORE FIX:');
    console.log(`   Record ID: ${attendance._id}`);
    console.log(`   Clock In: ${attendance.clockIn}`);
    console.log(`   Clock In (IST): ${new Date(attendance.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Current Status: ${attendance.status}\n`);

    // Calculate what the status SHOULD be
    const calculatedStatus = attendance.calculateStatus();
    console.log(`🔧 Calculated Status: ${calculatedStatus}\n`);

    if (attendance.status !== calculatedStatus) {
      console.log(`⚠️  STATUS MISMATCH DETECTED!`);
      console.log(`   Current: ${attendance.status}`);
      console.log(`   Should be: ${calculatedStatus}\n`);
      
      console.log('🔧 Fixing status...');
      attendance.status = calculatedStatus;
      await attendance.save();
      
      console.log('✅ Status fixed and saved!\n');
      
      // Verify the fix
      const updated = await Attendance.findById(attendance._id);
      console.log('📊 AFTER FIX:');
      console.log(`   Status: ${updated.status}`);
      console.log(`   Clock In (IST): ${new Date(updated.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    } else {
      console.log('✅ Status is already correct!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
});
