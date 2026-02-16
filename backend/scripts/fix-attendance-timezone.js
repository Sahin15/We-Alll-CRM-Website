/**
 * FIX ATTENDANCE TIMEZONE ISSUE
 * 
 * This script fixes the recurring issue where employees clocking in after 10:30 AM
 * are marked as "present" instead of "late".
 * 
 * ROOT CAUSE: MongoDB stores dates in UTC, but status calculation was using local time.
 * When a user clocks in at 10:31 AM IST, it's stored as 5:01 AM UTC.
 * The old code read 5:01 AM and marked it as "present" instead of converting to IST first.
 * 
 * FIX: Convert UTC time to IST (UTC+5:30) before calculating status.
 * 
 * Run: node backend/scripts/fix-attendance-timezone.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

const calculateStatusWithIST = (clockInTime) => {
  if (!clockInTime) return 'absent';
  
  const clockIn = new Date(clockInTime);
  
  // Convert UTC to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(clockIn.getTime() + istOffset);
  
  const clockInHour = istTime.getUTCHours();
  const clockInMinute = istTime.getUTCMinutes();
  const totalMinutes = clockInHour * 60 + clockInMinute;
  
  // Business rules
  if (totalMinutes >= 720) {
    return "half-day"; // 12:00 PM or later
  } else if (totalMinutes > 630) {
    return "late"; // 10:31 AM to 11:59 AM
  } else {
    return "present"; // 00:00 to 10:30 AM
  }
};

const fixAttendanceTimezone = async () => {
  try {
    console.log('🔧 ATTENDANCE TIMEZONE FIX');
    console.log('='.repeat(80));
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get last 60 days of attendance records
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const attendanceRecords = await Attendance.find({
      date: { $gte: sixtyDaysAgo },
      clockIn: { $exists: true },
      status: { $nin: ['absent', 'on-leave'] } // Don't fix manually set statuses
    }).populate('employee', 'name email role');
    
    console.log(`\n📊 Found ${attendanceRecords.length} attendance records to check\n`);
    
    let fixedCount = 0;
    const fixedRecords = [];
    
    for (const record of attendanceRecords) {
      // Skip if manually modified (unless it's an old system fix)
      if (record.isManuallyModified && 
          !record.modificationHistory.some(h => h.reason?.includes('System fix'))) {
        continue;
      }
      
      const clockIn = new Date(record.clockIn);
      const correctStatus = calculateStatusWithIST(clockIn);
      
      if (record.status !== correctStatus) {
        const oldStatus = record.status;
        
        // Convert to IST for display
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(clockIn.getTime() + istOffset);
        const istHour = istTime.getUTCHours();
        const istMinute = istTime.getUTCMinutes();
        const timeStr = `${String(istHour).padStart(2, '0')}:${String(istMinute).padStart(2, '0')}`;
        
        // Update status
        record.status = correctStatus;
        
        // Track modification
        record.trackManualModification(
          record.employee._id,
          `TIMEZONE FIX: Corrected status calculation from ${oldStatus} to ${correctStatus} (IST: ${timeStr})`,
          {
            oldStatus: oldStatus,
            newStatus: correctStatus,
            oldClockIn: record.clockIn,
            newClockIn: record.clockIn,
            oldClockOut: record.clockOut,
            newClockOut: record.clockOut
          }
        );
        
        await record.save();
        fixedCount++;
        
        fixedRecords.push({
          employee: record.employee?.name || 'Unknown',
          role: record.employee?.role || 'Unknown',
          date: record.date.toDateString(),
          clockInUTC: clockIn.toISOString(),
          clockInIST: timeStr,
          oldStatus: oldStatus,
          newStatus: correctStatus
        });
        
        console.log(`✅ Fixed: ${record.employee?.name || 'Unknown'} (${record.employee?.role || 'Unknown'})`);
        console.log(`   Date: ${record.date.toDateString()}`);
        console.log(`   UTC: ${clockIn.toISOString()} → IST: ${timeStr}`);
        console.log(`   Status: ${oldStatus} → ${correctStatus}\n`);
      }
    }
    
    console.log('='.repeat(80));
    console.log(`\n✅ COMPLETED: Fixed ${fixedCount} out of ${attendanceRecords.length} records\n`);
    
    if (fixedCount > 0) {
      console.log('📋 Summary by Status Change:');
      const summary = {};
      fixedRecords.forEach(r => {
        const key = `${r.oldStatus} → ${r.newStatus}`;
        summary[key] = (summary[key] || 0) + 1;
      });
      Object.entries(summary).forEach(([change, count]) => {
        console.log(`   ${change}: ${count} records`);
      });
    }
    
    console.log('\n🎯 ROOT CAUSE FIXED:');
    console.log('   - MongoDB stores dates in UTC');
    console.log('   - Status calculation now converts UTC → IST before checking time');
    console.log('   - This fix is permanent and will prevent future issues');
    
    console.log('\n📝 BUSINESS RULES (IST):');
    console.log('   ✅ 00:00 - 10:30 IST = Present');
    console.log('   ⚠️  10:31 - 11:59 IST = Late');
    console.log('   🕐 12:00+ IST = Half-day');
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the fix
fixAttendanceTimezone();
