import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/userModel.js';
import Attendance from '../src/models/attendanceModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkHoDAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all HoDs
    const hods = await User.find({ role: 'hod' }).select('name email isHeadOfDepartment');
    
    console.log('👥 Head of Departments (HoDs):');
    console.log('='.repeat(60));
    
    if (hods.length === 0) {
      console.log('⚠️  No HoDs found in the system\n');
    } else {
      console.log(`Found ${hods.length} HoD(s):\n`);
      
      for (const hod of hods) {
        console.log(`📌 ${hod.name}`);
        console.log(`   Email: ${hod.email}`);
        console.log(`   Is HoD: ${hod.isHeadOfDepartment ? '✅ Yes' : '❌ No'}`);
        
        // Check today's attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayAttendance = await Attendance.findOne({
          employee: hod._id,
          date: {
            $gte: today,
            $lt: tomorrow
          }
        });
        
        if (todayAttendance) {
          const clockInTime = new Date(todayAttendance.clockIn);
          const timeString = clockInTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          console.log(`   Today's Attendance: ✅ Clocked in at ${timeString}`);
          console.log(`   Status: ${todayAttendance.status}`);
        } else {
          console.log(`   Today's Attendance: ❌ Not clocked in yet`);
        }
        console.log('');
      }
    }
    
    // Check all employees (including HoDs)
    console.log('='.repeat(60));
    console.log('📊 All Employees (including HoDs):');
    console.log('='.repeat(60));
    
    const allEmployees = await User.find({ 
      role: { $in: ['employee', 'hod'] } 
    }).select('name email role');
    
    console.log(`\nTotal: ${allEmployees.length} employees`);
    console.log(`  - Regular Employees: ${allEmployees.filter(e => e.role === 'employee').length}`);
    console.log(`  - HoDs: ${allEmployees.filter(e => e.role === 'hod').length}`);
    
    console.log('\n✅ HoDs are now included in employee lists for attendance tracking!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

checkHoDAttendance();
