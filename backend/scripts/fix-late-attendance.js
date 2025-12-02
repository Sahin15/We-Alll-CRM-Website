import mongoose from "mongoose";
import dotenv from "dotenv";
import Attendance from "../src/models/attendanceModel.js";
import User from "../src/models/userModel.js";

dotenv.config();

const fixLateAttendance = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`📅 Checking attendance for: ${today.toDateString()}`);

    // Find all attendance records for today
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    }).populate("employee", "name email");

    console.log(`📊 Found ${attendanceRecords.length} attendance records for today`);

    let updatedCount = 0;
    let alreadyCorrect = 0;

    for (const record of attendanceRecords) {
      const clockInTime = new Date(record.clockIn);
      const clockInHour = clockInTime.getHours();
      const clockInMinute = clockInTime.getMinutes();

      // Determine correct status
      let correctStatus;
      if (clockInHour >= 12) {
        correctStatus = "half-day";
      } else if (clockInHour > 10 || (clockInHour === 10 && clockInMinute > 30)) {
        correctStatus = "late";
      } else {
        correctStatus = "present";
      }

      const timeStr = `${clockInHour}:${String(clockInMinute).padStart(2, "0")}`;
      const employeeName = record.employee?.name || "Unknown";

      if (record.status !== correctStatus) {
        console.log(
          `🔧 Fixing: ${employeeName} - Clock-in: ${timeStr} - Old: ${record.status} → New: ${correctStatus}`
        );
        record.status = correctStatus;
        await record.save();
        updatedCount++;
      } else {
        console.log(
          `✅ Correct: ${employeeName} - Clock-in: ${timeStr} - Status: ${record.status}`
        );
        alreadyCorrect++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Total records: ${attendanceRecords.length}`);
    console.log(`   ✅ Already correct: ${alreadyCorrect}`);
    console.log(`   🔧 Fixed: ${updatedCount}`);
    console.log("\n✅ Done!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

fixLateAttendance();
