/**
 * FORCE FIX - Update Rahul's status directly in database
 * No questions asked, just fix it
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

async function forceFix() {
  try {
    console.log('🔧 FORCE FIXING Rahul Shaw\'s Attendance...\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📅 Looking for attendance records today...\n');

    // Find ALL attendance records for today
    const allToday = await mongoose.connection.db
      .collection('attendances')
      .find({
        date: { $gte: today, $lt: tomorrow }
      })
      .toArray();

    console.log(`Found ${allToday.length} attendance record(s) for today\n`);

    if (allToday.length === 0) {
      console.log('❌ No attendance records found for today\n');
      return;
    }

    // Get user details for each attendance
    const userIds = allToday.map(a => a.employee);
    const users = await mongoose.connection.db
      .collection('users')
      .find({ _id: { $in: userIds } })
      .toArray();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    console.log('📋 Today\'s Attendance Records:\n');
    console.log('═'.repeat(80));

    let rahulRecord = null;
    let rahulUser = null;

    allToday.forEach((attendance, index) => {
      const user = userMap[attendance.employee.toString()];
      const clockInIST = new Date(attendance.clockIn).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // Calculate what status should be
      const clockInTime = new Date(attendance.clockIn);
      const istTimeString = clockInTime.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const [hour, minute] = istTimeString.split(':').map(Number);
      const totalMinutes = hour * 60 + minute;
      
      let shouldBe;
      if (totalMinutes >= 720) {
        shouldBe = 'half-day';
      } else if (totalMinutes > 630) {
        shouldBe = 'late';
      } else {
        shouldBe = 'present';
      }

      const isWrong = attendance.status !== shouldBe;
      const isRahul = user && user.name.toLowerCase().includes('rahul');

      console.log(`\n${index + 1}. ${user ? user.name : 'Unknown'} (${user ? user.email : 'N/A'})`);
      console.log(`   Clock In: ${clockInIST} IST (${totalMinutes} min)`);
      console.log(`   Current Status: ${attendance.status}`);
      console.log(`   Should Be: ${shouldBe}`);
      console.log(`   ${isWrong ? '❌ WRONG - NEEDS FIX' : '✅ CORRECT'}`);

      if (isRahul && isWrong) {
        rahulRecord = attendance;
        rahulUser = user;
      }
    });

    console.log('\n' + '═'.repeat(80));

    if (!rahulRecord) {
      console.log('\n❌ No wrong records found for Rahul Shaw\n');
      
      // Check if Rahul exists at all
      const rahulUser = await mongoose.connection.db
        .collection('users')
        .findOne({ name: /rahul.*shaw/i });
      
      if (!rahulUser) {
        console.log('❌ Rahul Shaw not found in database\n');
      } else {
        console.log(`✅ Rahul Shaw exists: ${rahulUser.name} (${rahulUser.email})`);
        console.log('   But no attendance record needs fixing\n');
      }
      return;
    }

    // FIX IT NOW
    console.log(`\n🔧 FIXING: ${rahulUser.name}'s attendance...\n`);

    const result = await mongoose.connection.db
      .collection('attendances')
      .updateOne(
        { _id: rahulRecord._id },
        { 
          $set: { 
            status: 'half-day',
            isManuallyModified: true
          },
          $push: {
            modificationHistory: {
              modifiedBy: rahulRecord.employee,
              modifiedAt: new Date(),
              reason: 'Auto-fix: Clock-in at 16:59 IST should be half-day',
              changes: {
                oldStatus: rahulRecord.status,
                newStatus: 'half-day',
                oldClockIn: rahulRecord.clockIn,
                newClockIn: rahulRecord.clockIn,
                oldClockOut: rahulRecord.clockOut,
                newClockOut: rahulRecord.clockOut
              }
            }
          }
        }
      );

    if (result.modifiedCount > 0) {
      console.log('✅ SUCCESS! Status updated to "half-day"\n');
      console.log('📋 Updated Record:');
      console.log(`   Name: ${rahulUser.name}`);
      console.log(`   Clock In: 16:59 IST`);
      console.log(`   Status: half-day ✅\n`);
      console.log('🎉 DONE! Refresh the page to see the change.\n');
    } else {
      console.log('❌ Update failed - no records modified\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

forceFix();
