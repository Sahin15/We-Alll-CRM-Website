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
    

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find Rahul Shaw
    const rahul = await User.findOne({ 
      $or: [
        { name: /Rahul.*Shaw/i },
        { email: /rahul/i }
      ]
    });

    if (!rahul) {
      
      process.exit(1);
    }

    `);
    

    // Get today's date range (IST)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    }\n`);

    // Find approved leave for today
    const approvedLeave = await LeaveRequest.findOne({
      employee: rahul._id,
      status: "approved",
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart },
    });

    if (!approvedLeave) {
      
      process.exit(0);
    }

    
    
    } to ${approvedLeave.endDate.toLocaleDateString()}`);
    

    // Check if work on leave day request already exists
    let workOnLeaveRequest = await WorkOnLeaveDayRequest.findOne({
      employee: rahul._id,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    });

    if (workOnLeaveRequest) {
      
      
      
      if (workOnLeaveRequest.status === "approved") {
        
        process.exit(0);
      }
    } else {
      // Create work on leave day request
      
      workOnLeaveRequest = await WorkOnLeaveDayRequest.create({
        employee: rahul._id,
        date: todayStart,
        leaveRequest: approvedLeave._id,
        reason: "Emergency work requirement - auto-approved by admin",
        status: "pending",
      });
      
    }

    // Find HR user to approve
    const hrUser = await User.findOne({ role: { $in: ["hr", "admin", "superadmin"] } });
    if (!hrUser) {
      
      process.exit(1);
    }

    \n`);

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
    
    
    if (isSingleDayLeave) {
      // Cancel the entire leave request
      approvedLeave.status = "cancelled";
      await approvedLeave.save();
      workOnLeaveRequest.leaveCancelled = true;
      
    } else {
      // Multi-day leave: adjust the dates
      if (todayStart.getTime() === leaveStartDate.getTime()) {
        // Working on first day - move start date forward
        const newStartDate = new Date(leaveStartDate);
        newStartDate.setDate(newStartDate.getDate() + 1);
        approvedLeave.startDate = newStartDate;
        await approvedLeave.save();
        workOnLeaveRequest.leaveCancelled = true;
        }\n`);
      } else if (todayStart.getTime() === leaveEndDate.getTime()) {
        // Working on last day - move end date backward
        const newEndDate = new Date(leaveEndDate);
        newEndDate.setDate(newEndDate.getDate() - 1);
        approvedLeave.endDate = newEndDate;
        await approvedLeave.save();
        workOnLeaveRequest.leaveCancelled = true;
        }\n`);
      } else {
        // Working on a middle day
        
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
      
       : "Not clocked in"}`);
      
      
      if (attendance.status === "on-leave") {
        // Recalculate status based on clock-in time
        const newStatus = attendance.calculateStatus();
        attendance.status = newStatus;
        await attendance.save();
        
      }
    } else {
      
    }

    
    
    
    
    

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

fixRahulLeaveToday();
