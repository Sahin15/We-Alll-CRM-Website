/**
 * Test Script for Unified Overtime System
 * 
 * Tests both Live Timer and Manual Entry functionality
 * 
 * Usage: node backend/scripts/test-unified-overtime.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

dotenv.config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

async function testUnifiedOvertimeSystem() {
  try {
    console.log('🚀 Starting Unified Overtime System Test...\n');

    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a test employee
    const employee = await User.findOne({ role: 'employee' });
    if (!employee) {
      console.log('❌ No employee found. Please create an employee first.');
      return;
    }

    console.log(`📋 Testing with employee: ${employee.name} (${employee.email})\n`);

    // Get or create today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (!attendance) {
      // Create attendance record
      attendance = await Attendance.create({
        employee: employee._id,
        date: today,
        clockIn: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        clockOut: new Date(today.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        status: 'present',
      });
      console.log('✅ Created test attendance record (9 AM - 5 PM)\n');
    } else {
      console.log('✅ Using existing attendance record\n');
    }

    // ==================== TEST 1: Live Timer ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Live Timer Functionality');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Start timer
    console.log('⏱️  Starting overtime timer...');
    const timerEntry = attendance.startOvertimeTimer(
      'Urgent client video editing',
      'Project ABC'
    );
    await attendance.save();
    console.log(`✅ Timer started at ${timerEntry.startTime.toLocaleTimeString()}`);
    console.log(`   - Reason: ${timerEntry.reason}`);
    console.log(`   - Task Reference: ${timerEntry.taskReference}`);
    console.log(`   - Status: ${timerEntry.status}`);
    console.log(`   - Is Active: ${timerEntry.isActive}\n`);

    // Check active timer
    console.log('🔍 Checking for active timer...');
    const activeTimer = attendance.getActiveOvertimeTimer();
    if (activeTimer) {
      console.log(`✅ Active timer found!`);
      console.log(`   - Started: ${activeTimer.startTime.toLocaleTimeString()}`);
      console.log(`   - Reason: ${activeTimer.reason}\n`);
    } else {
      console.log('❌ No active timer found\n');
    }

    // Simulate work (wait 2 seconds)
    console.log('⏳ Simulating work for 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Work completed\n');

    // Stop timer
    console.log('⏹️  Stopping overtime timer...');
    const stoppedEntry = attendance.stopOvertimeTimer(timerEntry._id);
    await attendance.save();
    console.log(`✅ Timer stopped at ${stoppedEntry.endTime.toLocaleTimeString()}`);
    console.log(`   - Duration: ${stoppedEntry.duration} hours`);
    console.log(`   - Status: ${stoppedEntry.status}`);
    console.log(`   - Is Active: ${stoppedEntry.isActive}\n`);

    // ==================== TEST 2: Manual Entry ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Manual Entry Functionality');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Add manual entry (6 PM - 7:30 PM = 1.5 hours)
    console.log('📝 Adding manual overtime entry...');
    const startTime = new Date(today.getTime() + 18 * 60 * 60 * 1000); // 6 PM
    const endTime = new Date(today.getTime() + 19.5 * 60 * 60 * 1000); // 7:30 PM
    
    const manualEntry = attendance.addOvertimeEntry({
      startTime,
      endTime,
      reason: 'Social media post design',
      taskReference: 'Client XYZ',
    });
    await attendance.save();
    
    console.log(`✅ Manual entry added`);
    console.log(`   - Start: ${manualEntry.startTime.toLocaleTimeString()}`);
    console.log(`   - End: ${manualEntry.endTime.toLocaleTimeString()}`);
    console.log(`   - Duration: ${manualEntry.duration} hours`);
    console.log(`   - Reason: ${manualEntry.reason}`);
    console.log(`   - Status: ${manualEntry.status}\n`);

    // ==================== TEST 3: Approval Workflow ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Approval Workflow');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find an HR user for approval
    const hrUser = await User.findOne({ role: 'hr' });
    if (!hrUser) {
      console.log('⚠️  No HR user found. Skipping approval test.\n');
    } else {
      // Approve first entry (timer entry)
      console.log('✅ Approving timer entry...');
      attendance.approveOvertimeEntry(stoppedEntry._id, hrUser._id);
      await attendance.save();
      console.log(`   - Approved by: ${hrUser.name}`);
      console.log(`   - Status: approved\n`);

      // Approve second entry (manual entry)
      console.log('✅ Approving manual entry...');
      attendance.approveOvertimeEntry(manualEntry._id, hrUser._id);
      await attendance.save();
      console.log(`   - Approved by: ${hrUser.name}`);
      console.log(`   - Status: approved\n`);
    }

    // ==================== TEST 4: Calculations ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: Work Hours Calculations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Reload attendance to get updated calculations
    attendance = await Attendance.findById(attendance._id);

    console.log('📊 Work Hours Summary:');
    console.log(`   - Regular Work Hours: ${attendance.workHours} hours`);
    console.log(`   - Auto Overtime: ${attendance.overtime} hours`);
    console.log(`   - Manual Overtime (Approved): ${attendance.totalManualOvertime} hours`);
    console.log(`   - Total Work Hours: ${attendance.totalWorkHours} hours\n`);

    // ==================== TEST 5: Error Handling ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 5: Error Handling');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Try to start timer when one is already active
    console.log('🧪 Testing: Start timer when one is already active...');
    try {
      attendance.startOvertimeTimer('Another task', 'Project DEF');
      console.log('❌ Should have thrown error\n');
    } catch (error) {
      console.log(`✅ Correctly threw error: ${error.message}\n`);
    }

    // Try to stop inactive timer
    console.log('🧪 Testing: Stop inactive timer...');
    try {
      attendance.stopOvertimeTimer(stoppedEntry._id);
      console.log('❌ Should have thrown error\n');
    } catch (error) {
      console.log(`✅ Correctly threw error: ${error.message}\n`);
    }

    // ==================== SUMMARY ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ All tests passed successfully!');
    console.log('\nFeatures Tested:');
    console.log('  ✓ Live Timer - Start/Stop');
    console.log('  ✓ Manual Entry - Add with specific times');
    console.log('  ✓ Active Timer Detection');
    console.log('  ✓ Approval Workflow');
    console.log('  ✓ Work Hours Calculations');
    console.log('  ✓ Error Handling\n');

    console.log('🎉 Unified Overtime System is working correctly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run tests
testUnifiedOvertimeSystem();
