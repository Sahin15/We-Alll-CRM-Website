import mongoose from 'mongoose';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/we-alll-office';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function removeDuplicates() {
  console.log('\n🔍 Checking for duplicate attendance records...');
  
  try {
    // Use aggregation to find duplicates more efficiently
    const pipeline = [
      {
        $group: {
          _id: {
            employee: '$employee',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date'
              }
            }
          },
          records: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ];

    const duplicateGroups = await Attendance.aggregate(pipeline);
    
    console.log(`📊 Found ${duplicateGroups.length} groups with duplicates`);
    
    let totalDuplicatesRemoved = 0;
    
    for (const group of duplicateGroups) {
      const records = group.records;
      console.log(`🔄 Processing ${records.length} duplicates for employee ${group._id.employee} on ${group._id.date}`);
      
      // Sort by createdAt (keep the latest one)
      records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Keep the first (latest) record, remove the rest
      const recordsToRemove = records.slice(1);
      
      for (const record of recordsToRemove) {
        await Attendance.findByIdAndDelete(record._id);
        totalDuplicatesRemoved++;
      }
    }
    
    console.log(`✅ Removed ${totalDuplicatesRemoved} duplicate records`);
    return totalDuplicatesRemoved;
    
  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    return 0;
  }
}

async function recalculateWorkHours() {
  console.log('\n⏰ Recalculating work hours...');
  
  try {
    // Find records that have both clockIn and clockOut but workHours is 0 or null
    const recordsToFix = await Attendance.find({
      clockIn: { $exists: true },
      clockOut: { $exists: true },
      $or: [
        { workHours: { $exists: false } },
        { workHours: 0 },
        { workHours: null }
      ]
    }).populate('employee', 'name');
    
    console.log(`📊 Found ${recordsToFix.length} records to fix`);
    
    let fixedCount = 0;
    
    for (const record of recordsToFix) {
      if (record.clockIn && record.clockOut) {
        const diffTime = Math.abs(record.clockOut - record.clockIn);
        const diffHours = diffTime / (1000 * 60 * 60);
        const workHours = parseFloat(diffHours.toFixed(2));
        
        // Calculate overtime (assuming 8 hours is standard)
        let overtime = 0;
        if (diffHours > 8) {
          overtime = parseFloat((diffHours - 8).toFixed(2));
        }
        
        // Update the record
        record.workHours = workHours;
        record.overtime = overtime;
        await record.save();
        
        console.log(`✅ Fixed: ${record.employee?.name || 'Unknown'} - ${record.date.toDateString()} - ${workHours}h (${overtime}h overtime)`);
        fixedCount++;
      }
    }
    
    console.log(`✅ Recalculated work hours for ${fixedCount} records`);
    return fixedCount;
    
  } catch (error) {
    console.error('❌ Error recalculating work hours:', error);
    return 0;
  }
}

async function fixAttendanceStatuses() {
  console.log('\n📋 Fixing attendance statuses...');
  
  try {
    // Find records that have clockIn but might have wrong status
    const recordsToCheck = await Attendance.find({
      clockIn: { $exists: true },
      status: { $nin: ['absent', 'on-leave'] } // Don't fix manually set statuses
    }).populate('employee', 'name');
    
    console.log(`📊 Found ${recordsToCheck.length} records to check`);
    
    let fixedCount = 0;
    
    for (const record of recordsToCheck) {
      const clockInTime = new Date(record.clockIn);
      const clockInHour = clockInTime.getHours();
      const clockInMinute = clockInTime.getMinutes();
      const totalMinutes = clockInHour * 60 + clockInMinute;
      
      // Calculate correct status
      let correctStatus;
      if (totalMinutes >= 720) {
        // 12:00 PM (720 minutes) or later = Half day
        correctStatus = "half-day";
      } else if (totalMinutes > 630) {
        // 10:31 AM (631 minutes) to 11:59 AM (719 minutes) = Late
        correctStatus = "late";
      } else {
        // 00:00 to 10:30 AM (0-630 minutes) = Present
        correctStatus = "present";
      }
      
      // Check if status needs fixing
      if (record.status !== correctStatus) {
        const oldStatus = record.status;
        record.status = correctStatus;
        await record.save();
        
        const timeStr = `${String(clockInHour).padStart(2, '0')}:${String(clockInMinute).padStart(2, '0')}`;
        console.log(`✅ Fixed: ${record.employee?.name || 'Unknown'} - ${timeStr} - ${oldStatus} → ${correctStatus}`);
        fixedCount++;
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} attendance statuses`);
    return fixedCount;
    
  } catch (error) {
    console.error('❌ Error fixing attendance statuses:', error);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting attendance data fix...');
  
  await connectDB();
  
  const duplicatesRemoved = await removeDuplicates();
  const workHoursFixed = await recalculateWorkHours();
  const statusesFixed = await fixAttendanceStatuses();
  
  console.log('\n📊 Summary:');
  console.log(`   • Duplicates removed: ${duplicatesRemoved}`);
  console.log(`   • Work hours fixed: ${workHoursFixed}`);
  console.log(`   • Statuses fixed: ${statusesFixed}`);
  
  console.log('\n✅ Attendance data fix completed!');
  
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});