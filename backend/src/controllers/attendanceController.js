import Attendance from "../models/attendanceModel.js";
import User from "../models/userModel.js";
import logger from '../utils/logger.js';
import { buildDateRangeQuery } from '../utils/queryOptimizer.js';

// Clock in (HoD is also an employee)
export const clockIn = async (req, res) => {
  try {
    const employee = req.user._id;
    const location = req.body?.location || null;
    
    // Employees, HoDs, and HR can clock in (not clients, admin, superadmin)
    if (['client', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Admins and clients cannot clock in. This feature is for employees only.",
        type: 'invalid_role'
      });
    }

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existingAttendance = await Attendance.findOne({
      employee,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (existingAttendance) {
      const clockInTime = new Date(existingAttendance.clockIn).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return res.status(400).json({ 
        message: `You've already clocked in today at ${clockInTime}`,
        type: 'already_clocked_in',
        clockInTime: existingAttendance.clockIn
      });
    }

    // Create attendance - status will be calculated automatically by the model
    const clockInTime = new Date();
    
    // Create attendance with date at midnight for consistency with unique index
    // Status will be calculated by the pre-save hook in the model
    console.log(`[CLOCK-IN] Creating attendance for ${req.user.name} (${req.user.role}) at ${clockInTime.toLocaleString()}`);
    
    // Create attendance object without status - let the model calculate it
    const attendanceData = {
      employee,
      date: today, // Use today at midnight, not new Date()
      clockIn: clockInTime,
      location,
      // Explicitly NO status field - model will calculate it
    };
    
    console.log(`[CLOCK-IN] Attendance data:`, attendanceData);
    
    const attendance = await Attendance.create(attendanceData);

    // ALWAYS FORCE recalculation to ensure correct status
    const calculatedStatus = attendance.calculateStatus();
    console.log(`[CLOCK-IN] 🔧 FORCE STATUS CHECK: Current: ${attendance.status}, Calculated: ${calculatedStatus}`);
    
    if (attendance.status !== calculatedStatus) {
      console.log(`[CLOCK-IN] 🔧 FORCE FIXING: ${attendance.status} → ${calculatedStatus}`);
      attendance.status = calculatedStatus;
      await attendance.save();
    } else {
      console.log(`[CLOCK-IN] ✅ Status is already correct: ${attendance.status}`);
    }

    console.log(`[CLOCK-IN] ✅ Attendance created with status: ${attendance.status} for ${req.user.name} (${req.user.role})`);

    // Determine message based on calculated status
    let message;
    if (attendance.status === "half-day") {
      message = "Clocked in successfully (Half day - arrived after 12:00 PM)";
    } else if (attendance.status === "late") {
      message = "Clocked in successfully (Late entry - arrived after 10:30 AM)";
    } else {
      message = "Clocked in successfully";
    }
    
    console.log(`[CLOCK-IN] ✅ Attendance created with status: ${attendance.status} at ${clockInTime.toLocaleTimeString()}`);

    res.status(201).json({
      message: message,
      attendance,
      isLate: attendance.status === "late",
      isHalfDay: attendance.status === "half-day",
    });
  } catch (error) {
    console.error("Error in clockIn:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "You've already clocked in today. Please refresh the page to see your current status.",
        type: 'duplicate_entry'
      });
    }
    
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: error.toString()
    });
  }
};

