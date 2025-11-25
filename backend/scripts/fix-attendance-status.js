import mongoose from "mongoose";
import dotenv from "dotenv";
import Attendance from "../src/models/attendanceModel.js";

dotenv.config();

const fixAttendanceStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Get all attendance records
    const attendances = await Attendance.find({});
    console.log(`\nFound ${attendances.length} attendance records to check\n`);

    let updatedCount = 0;
    let correctCount = 0;

    for (const attendance of attendances) {
      const clockInTime = new Date(attendance.clockIn);
      const clockInHour = clockInTime.getHours();
      const clockInMinute = clockInTime.getMinutes();
      
      // Determine correct status based on clock-in time
      let correctStatus = "present";
      
      // After 12:00 PM (noon) = Half day
      if (clockInHour >= 12) {
        correctStatus = "half-day";
      }
      // After 10:30 AM but before 12:00 PM = Late
      else if (clockInHour > 10 || (clockInHour === 10 && clockInMinute > 30)) {
        correctStatus = "late";
      }
      
      // Skip if status is manually set (absent, on-leave)
      if (attendance.status === "absent" || attendance.status === "on-leave") {
        console.log(`⊘ Skipping ${attendance.employee} - ${attendance.date.toDateString()} - Manual status: ${attendance.status}`);
        correctCount++;
        continue;
      }
      
      // Check if status needs updating
      if (attendance.status !== correctStatus) {
        const oldStatus = attendance.status;
        attendance.status = correctStatus;
        await attendance.save();
        
        const timeStr = clockInTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        
        console.log(`✓ Updated: ${attendance.date.toDateString()} - Clock-in: ${timeStr}`);
        console.log(`  Old: ${oldStatus} → New: ${correctStatus}`);
        updatedCount++;
      } else {
        correctCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Summary:");
    console.log("=".repeat(60));
    console.log(`Total records checked: ${attendances.length}`);
    console.log(`Already correct: ${correctCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log("=".repeat(60));
    
    if (updatedCount > 0) {
      console.log("\n✓ Attendance statuses have been corrected!");
      console.log("\nStatus Rules Applied:");
      console.log("  • Before 10:30 AM  → present");
      console.log("  • 10:31 AM - 11:59 AM → late");
      console.log("  • 12:00 PM or later → half-day");
    } else {
      console.log("\n✓ All attendance records already have correct statuses!");
    }

  } catch (error) {
    console.error("✗ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
  }
};

fixAttendanceStatus();
