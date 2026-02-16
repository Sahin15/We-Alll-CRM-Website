import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date },
  clockIn: { type: Date },
  clockOut: { type: Date },
  status: { type: String, enum: ["present", "absent", "half-day", "late", "on-leave"] },
  isManuallyModified: { type: Boolean, default: false },
}, { timestamps: true });

// Add the calculateStatus method
attendanceSchema.methods.calculateStatus = function() {
  try {
    if (this.status === 'absent' || this.status === 'on-leave') {
      return this.status;
    }
    
    if (!this.clockIn) {
      return 'absent';
    }
    
    const clockInTime = new Date(this.clockIn);
    
    if (isNaN(clockInTime.getTime())) {
      console.error('[STATUS] Invalid clockIn date:', this.clockIn);
      return 'present';
    }
    
    // Convert to IST time
    const istTimeString = clockInTime.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const [clockInHour, clockInMinute] = istTimeString.split(':').map(Number);
    const totalMinutes = clockInHour * 60 + clockInMinute;
    
    let calculatedStatus;
    
    if (totalMinutes > 1140) {
      calculatedStatus = "absent";
      console.log(`[STATUS] ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST (${totalMinutes} min) > 19:00 → ABSENT`);
    } else if (totalMinutes >= 720) {
      calculatedStatus = "half-day";
      console.log(`[STATUS] ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST (${totalMinutes} min) 12:00-19:00 → HALF-DAY`);
    } else if (totalMinutes > 630) {
      calculatedStatus = "late";
      console.log(`[STATUS] ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST (${totalMinutes} min) 10:31-11:59 → LATE`);
    } else {
      calculatedStatus = "present";
      console.log(`[STATUS] ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST (${totalMinutes} min) 00:00-10:30 → PRESENT`);
    }
    
    return calculatedStatus;
    
  } catch (error) {
    console.error('[STATUS] Error calculating status:', error);
    return 'present';
  }
};

const Attendance = mongoose.model('Attendance', attendanceSchema);
const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String }));

async function testStatusCalculation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Checking attendance records for today:', today.toDateString());
    console.log('='.repeat(80));
    
    // Find all attendance records for today
    const attendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employee', 'name email').sort({ clockIn: 1 });
    
    console.log(`\n📊 Found ${attendances.length} attendance records for today\n`);
    
    if (attendances.length === 0) {
      console.log('⚠️  No attendance records found for today');
      return;
    }
    
    // Test each record
    for (const attendance of attendances) {
      const clockInTime = new Date(attendance.clockIn);
      const istTime = clockInTime.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      console.log('\n' + '-'.repeat(80));
      console.log(`👤 Employee: ${attendance.employee?.name || 'Unknown'}`);
      console.log(`📧 Email: ${attendance.employee?.email || 'N/A'}`);
      console.log(`🕐 Clock-in (UTC): ${clockInTime.toISOString()}`);
      console.log(`🕐 Clock-in (IST): ${istTime}`);
      console.log(`📌 Current Status in DB: ${attendance.status}`);
      
      // Calculate what status SHOULD be
      const calculatedStatus = attendance.calculateStatus();
      console.log(`🔧 Calculated Status: ${calculatedStatus}`);
      
      if (attendance.status !== calculatedStatus) {
        console.log(`❌ MISMATCH! DB shows "${attendance.status}" but should be "${calculatedStatus}"`);
      } else {
        console.log(`✅ Status is correct`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testStatusCalculation();