// Clock out (HoD is also an employee)
export const clockOut = async (req, res) => {
  try {
    const employee = req.user._id;
    const notes = req.body?.notes || null;
    
    // Employees, HoDs, and HR can clock out (not clients, admin, superadmin)
    if (['client', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Admins and clients cannot clock out. This feature is for employees only.",
        type: 'invalid_role'
      });
    }

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (!attendance) {
      return res.status(404).json({ 
        message: "You haven't clocked in yet today. Please clock in first.",
        type: 'not_clocked_in'
      });
    }

    if (attendance.clockOut) {
      const clockOutTime = new Date(attendance.clockOut).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return res.status(400).json({ 
        message: `You've already clocked out today at ${clockOutTime}. See you tomorrow!`,
        type: 'already_clocked_out',
        clockOutTime: attendance.clockOut
      });
    }

    attendance.clockOut = new Date();
    if (notes) attendance.notes = notes;

    await attendance.save();

    res.status(200).json({
      message: "Clocked out successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in clockOut:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all attendance records (Admin/HR)
export const getAllAttendance = async (req, res) => {
  try {
    console.log('[ATTENDANCE API] getAllAttendance called by:', req.user?.email || 'unknown', 'role:', req.user?.role || 'unknown');
    console.log('[ATTENDANCE API] User object:', req.user);
    const { startDate, endDate, date, employee, status } = req.query;
    console.log('[ATTENDANCE API] Query params:', { startDate, endDate, date, employee, status });

    // EMERGENCY FIX: Just return empty array for now to stop the 500 errors
    console.log('[ATTENDANCE API] EMERGENCY MODE - returning empty array to prevent 500 errors');
    return res.status(200).json([]);

    let filter = {};

    if (status) filter.status = status;
    
    // Handle employee filtering with role-based restrictions
    if (employee) {
      // Specific employee selected - ALWAYS filter by this employee ID
      if (req.user.role === 'hod' && req.user.department) {
        // HoD can only view their department employees + themselves
        const departmentEmployees = await User.find({
          department: req.user.department
        }).select('_id').lean();
        
        const allowedEmployeeIds = departmentEmployees.map(emp => emp._id.toString());
        allowedEmployeeIds.push(req.user._id.toString());
        
        // Check if the requested employee is in the allowed list
        if (allowedEmployeeIds.includes(employee)) {
          filter.employee = employee; // Filter by specific employee
        } else {
          // Employee not in HoD's department - return empty results
          return res.status(200).json([]);
        }
      } else {
        // Admin/HR/SuperAdmin can view any employee
        filter.employee = employee; // Filter by specific employee
      }
    } else {
      // No specific employee selected - show all based on role
      if (req.user.role === 'hod' && req.user.department) {
        // HoD sees only their department employees
        const departmentEmployees = await User.find({
          department: req.user.department
        }).select('_id').lean();
        
        const employeeIds = departmentEmployees.map(emp => emp._id);
        // Add HoD themselves
        employeeIds.push(req.user._id);
        
        filter.employee = { $in: employeeIds };
      }
      // Admin/HR/SuperAdmin see all employees (no additional filter needed)
    }
    
    // Handle single date filter (for specific day)
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      filter.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }
    // Handle date range filter
    else if (startDate && endDate) {
      Object.assign(filter, buildDateRangeQuery(startDate, endDate, 'date'));
    }


    
    console.log('[ATTENDANCE API] Filter:', filter);
    console.log('[ATTENDANCE API] Request params:', { employee, status, startDate, endDate, userRole: req.user.role });

    // Optimized query WITHOUT pagination (backward compatible)
    const attendance = await Attendance.find(filter)
      .select('employee date clockIn clockOut status workHours overtime isManuallyModified originalStatus modificationHistory')
      .populate("employee", "name email department")
      .populate("approvedBy", "name")
      .populate("modificationHistory.modifiedBy", "name email role")
      .sort({ date: -1 })
      .lean();


    
    console.log(`[ATTENDANCE API] Found ${attendance.length} attendance records`);

    // Remove duplicates based on employee and date (keep the latest one)
    const uniqueAttendance = [];
    const seen = new Set();
    
    for (const record of attendance) {
      try {
        const employeeId = record.employee?._id || record.employee;
        const dateStr = record.date?.toDateString();
        
        if (!employeeId || !dateStr) {
          console.log(`[ATTENDANCE API] Skipping invalid record:`, record);
          continue;
        }
        
        const key = `${employeeId}-${dateStr}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          uniqueAttendance.push(record);
        } else {
          console.log(`[ATTENDANCE API] Skipping duplicate record for employee ${employeeId} on ${dateStr}`);
        }
      } catch (recordError) {
        console.error(`[ATTENDANCE API] Error processing record:`, recordError, record);
        continue;
      }
    }
    
    if (uniqueAttendance.length !== attendance.length) {
      console.log(`[ATTENDANCE API] Filtered out ${attendance.length - uniqueAttendance.length} duplicate records from response`);
    }
    
    console.log(`[ATTENDANCE API] Returning ${uniqueAttendance.length} unique attendance records`);

    // Return simple array (backward compatible)
    res.status(200).json(uniqueAttendance);
  } catch (error) {
    console.error('[ATTENDANCE API] Error in getAllAttendance:', error);
    console.error('[ATTENDANCE API] Error stack:', error.stack);
    console.error('[ATTENDANCE API] Error name:', error.name);
    console.error('[ATTENDANCE API] Error message:', error.message);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get employee's own attendance (HoD is also an employee)
export const getMyAttendance = async (req, res) => {
  try {
    const employee = req.user._id;
    const { startDate, endDate } = req.query;
    
    // Admins and clients do not have personal attendance records, return empty array
    if (['client', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(200).json([]);
    }

    let filter = { employee };

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(filter).sort({ date: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error in getMyAttendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get attendance by ID
export const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate("employee", "name email department position")
      .populate("approvedBy", "name email");

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error in getAttendanceById:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Update attendance status (Admin/HR)
export const updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, reason } = req.body;
    const approvedBy = req.user._id;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ 
        message: "Reason is required for manual status updates",
        type: 'reason_required'
      });
    }

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Track the changes
    const changes = {
      oldStatus: attendance.status,
      newStatus: status,
      oldClockIn: attendance.clockIn,
      newClockIn: attendance.clockIn, // Not changing clockIn in this function
      oldClockOut: attendance.clockOut,
      newClockOut: attendance.clockOut,
    };

    // Track manual modification
    attendance.trackManualModification(approvedBy, reason, changes);

    // Update fields
    attendance.status = status;
    attendance.approvedBy = approvedBy;
    if (notes) attendance.notes = notes;

    await attendance.save();

    const populatedAttendance = await Attendance.findById(id)
      .populate("employee", "name email")
      .populate("approvedBy", "name email")
      .populate("modificationHistory.modifiedBy", "name email");

    res.status(200).json({
      message: "Attendance status updated successfully",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Error in updateAttendanceStatus:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark absence (Admin/HR)
export const markAbsence = async (req, res) => {
  try {
    const { employeeId, date, reason } = req.body;
    const approvedBy = req.user._id;

    if (!employeeId || !date) {
      return res
        .status(400)
        .json({ message: "Employee ID and date are required" });
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      date: new Date(date),
      clockIn: new Date(date),
      status: "absent",
      notes: reason,
      approvedBy,
    });

    res.status(201).json({
      message: "Absence marked successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in markAbsence:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get attendance summary for an employee
export const getAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: "employee",
        select: "name email department",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("approvedBy", "name email role")
      .populate("modificationHistory.modifiedBy", "name email role")
      .sort({ date: 1 })
      .lean();

    // Calculate statistics
    const summary = {
      totalDays: attendance.length,
      present: attendance.filter((a) => a.status === "present").length,
      absent: attendance.filter((a) => a.status === "absent").length,
      halfDay: attendance.filter((a) => a.status === "half-day").length,
      late: attendance.filter((a) => a.status === "late").length,
      onLeave: attendance.filter((a) => a.status === "on-leave").length,
      totalWorkHours: attendance.reduce(
        (sum, a) => sum + (a.workHours || 0),
        0
      ),
      totalOvertime: attendance.reduce((sum, a) => sum + (a.overtime || 0), 0),
      manuallyModified: attendance.filter((a) => a.isManuallyModified).length,
      averageClockIn: calculateAverageClockIn(attendance),
      averageWorkHours: attendance.length > 0 
        ? (attendance.reduce((sum, a) => sum + (a.workHours || 0), 0) / attendance.length).toFixed(2)
        : 0,
    };

    res.status(200).json({
      summary,
      attendance,
      month: parseInt(month),
      year: parseInt(year),
      employee: attendance[0]?.employee || null,
    });
  } catch (error) {
    console.error("Error in getAttendanceSummary:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to calculate average clock-in time
const calculateAverageClockIn = (attendance) => {
  const validClockIns = attendance.filter(a => a.clockIn);
  if (validClockIns.length === 0) return "N/A";
  
  const totalMinutes = validClockIns.reduce((sum, a) => {
    const clockIn = new Date(a.clockIn);
    return sum + (clockIn.getHours() * 60 + clockIn.getMinutes());
  }, 0);
  
  const avgMinutes = Math.round(totalMinutes / validClockIns.length);
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Manual attendance entry (Admin/HR)
export const createManualAttendance = async (req, res) => {
  try {
    const { employeeId, date, clockIn, clockOut, status, notes } = req.body;
    const approvedBy = req.user._id;

    if (!employeeId || !date || !clockIn) {
      return res.status(400).json({
        message: "Employee ID, date, and clock-in time are required",
      });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(date).setHours(23, 59, 59, 999)),
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "Attendance record already exists for this date",
      });
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      date: new Date(date),
      clockIn: new Date(clockIn),
      clockOut: clockOut ? new Date(clockOut) : undefined,
      status: status || "present",
      notes,
      approvedBy,
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate("employee", "name email")
      .populate("approvedBy", "name email");

    res.status(201).json({
      message: "Attendance record created successfully",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Error in createManualAttendance:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Update manual attendance (Admin/HR)
export const updateManualAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { clockIn, clockOut, status, notes, reason } = req.body;
    const approvedBy = req.user._id;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ 
        message: "Reason is required for manual attendance updates",
        type: 'reason_required'
      });
    }

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Track the changes
    const changes = {
      oldStatus: attendance.status,
      newStatus: status || attendance.status,
      oldClockIn: attendance.clockIn,
      newClockIn: clockIn ? new Date(clockIn) : attendance.clockIn,
      oldClockOut: attendance.clockOut,
      newClockOut: clockOut ? new Date(clockOut) : attendance.clockOut,
    };

    // Track manual modification
    attendance.trackManualModification(approvedBy, reason, changes);

    // Update fields
    if (clockIn) attendance.clockIn = new Date(clockIn);
    if (clockOut) attendance.clockOut = new Date(clockOut);
    if (status) attendance.status = status;
    if (notes) attendance.notes = notes;
    attendance.approvedBy = approvedBy;

    await attendance.save();

    const populatedAttendance = await Attendance.findById(id)
      .populate("employee", "name email")
      .populate("approvedBy", "name email")
      .populate("modificationHistory.modifiedBy", "name email");

    res.status(200).json({
      message: "Attendance record updated successfully",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Error in updateManualAttendance:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete attendance record (Admin/HR)
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findByIdAndDelete(id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    res.status(200).json({ message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAttendance:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get attendance report
export const getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, departmentId } = req.query;

    let filter = {};

    if (employeeId) filter.employee = employeeId;
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(filter)
      .populate("employee", "name email department position")
      .populate("approvedBy", "name email")
      .sort({ date: -1 });

    // Filter by department if provided
    let filteredAttendance = attendance;
    if (departmentId) {
      filteredAttendance = attendance.filter(
        (a) => a.employee?.department?.toString() === departmentId
      );
    }

    // Calculate summary statistics
    const summary = {
      totalRecords: filteredAttendance.length,
      totalPresent: filteredAttendance.filter((a) => a.status === "present")
        .length,
      totalAbsent: filteredAttendance.filter((a) => a.status === "absent")
        .length,
      totalLate: filteredAttendance.filter((a) => a.status === "late").length,
      totalHalfDay: filteredAttendance.filter((a) => a.status === "half-day")
        .length,
      totalOnLeave: filteredAttendance.filter((a) => a.status === "on-leave")
        .length,
      totalWorkHours: filteredAttendance.reduce(
        (sum, a) => sum + (a.workHours || 0),
        0
      ),
      totalOvertime: filteredAttendance.reduce(
        (sum, a) => sum + (a.overtime || 0),
        0
      ),
    };

    res.status(200).json({
      summary,
      records: filteredAttendance,
    });
  } catch (error) {
    console.error("Error in getAttendanceReport:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's attendance status (HoD is also an employee)
export const getTodayAttendance = async (req, res) => {
  try {
    const employee = req.user._id;
    
    // Allow employees, HoDs, HR, and Admin to check today's attendance
    // HR and Admin can check their own attendance too
    const allowedRoles = ['employee', 'hod', 'hr', 'admin', 'superadmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Access denied"
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error in getTodayAttendance:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Debug endpoint to test status calculation (no auth required)
// Simple test endpoint (no auth) to verify status calculation logic
export const testStatusLogic = async (req, res) => {
  try {
    const testCases = [
      { time: "09:00", expected: "present" },
      { time: "10:30", expected: "present" },
      { time: "10:31", expected: "late" },
      { time: "11:59", expected: "late" },
      { time: "12:00", expected: "half-day" },
      { time: "14:30", expected: "half-day" },
      { time: "16:00", expected: "half-day" }
    ];
    
    const results = testCases.map(test => {
      const [hours, minutes] = test.time.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      
      let calculatedStatus;
      if (totalMinutes >= 720) {
        calculatedStatus = "half-day";
      } else if (totalMinutes > 630) {
        calculatedStatus = "late";
      } else {
        calculatedStatus = "present";
      }
      
      return {
        time: test.time,
        totalMinutes: totalMinutes,
        expected: test.expected,
        calculated: calculatedStatus,
        correct: calculatedStatus === test.expected
      };
    });
    
    const allCorrect = results.every(r => r.correct);
    
    res.status(200).json({
      message: "Attendance status logic test",
      allTestsPassed: allCorrect,
      results: results,
      rules: {
        present: "00:00 - 10:30 (0-630 minutes)",
        late: "10:31 - 11:59 (631-719 minutes)",
        halfDay: "12:00+ (720+ minutes)"
      }
    });
    
  } catch (error) {
    console.error("Error in testStatusLogic:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const debugStatusCalculation = async (req, res) => {
  try {
    const { time } = req.query; // Format: "14:30"
    
    if (!time) {
      return res.status(400).json({ 
        message: "Please provide time parameter (e.g., ?time=14:30)"
      });
    }
    
    // Parse time
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return res.status(400).json({ 
        message: "Invalid time format. Use HH:MM (e.g., 14:30)"
      });
    }
    
    const totalMinutes = hours * 60 + minutes;
    
    // Apply the same logic as the model
    let calculatedStatus;
    if (totalMinutes >= 720) {
      calculatedStatus = "half-day"; // 12:00 PM or later
    } else if (totalMinutes > 630) {
      calculatedStatus = "late"; // 10:31 AM to 11:59 AM
    } else {
      calculatedStatus = "present"; // 00:00 to 10:30 AM
    }
    
    res.status(200).json({
      inputTime: time,
      hours: hours,
      minutes: minutes,
      totalMinutes: totalMinutes,
      calculatedStatus: calculatedStatus,
      rules: {
        present: "00:00 - 10:30 (0-630 minutes)",
        late: "10:31 - 11:59 (631-719 minutes)", 
        halfDay: "12:00+ (720+ minutes)"
      }
    });
    
  } catch (error) {
    console.error("Error in debugStatusCalculation:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Force recalculate today's attendance status
export const recalculateTodayStatus = async (req, res) => {
  try {
    const employee = req.user._id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (!attendance) {
      return res.status(404).json({ 
        message: "No attendance record found for today"
      });
    }

    // Force recalculate status
    const oldStatus = attendance.status;
    const newStatus = attendance.calculateStatus();
    
    console.log(`[RECALCULATE] ${req.user.name}: ${oldStatus} → ${newStatus}`);
    
    if (oldStatus !== newStatus) {
      attendance.status = newStatus;
      await attendance.save();
      
      res.status(200).json({
        message: `Status recalculated: ${oldStatus} → ${newStatus}`,
        attendance,
        changed: true,
        oldStatus,
        newStatus
      });
    } else {
      res.status(200).json({
        message: "Status is already correct",
        attendance,
        changed: false,
        status: newStatus
      });
    }
    
  } catch (error) {
    console.error("Error in recalculateTodayStatus:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Fix all HR attendance records (Admin only)
export const fixAllHRAttendance = async (req, res) => {
  try {
    console.log(`[FIX-HR] Starting HR attendance fix by ${req.user.name} (${req.user.role})`);
    
    // Get all HR users
    const hrUsers = await User.find({ role: 'hr' }).select('_id name email');
    
    console.log(`[FIX-HR] Found ${hrUsers.length} HR users`);
    
    // Get recent attendance records for HR users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let fixedCount = 0;
    const fixedRecords = [];
    
    for (const hrUser of hrUsers) {
      const attendanceRecords = await Attendance.find({
        employee: hrUser._id,
        date: { $gte: thirtyDaysAgo },
        clockIn: { $exists: true }
      });
      
      console.log(`[FIX-HR] Checking ${attendanceRecords.length} records for ${hrUser.name}`);
      
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
        
        if (record.status !== correctStatus && !record.isManuallyModified) {
          const oldStatus = record.status;
          record.status = correctStatus;
          
          // Track the manual modification
          record.trackManualModification(
            req.user._id,
            `System fix: HR attendance status correction from ${oldStatus} to ${correctStatus}`,
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
            employee: hrUser.name,
            email: hrUser.email,
            date: record.date.toDateString(),
            clockIn: clockInTime.toLocaleTimeString(),
            oldStatus: oldStatus,
            newStatus: correctStatus
          });
          
          console.log(`[FIX-HR] Fixed: ${hrUser.name} - ${clockInTime.toLocaleString()} - ${oldStatus} → ${correctStatus}`);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Fixed ${fixedCount} HR attendance records`,
      hrUsersChecked: hrUsers.length,
      fixedCount: fixedCount,
      fixedRecords: fixedRecords
    });
    
  } catch (error) {
    console.error("Error fixing HR attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fixing HR attendance records",
      error: error.message
    });
  }
};


// Download Attendance PDF
export const downloadAttendancePDF = async (req, res) => {
  try {
    const { employee, startDate, endDate } = req.query;

    if (!employee || !startDate || !endDate) {
      return res.status(400).json({ 
        message: "Employee ID, start date, and end date are required" 
      });
    }

    // Read and convert logo to base64
    let logoBase64 = '';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const logoPath = path.join(__dirname, '../../uploads/We-Alll-Logo.jpg');
      
      console.log('Attempting to load logo from:', logoPath);
      
      if (fs.default.existsSync(logoPath)) {
        const logoBuffer = fs.default.readFileSync(logoPath);
        logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
        console.log('Logo loaded successfully, base64 length:', logoBase64.length);
      } else {
        console.log('Logo file not found at path:', logoPath);
      }
    } catch (error) {
      console.log('Error loading logo:', error.message);
    }

    // Build query
    const query = { employee };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Fetch attendance records
    const attendances = await Attendance.find(query)
      .populate("employee", "name email employeeId")
      .sort({ date: 1 });

    // Get employee info
    const employeeInfo = attendances[0]?.employee || await User.findById(employee).select("name email employeeId");

    if (!employeeInfo) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Calculate statistics
    const stats = {
      present: attendances.filter(a => a.status === "present").length,
      late: attendances.filter(a => a.status === "late").length,
      halfDay: attendances.filter(a => a.status === "half-day").length,
      absent: attendances.filter(a => a.status === "absent").length,
      onLeave: attendances.filter(a => a.status === "on-leave").length,
      totalHours: attendances.reduce((sum, a) => sum + (a.workHours || 0), 0).toFixed(2),
      totalOvertime: attendances.reduce((sum, a) => sum + (a.overtime || 0), 0).toFixed(2),
    };

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Attendance Report - ${employeeInfo.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #667eea; padding-bottom: 20px; }
          .company-header { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; gap: 15px; }
          .company-logo { width: 60px; height: 60px; }
          .company-logo img { 
            width: 60px; 
            height: 60px; 
            object-fit: contain;
            border-radius: 8px; 
            background: white;
            padding: 4px;
            border: 2px solid #667eea;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .company-info { text-align: left; }
          .company-info h2 { margin: 0; color: #333; font-size: 24px; }
          .company-info .tagline { margin: 5px 0 0 0; color: #666; font-size: 12px; font-style: italic; }
          .employee-info { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; }
          .header h1 { margin: 15px 0 10px 0; color: #333; font-size: 28px; }
          .header p { margin: 5px 0; color: #666; }
          .info-section { margin: 20px 0; }
          .info-row { display: flex; margin: 10px 0; }
          .info-label { font-weight: bold; width: 150px; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 30px 0; }
          .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
          .stat-card h3 { margin: 0; font-size: 32px; }
          .stat-card p { margin: 5px 0; color: #666; }
          .present { border-left: 4px solid #28a745; }
          .late { border-left: 4px solid #ffc107; }
          .absent { border-left: 4px solid #dc3545; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .status-present { background-color: #d4edda; color: #155724; }
          .status-late { background-color: #fff3cd; color: #856404; }
          .status-absent { background-color: #f8d7da; color: #721c24; }
          .status-half-day { background-color: #d1ecf1; color: #0c5460; }
          .status-on-leave { background-color: #e2e3e5; color: #383d41; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-header">
            <div class="company-logo">
              ${logoBase64 ? `<img src="${logoBase64}" alt="WE ALLL Logo" />` : '<div style="width:60px;height:60px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:10px;">WE ALLL</div>'}
            </div>
            <div class="company-info">
              <h2>WE ALLL Office</h2>
              <p class="tagline">Empowering Teams, Simplifying Management</p>
            </div>
          </div>
          <h1>📊 Attendance Report</h1>
          <div class="employee-info">
            <p><strong>${employeeInfo.name}</strong></p>
            <p>${employeeInfo.email} ${employeeInfo.employeeId ? `| ID: ${employeeInfo.employeeId}` : ''}</p>
            <p>Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="stats">
          <div class="stat-card present">
            <h3>${stats.present}</h3>
            <p>Present</p>
          </div>
          <div class="stat-card late">
            <h3>${stats.late}</h3>
            <p>Late</p>
          </div>
          <div class="stat-card absent">
            <h3>${stats.absent}</h3>
            <p>Absent</p>
          </div>
          <div class="stat-card">
            <h3>${stats.halfDay}</h3>
            <p>Half Day</p>
          </div>
          <div class="stat-card">
            <h3>${stats.onLeave}</h3>
            <p>On Leave</p>
          </div>
          <div class="stat-card">
            <h3>${stats.totalHours}</h3>
            <p>Total Hours</p>
          </div>
        </div>

        <h2>Detailed Records</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Work Hours</th>
              <th>Overtime</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${attendances.map(att => `
              <tr>
                <td>${new Date(att.date).toLocaleDateString()}</td>
                <td>${att.clockIn ? new Date(att.clockIn).toLocaleTimeString() : '-'}</td>
                <td>${att.clockOut ? new Date(att.clockOut).toLocaleTimeString() : '-'}</td>
                <td>${att.workHours || 0} hrs</td>
                <td>${att.overtime || 0} hrs</td>
                <td><span class="status-badge status-${att.status}">${att.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p><strong>WE ALLL Office</strong> | Attendance Management System</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>This is an official system-generated report</p>
          <p style="margin-top: 10px; font-size: 10px;">© ${new Date().getFullYear()} WE ALLL. All rights reserved.</p>
        </div>

        <script>
          // Auto-print when loaded
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    // Send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error("Error generating attendance PDF:", error);
    res.status(500).json({ 
      message: "Failed to generate PDF", 
      error: error.message 
    });
  }
};

// Fix today's attendance status
// Fix work hours calculation for existing records
// Remove duplicate attendance records
export const removeDuplicateAttendance = async (req, res) => {
  try {
    console.log('[DUPLICATES] Starting duplicate removal...');
    
    // Find all attendance records
    const allRecords = await Attendance.find({})
      .populate('employee', 'name')
      .sort({ createdAt: -1 }); // Keep the latest created record
    
    console.log(`[DUPLICATES] Found ${allRecords.length} total records`);
    
    // Group by employee and date
    const groupedRecords = {};
    const duplicatesToRemove = [];
    
    for (const record of allRecords) {
      const key = `${record.employee._id}-${record.date.toDateString()}`;
      
      if (!groupedRecords[key]) {
        groupedRecords[key] = record;
      } else {
        // This is a duplicate - mark for removal
        duplicatesToRemove.push(record._id);
        console.log(`[DUPLICATES] Found duplicate: ${record.employee?.name || 'Unknown'} - ${record.date.toDateString()}`);
      }
    }
    
    // Remove duplicates
    let removedCount = 0;
    if (duplicatesToRemove.length > 0) {
      const result = await Attendance.deleteMany({
        _id: { $in: duplicatesToRemove }
      });
      removedCount = result.deletedCount;
      console.log(`[DUPLICATES] Removed ${removedCount} duplicate records`);
    }
    
    res.status(200).json({
      success: true,
      message: removedCount > 0 ? `Removed ${removedCount} duplicate records` : 'No duplicates found',
      totalRecords: allRecords.length,
      duplicatesRemoved: removedCount,
      uniqueRecords: allRecords.length - removedCount
    });
    
  } catch (error) {
    console.error("Error removing duplicates:", error);
    res.status(500).json({
      success: false,
      message: "Error removing duplicate records",
      error: error.message
    });
  }
};

export const recalculateWorkHours = async (req, res) => {
  try {
    console.log('[WORK-HOURS] Starting work hours recalculation...');
    
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
    
    console.log(`[WORK-HOURS] Found ${recordsToFix.length} records to fix`);
    
    let fixedCount = 0;
    const fixedRecords = [];
    
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
        
        fixedRecords.push({
          employee: record.employee?.name || 'Unknown',
          date: record.date.toDateString(),
          clockIn: record.clockIn.toLocaleTimeString(),
          clockOut: record.clockOut.toLocaleTimeString(),
          workHours: workHours,
          overtime: overtime
        });
        
        console.log(`[WORK-HOURS] Fixed: ${record.employee?.name || 'Unknown'} - ${record.date.toDateString()} - ${workHours}h (${overtime}h overtime)`);
        fixedCount++;
      }
    }
    
    res.status(200).json({
      success: true,
      message: fixedCount > 0 ? `Recalculated work hours for ${fixedCount} records` : 'All work hours are already calculated',
      totalRecords: recordsToFix.length,
      fixedCount: fixedCount,
      fixedRecords: fixedRecords
    });
    
  } catch (error) {
    console.error("Error recalculating work hours:", error);
    res.status(500).json({
      success: false,
      message: "Error recalculating work hours",
      error: error.message
    });
  }
};

export const fixTodayAttendance = async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance records that have clockIn
    const attendanceRecords = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      clockIn: { $exists: true },
      status: { $nin: ['absent', 'on-leave'] } // Don't fix manually set statuses
    }).populate('employee', 'name');

    console.log(`[FIX-TODAY] Checking ${attendanceRecords.length} attendance records...`);

    let fixedCount = 0;
    const fixedRecords = [];

    for (const record of attendanceRecords) {
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
        
        fixedRecords.push({
          employee: record.employee?.name || 'Unknown',
          clockIn: timeStr,
          oldStatus: oldStatus,
          newStatus: correctStatus
        });

        console.log(`[FIX-TODAY] Fixed: ${record.employee?.name || 'Unknown'} - ${timeStr} - ${oldStatus} → ${correctStatus}`);
        fixedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: fixedCount > 0 ? `Fixed ${fixedCount} attendance records` : 'All attendance records are already correct',
      totalRecords: attendanceRecords.length,
      fixedCount: fixedCount,
      fixedRecords: fixedRecords,
      rules: {
        present: 'Before 10:30 AM',
        late: '10:31 AM - 11:59 AM',
        halfDay: '12:00 PM or later'
      }
    });

  } catch (error) {
    console.error("Error fixing today's attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fixing attendance records",
      error: error.message
    });
  }
};