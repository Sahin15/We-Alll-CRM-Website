import mongoose from "mongoose";
import dotenv from "dotenv";
import Attendance from "../src/models/attendanceModel.js";
import User from "../src/models/userModel.js";

dotenv.config();

const createTestLateAttendance = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Find an employee user
    const employee = await User.findOne({ role: "employee" });
    
    if (!employee) {
      console.log("✗ No employee found. Please create an employee user first.");
      process.exit(1);
    }

    console.log(`✓ Found employee: ${employee.name} (${employee.email})`);

    // Create test attendance records with different statuses
    const today = new Date();
    const testRecords = [];

    // Test 1: Late entry (11:00 AM)
    const lateDate1 = new Date(today);
    lateDate1.setDate(today.getDate() - 1); // Yesterday
    lateDate1.setHours(0, 0, 0, 0);
    const lateClockIn1 = new Date(lateDate1);
    lateClockIn1.setHours(11, 0, 0, 0);
    const lateClockOut1 = new Date(lateDate1);
    lateClockOut1.setHours(18, 0, 0, 0);

    testRecords.push({
      employee: employee._id,
      date: lateDate1,
      clockIn: lateClockIn1,
      clockOut: lateClockOut1,
      status: "late",
      notes: "Test late entry - 11:00 AM clock-in"
    });

    // Test 2: Another late entry (10:45 AM)
    const lateDate2 = new Date(today);
    lateDate2.setDate(today.getDate() - 2); // 2 days ago
    lateDate2.setHours(0, 0, 0, 0);
    const lateClockIn2 = new Date(lateDate2);
    lateClockIn2.setHours(10, 45, 0, 0);
    const lateClockOut2 = new Date(lateDate2);
    lateClockOut2.setHours(18, 30, 0, 0);

    testRecords.push({
      employee: employee._id,
      date: lateDate2,
      clockIn: lateClockIn2,
      clockOut: lateClockOut2,
      status: "late",
      notes: "Test late entry - 10:45 AM clock-in"
    });

    // Test 3: Half-day entry (1:00 PM)
    const halfDayDate = new Date(today);
    halfDayDate.setDate(today.getDate() - 3); // 3 days ago
    halfDayDate.setHours(0, 0, 0, 0);
    const halfDayClockIn = new Date(halfDayDate);
    halfDayClockIn.setHours(13, 0, 0, 0);
    const halfDayClockOut = new Date(halfDayDate);
    halfDayClockOut.setHours(18, 0, 0, 0);

    testRecords.push({
      employee: employee._id,
      date: halfDayDate,
      clockIn: halfDayClockIn,
      clockOut: halfDayClockOut,
      status: "half-day",
      notes: "Test half-day entry - 1:00 PM clock-in"
    });

    // Test 4: On-time entry (9:00 AM)
    const presentDate = new Date(today);
    presentDate.setDate(today.getDate() - 4); // 4 days ago
    presentDate.setHours(0, 0, 0, 0);
    const presentClockIn = new Date(presentDate);
    presentClockIn.setHours(9, 0, 0, 0);
    const presentClockOut = new Date(presentDate);
    presentClockOut.setHours(18, 0, 0, 0);

    testRecords.push({
      employee: employee._id,
      date: presentDate,
      clockIn: presentClockIn,
      clockOut: presentClockOut,
      status: "present",
      notes: "Test on-time entry - 9:00 AM clock-in"
    });

    // Create the records
    console.log("\nCreating test attendance records...\n");
    
    for (const record of testRecords) {
      try {
        // Check if record already exists
        const existing = await Attendance.findOne({
          employee: record.employee,
          date: record.date
        });

        if (existing) {
          console.log(`⚠ Skipping ${record.status} entry for ${record.date.toDateString()} - already exists`);
          continue;
        }

        const attendance = await Attendance.create(record);
        console.log(`✓ Created ${record.status} entry for ${record.date.toDateString()}`);
        console.log(`  Clock-in: ${record.clockIn.toLocaleTimeString()}`);
        console.log(`  Clock-out: ${record.clockOut.toLocaleTimeString()}`);
        console.log(`  Work hours: ${attendance.workHours} hrs\n`);
      } catch (error) {
        console.log(`✗ Failed to create ${record.status} entry: ${error.message}\n`);
      }
    }

    console.log("✓ Test data creation complete!");
    console.log("\nYou can now:");
    console.log("1. Log in as the employee");
    console.log("2. Go to 'My Attendance' page");
    console.log("3. You should see late, half-day, and present entries");

  } catch (error) {
    console.error("✗ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
  }
};

createTestLateAttendance();
