import express from "express";
import Attendance from "../models/attendanceModel.js";
import User from "../models/userModel.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Simple test route (no auth)
router.get("/test", (req, res) => {
  res.json({ message: "Fix routes are working!", timestamp: new Date() });
});

// Fix attendance status for recent records
router.post("/fix-attendance", protect, authorize("admin", "superadmin", "hr"), async (req, res) => {
  try {
    
    
    // Get attendance records from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const attendanceRecords = await Attendance.find({
      date: { $gte: thirtyDaysAgo },
      clockIn: { $exists: true }
    }).populate('employee', 'name email role');
    
    
    
    let fixedCount = 0;
    const fixedRecords = [];
    
    for (const record of attendanceRecords) {
      const clockInTime = new Date(record.clockIn);
      const clockInHour = clockInTime.getHours();
      const clockInMinute = clockInTime.getMinutes();
      const totalMinutes = clockInHour * 60 + clockInMinute;
      
      let correctStatus;
      if (totalMinutes >= 720) {
        correctStatus = "half-day"; // 12:00 PM or later
      } else if (totalMinutes > 630) {
        correctStatus = "late"; // 10:31 AM to 11:59 AM
      } else {
        correctStatus = "present"; // 00:00 to 10:30 AM
      }
      
      // Only update if status is wrong and not manually set to absent/on-leave
      if (record.status !== correctStatus && !['absent', 'on-leave'].includes(record.status)) {
        const oldStatus = record.status;
        record.status = correctStatus;
        
        // Add to modification history
        record.trackManualModification(
          req.user._id, 
          `System fix: Corrected status calculation from ${oldStatus} to ${correctStatus}`,
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
          employee: record.employee.name,
          email: record.employee.email,
          role: record.employee.role,
          date: record.date.toDateString(),
          clockIn: clockInTime.toLocaleTimeString(),
          oldStatus: oldStatus,
          newStatus: correctStatus
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Fixed ${fixedCount} attendance records`,
      totalChecked: attendanceRecords.length,
      fixedCount: fixedCount,
      fixedRecords: fixedRecords
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error fixing attendance records",
      error: error.message
    });
  }
});

// Check department assignments
router.get("/check-departments", protect, authorize("admin", "superadmin", "hr"), async (req, res) => {
  try {
    
    
    // Get all users with their departments
    const users = await User.find({})
      .populate('department', 'name')
      .select('name email department role status');
    
    // Group users by department
    const departmentGroups = {};
    const usersWithoutDepartment = [];
    
    for (const user of users) {
      if (user.department) {
        const deptName = user.department.name;
        if (!departmentGroups[deptName]) {
          departmentGroups[deptName] = [];
        }
        departmentGroups[deptName].push({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        });
      } else {
        usersWithoutDepartment.push({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        });
      }
    }
    
    // Check for Jit Sarkar specifically
    const jitSarkar = users.find(user => 
      user.name.toLowerCase().includes('jit') && 
      user.name.toLowerCase().includes('sarkar')
    );
    
    res.status(200).json({
      success: true,
      totalUsers: users.length,
      departmentGroups: departmentGroups,
      usersWithoutDepartment: usersWithoutDepartment,
      jitSarkar: jitSarkar ? {
        id: jitSarkar._id,
        name: jitSarkar.name,
        email: jitSarkar.email,
        department: jitSarkar.department ? jitSarkar.department.name : null,
        role: jitSarkar.role,
        status: jitSarkar.status
      } : null
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Error checking department assignments",
      error: error.message
    });
  }
});



export default router;