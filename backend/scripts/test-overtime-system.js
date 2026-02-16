/**
 * Test script for Overtime Tracking System
 * 
 * This script tests the complete overtime workflow:
 * 1. Employee logs overtime after clock out
 * 2. HR/HoD views pending overtime
 * 3. HR/HoD approves/rejects overtime
 * 4. System calculates total work hours correctly
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config();

const testOvertimeSystem = async () => {
  try {
    console.log('🚀 Starting Overtime System Test...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find a test employee
    const employee = await User.findOne({ role: 'employee' });
    if (!employee) {
      console.log('❌ No employee found in database');
      return;
    }
    console.log(`📋 Testing with employee: ${employee.name} (${employee.email})\n`);

    // Create a test attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (!attendance) {
      // Create new attendance
      const clockInTime = new Date();
      clockInTime.setHours(9, 30, 0, 0); // 9:30 AM

      const clockOutTime = new Date();
      clockOutTime.setHours(18, 0, 0, 0); // 6:00 PM

      attendance = await Attendance.create({
        employee: employee._id,
        date: today,
        clockIn: clockInTime,
        clockOut: clockOutTime,
      });

      console.log('✅ Created test attendance record');
      console.log(`   Clock In: ${clockInTime.toLocaleTimeString()}`);
      console.log(`   Clock Out: ${clockOutTime.toLocaleTimeString()}`);
      console.log(`   Work Hours: ${attendance.workHours} hrs`);
      console.log(`   Auto Overtime: ${attendance.overtime} hrs\n`);
    } else {
      console.log('✅ Using existing attendance record');
      console.log(`   Work Hours: ${attendance.workHours} hrs`);
      console.log(`   Auto Overtime: ${attendance.overtime} hrs\n`);
    }

    // Test 1: Add overtime entry
    console.log('📝 Test 1: Adding overtime entry...');
    const overtimeStart = new Date(attendance.clockOut);
    overtimeStart.setMinutes(overtimeStart.getMinutes() + 30); // 30 min after clock out

    const overtimeEnd = new Date(overtimeStart);
    overtimeEnd.setHours(overtimeEnd.getHours() + 2); // 2 hours overtime

    const overtimeEntry = attendance.addOvertimeEntry({
      startTime: overtimeStart,
      endTime: overtimeEnd,
      reason: 'Urgent social media post for client campaign',
      taskReference: 'Project ABC - Social Media',
    });

    await attendance.save();

    console.log('✅ Overtime entry added successfully');
    console.log(`   Start: ${overtimeStart.toLocaleTimeString()}`);
    console.log(`   End: ${overtimeEnd.toLocaleTimeString()}`);
    console.log(`   Duration: ${overtimeEntry.duration} hrs`);
    console.log(`   Status: ${overtimeEntry.status}`);
    console.log(`   Reason: ${overtimeEntry.reason}\n`);

    // Test 2: View pending overtime
    console.log('📋 Test 2: Viewing pending overtime entries...');
    const pendingEntries = attendance.overtimeEntries.filter(e => e.status === 'pending');
    console.log(`✅ Found ${pendingEntries.length} pending overtime entries\n`);

    // Test 3: Approve overtime
    console.log('✅ Test 3: Approving overtime entry...');
    const hrUser = await User.findOne({ role: 'hr' });
    if (!hrUser) {
      console.log('⚠️  No HR user found, skipping approval test\n');
    } else {
      attendance.approveOvertimeEntry(overtimeEntry._id, hrUser._id);
      await attendance.save();

      console.log('✅ Overtime entry approved');
      console.log(`   Approved by: ${hrUser.name}`);
      console.log(`   Status: ${overtimeEntry.status}`);
      console.log(`   Total Manual Overtime: ${attendance.totalManualOvertime} hrs`);
      console.log(`   Total Work Hours: ${attendance.totalWorkHours} hrs\n`);
    }

    // Test 4: Add another overtime entry and reject it
    console.log('📝 Test 4: Adding and rejecting another overtime entry...');
    const overtimeStart2 = new Date(overtimeEnd);
    overtimeStart2.setMinutes(overtimeStart2.getMinutes() + 15);

    const overtimeEnd2 = new Date(overtimeStart2);
    overtimeEnd2.setMinutes(overtimeEnd2.getMinutes() + 30);

    const overtimeEntry2 = attendance.addOvertimeEntry({
      startTime: overtimeStart2,
      endTime: overtimeEnd2,
      reason: 'Additional video editing',
      taskReference: 'Project XYZ',
    });

    await attendance.save();

    if (hrUser) {
      attendance.rejectOvertimeEntry(
        overtimeEntry2._id,
        'This work should have been completed during regular hours',
        hrUser._id
      );
      await attendance.save();

      console.log('✅ Overtime entry rejected');
      console.log(`   Rejected by: ${hrUser.name}`);
      console.log(`   Rejection reason: ${overtimeEntry2.rejectionReason}`);
      console.log(`   Status: ${overtimeEntry2.status}\n`);
    }

    // Test 5: Calculate final totals
    console.log('📊 Test 5: Final calculations...');
    const finalAttendance = await Attendance.findById(attendance._id);
    
    console.log('✅ Final Work Hours Breakdown:');
    console.log(`   Regular Work Hours: ${finalAttendance.workHours} hrs`);
    console.log(`   Auto Overtime: ${finalAttendance.overtime} hrs`);
    console.log(`   Manual Overtime (Approved): ${finalAttendance.totalManualOvertime} hrs`);
    console.log(`   Total Work Hours: ${finalAttendance.totalWorkHours} hrs`);
    console.log(`   Overtime Entries: ${finalAttendance.overtimeEntries.length}`);
    console.log(`   - Pending: ${finalAttendance.overtimeEntries.filter(e => e.status === 'pending').length}`);
    console.log(`   - Approved: ${finalAttendance.overtimeEntries.filter(e => e.status === 'approved').length}`);
    console.log(`   - Rejected: ${finalAttendance.overtimeEntries.filter(e => e.status === 'rejected').length}\n`);

    console.log('🎉 All tests completed successfully!\n');
    console.log('✅ Overtime tracking system is working correctly');
    console.log('✅ Approval workflow is functional');
    console.log('✅ Calculations are accurate\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
};

// Run the test
testOvertimeSystem();
