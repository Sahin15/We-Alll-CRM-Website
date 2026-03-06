import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from "../src/models/userModel.js";
import LeaveRequest from "../src/models/leaveRequestModel.js";
import WorkOnLeaveDayRequest from "../src/models/workOnLeaveDayRequestModel.js";
import Attendance from "../src/models/attendanceModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const fixRahulLeaveToday = async () => {
  try {
    console.log("🔧 Fixing Rahul Shaw's leave for today...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Rahul Shaw
    const rahul = await User.findOne({ 
      $or: [
        { name: /Rahul.*Shaw/i },
        { email: /rahul/i }
      ]
    });

    if (!rahul) {
      console.log("❌ Rahul Shaw not found");
      process.exit(1);
    }

    console.log(`✅ Found user: ${rahul.name} (${rahul.email})`);
    console.log(`   ID: ${rahul._id}\n`);

    // Get today's date range (IST)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Today: ${todayStart.toLocaleDateString()}\n`);

    // Find approved leave for today
    const approvedLeave = await LeaveRequest.findOne({
      employee: rahul._id,
      status: "approved",
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart },
    });

    if (!approvedLeave) {
      console.log("ℹ️  No approved leave found for today");
      process.exit(0);
    }

    console.log(`✅ Found approved leave:`);
    console.log(`   Type: ${approvedLeave.leaveType}`);
    console.log(`   Period: ${approvedLeave.startDate.toLocaleDateString()} to ${approvedLeave.endDate.toLocaleDateString()}`);
    console.log(`   Days: ${approvedLeave.numberOfDays}\n`);

    // Check if work on leave day request already exists
    let workOnLeaveRequest = await WorkOnLeaveDayRequest.findOne({
      employee: rahul._id,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    });

    if (workOnLeaveRequest) {
      console.log(`ℹ️  Work on leave day request already exists:`);
      console.log(`   Status: ${workOnLeaveRequest.status}`);
      
      if (workOnLeaveRequest.status === "approved") {
        console.log(`   ✅ Already approved - no action needed`);
        process.exit(0);
      }
    } else {
      // Create work on leave day request
      console.log(`📝 Creating work on leave day request...`);
      workOnLeaveRequest = await WorkOnLeaveDayRequest.create({
        employee: rahul._id,
        date: todayStart,
        leaveRequest: approvedLeave._id,
        reason: "Emergency work requirement - auto-approved by admin",
        status: "pending",
      });
      console.log(`   ✅ Request created\n`);
    }

    // Find HR user to approve
    const hrUser = await User.findOne({ role: { $in: ["hr", "admin", "superadmin"] } });
    if (!hrUser) {
      console.log("❌ No HR/Admin user found to approve request");
      process.exit(1);
    }

    console.log(`👤 Approving as: ${hrUser.name} (${hrUser.role})\n`);

    // Approve the request
    workOnLeaveRequest.status = "approved";
    workOnLeaveRequest.reviewedBy = hrUser._id;
    workOnLeaveRequest.reviewedAt = new Date();

    // Check if this is a single-day leave
    const leaveStartDate = new Date(approvedLeave.startDate);
    const leaveEndDate = new Date(approvedLeave.endDate);
    
    leaveStartDate.setHours(0, 0, 0, 0);
    leaveEndDate.setHours(0, 0, 0, 0);
    todayStart.setHours(0, 0, 0, 0);
    
    const isSingleDayLeave = leaveStartDate.getTime() === leaveEndDate.getTime();
    
    console.log(`📋 Leave adjustment:`);
    if (isSingleDayLeave) {
      // Cancel the entire leave request
      approvedLeave.status = "cancelled";
      await approvedLeave.save();
      workOnLeaveRequest.leaveCancelled = true;
      console.log(`   ✅ Single-day leave cancelled\n`);
    } else {
      // Multi-day leave: adjust the dates
      if (todayStart.getTime() === leaveStartDate.getTime()) {
        // Working on first day - move start date forward
        const newStartDate = new Date(leaveStartDate);
        newStartDate.setDate(newStartDate.getDate() + 1);
        approvedLeave.startDate = newStartDate;
        await approvedLeave.save();
        workOnLeaveRequest.leaveCancelled = true;
        console.log(`   ✅ Adjusted leave start date to ${newStartDate.toLocaleDateString()}\n`);
      } else if (todayStart.getTime() === leaveEndDate.getTime()) {
        // Working on last day - move end date backward
        const newEndDate = new Date(leaveEndDate);
        newEndDate.setDate(newEndDate.getDate() - 1);
        approvedLeave.endDate = newEndDate;
        await approvedLeave.save();
        workOnLeaveRequest.leaveCancelled = true;
        console.log(`   ✅ Adjusted leave end date to ${newEndDate.toLocaleDateString()}\n`);
      } else {
        // Working on a middle day
        console.log(`   ⚠️  Working on middle day - manual leave adjustment may be needed\n`);
        workOnLeaveRequest.leaveCancelled = false;
      }
    }

    await workOnLeaveRequest.save();

    // Check if attendance record exists
    const attendance = await Attendance.findOne({
      employee: rahul._id,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    });

    if (attendance) {
      console.log(`📊 Attendance record found:`);
      console.log(`   Clock In: ${attendance.clockIn ? attendance.clockIn.toLocaleTimeString() : "Not clocked in"}`);
      console.log(`   Status: ${attendance.status}`);
      
      if (attendance.status === "on-leave") {
        // Recalculate status based on clock-in time
        const newStatus = attendance.calculateStatus();
        attendance.status = newStatus;
        await attendance.save();
        console.log(`   ✅ Status updated to: ${newStatus}\n`);
      }
    } else {
      console.log(`ℹ️  No attendance record found for today\n`);
    }

    console.log("✅ Successfully fixed Rahul Shaw's leave for today!");
    console.log("\n📋 Summary:");
    console.log(`   - Work on leave day request: APPROVED`);
    console.log(`   - Leave status: ${approvedLeave.status}`);
    console.log(`   - Rahul can now clock in/out normally today`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

fixRahulLeaveToday();
