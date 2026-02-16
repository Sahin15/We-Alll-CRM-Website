import Attendance from "../models/attendanceModel.js";
import User from "../models/userModel.js";
import logger from '../utils/logger.js';
import { buildDateRangeQuery } from '../utils/queryOptimizer.js';
import { 
  getCurrentISTTime, 
  getTodayMidnightIST, 
  getTodayRangeIST,
  logTimezoneInfo 
} from '../utils/timezone.js';

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

    // TIMEZONE FIX: Use IST time consistently
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();
    const clockInTime = getCurrentISTTime();
    
    // Log timezone info for debugging
    console.log(`[CLOCK-IN] Timezone Info:`);
    logTimezoneInfo();
    console.log(`[CLOCK-IN] Clock-in time (IST): ${clockInTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    // Check if already clocked in today (with retry for race condition)
    // Use findOne with sort to get the earliest record if duplicates exist
    const existingAttendance = await Attendance.findOne({
      employee,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    }).sort({ clockIn: 1 }); // Get earliest clock-in if multiple exist

    if (existingAttendance) {
      const clockInTimeStr = new Date(existingAttendance.clockIn).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`[CLOCK-IN] ❌ Duplicate attempt by ${req.user.name}`);
      console.log(`[CLOCK-IN] Existing record ID: ${existingAttendance._id}`);
      console.log(`[CLOCK-IN] Existing clock-in: ${existingAttendance.clockIn.toISOString()}`);
      console.log(`[CLOCK-IN] Date range checked: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);
      
      // Check if there are multiple records (race condition happened)
      const duplicateCount = await Attendance.countDocuments({
        employee,
        date: {
          $gte: todayStart,
          $lt: todayEnd,
        },
      });
      
      if (duplicateCount > 1) {
        console.log(`[CLOCK-IN] ⚠️  Found ${duplicateCount} records for today - cleaning up duplicates`);
        // Delete all except the earliest one
        await Attendance.deleteMany({
          employee,
          date: {
            $gte: todayStart,
            $lt: todayEnd,
          },
          _id: { $ne: existingAttendance._id } // Keep the earliest record
        });
        console.log(`[CLOCK-IN] ✅ Cleaned up ${duplicateCount - 1} duplicate record(s)`);
      }
      
      return res.status(400).json({ 
        message: `You've already clocked in today at ${clockInTimeStr}`,
        type: 'already_clocked_in',
        clockInTime: existingAttendance.clockIn,
        recordId: existingAttendance._id
      });
    }

    // Create attendance - status will be calculated automatically by the pre-save hook
    console.log(`[CLOCK-IN] Creating attendance for ${req.user.name} (${req.user.role})`);
    
    // Create attendance object WITHOUT explicit status - let pre-save hook calculate it
    const attendanceData = {
      employee,
      date: todayStart, // Use IST midnight
      clockIn: clockInTime, // Use IST time
      location,
      // NO status field - let the pre-save hook calculate it
    };
    
    console.log(`[CLOCK-IN] Attendance data:`, {
      ...attendanceData,
      clockIn: clockInTime.toISOString(),
      clockInIST: clockInTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
    
    const attendance = await Attendance.create(attendanceData);

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
    
    console.log(`[CLOCK-IN] ✅ Final status: ${attendance.status} at ${clockInTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

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

    // TIMEZONE FIX: Use IST time consistently
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();
    const clockOutTime = getCurrentISTTime();

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    });

    if (!attendance) {
      return res.status(404).json({ 
        message: "You haven't clocked in yet today. Please clock in first.",
        type: 'not_clocked_in'
      });
    }

    if (attendance.clockOut) {
      const clockOutTimeStr = new Date(attendance.clockOut).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return res.status(400).json({ 
        message: `You've already clocked out today at ${clockOutTimeStr}. See you tomorrow!`,
        type: 'already_clocked_out',
        clockOutTime: attendance.clockOut
      });
    }

    attendance.clockOut = clockOutTime; // Use IST time
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

    // Debug: Check if we can access the database
    console.log('[ATTENDANCE API] Testing database connection...');
    const testCount = await Attendance.countDocuments();
    console.log('[ATTENDANCE API] Total attendance records in DB:', testCount);
    
    // Debug: Check recent records
    const recentRecords = await Attendance.find().sort({ date: -1 }).limit(5).lean();
    console.log('[ATTENDANCE API] Recent 5 records:', recentRecords.map(r => ({
      id: r._id,
      employee: r.employee,
      date: r.date,
      status: r.status,
      clockIn: r.clockIn
    })));

    // Debug: Check user permissions
    console.log('[ATTENDANCE API] User role check:', {
      role: req.user?.role,
      isAdmin: ['admin', 'superadmin'].includes(req.user?.role),
      isHR: req.user?.role === 'hr',
      isHoD: req.user?.role === 'hod',
      department: req.user?.department
    });

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
      console.log('[ATTENDANCE API] Single date filter:', { date, startOfDay, endOfDay });
    }
    // Handle date range filter
    else if (startDate && endDate) {
      const dateRangeFilter = buildDateRangeQuery(startDate, endDate, 'date');
      Object.assign(filter, dateRangeFilter);
      console.log('[ATTENDANCE API] Date range filter:', { startDate, endDate, dateRangeFilter });
    }


    
    console.log('[ATTENDANCE API] Filter:', filter);
    console.log('[ATTENDANCE API] Request params:', { employee, status, startDate, endDate, userRole: req.user.role });

    // Debug: Try a simple query first
    console.log('[ATTENDANCE API] Executing database query...');
    let attendance;
    try {
      attendance = await Attendance.find(filter)
        .select('employee date clockIn clockOut breaks totalBreakTime status workHours overtime isManuallyModified originalStatus modificationHistory')
        .populate("employee", "name email department")
        .populate("approvedBy", "name")
        .populate("modificationHistory.modifiedBy", "name email role")
        .sort({ date: -1 })
        .lean();
      console.log('[ATTENDANCE API] Database query successful');
      
      // Log sample record to check breaks field
      if (attendance.length > 0) {
        console.log('[ATTENDANCE API] Sample record:', {
          id: attendance[0]._id,
          employee: attendance[0].employee?.name,
          breaks: attendance[0].breaks,
          totalBreakTime: attendance[0].totalBreakTime,
          hasBreaksField: attendance[0].hasOwnProperty('breaks')
        });
      }
    } catch (dbError) {
      console.error('[ATTENDANCE API] Database query failed:', dbError);
      throw dbError;
    }


    
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

    // Use IST timezone-aware date range
    const { start, end } = getTodayRangeIST();

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: start,
        $lt: end,
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
    
    // Apply the same logic as the model (with IST timezone handling)
    let calculatedStatus;
    if (totalMinutes >= 720) {
      calculatedStatus = "half-day"; // 12:00 PM or later
    } else if (totalMinutes > 630) {
      calculatedStatus = "late"; // 10:31 AM to 11:59 AM
    } else {
      calculatedStatus = "present"; // 00:00 to 10:30 AM
    }
    
    // Also test with a simulated UTC->IST conversion
    const testDate = new Date();
    testDate.setHours(hours, minutes, 0, 0);
    const utcTime = new Date(testDate.getTime() - (5.5 * 60 * 60 * 1000)); // Simulate UTC storage
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    
    res.status(200).json({
      inputTime: time,
      hours: hours,
      minutes: minutes,
      totalMinutes: totalMinutes,
      calculatedStatus: calculatedStatus,
      timezoneTest: {
        originalIST: testDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        simulatedUTC: utcTime.toISOString(),
        convertedBackToIST: istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        istHours: istTime.getHours(),
        istMinutes: istTime.getMinutes()
      },
      rules: {
        present: "00:00 - 10:30 (0-630 minutes)",
        late: "10:31 - 11:59 (631-719 minutes)", 
        halfDay: "12:00+ (720+ minutes)"
      },
      note: "Status calculation now uses IST timezone (UTC+5:30) for accurate results"
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
    
    // Use IST timezone-aware date range
    const { start, end } = getTodayRangeIST();

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: start,
        $lt: end,
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

    // We ALLL Logo - embedded base64 version
    const weAlllLogoSvg = `data:image/svg+xml;base64,${Buffer.from(`
      <svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="400" height="120" fill="white" rx="12"/>
        
        <!-- We ALLL Text with exact colors from the logo -->
        <g font-family="Arial, sans-serif" font-weight="bold">
          <!-- W - Blue -->
          <text x="30" y="65" font-size="42" fill="#4A90E2">W</text>
          
          <!-- / - Red diagonal -->
          <path d="M 70 30 L 85 30 L 105 80 L 90 80 Z" fill="#E74C3C"/>
          
          <!-- e - Blue -->
          <text x="110" y="65" font-size="42" fill="#4A90E2">e</text>
          
          <!-- Space -->
          
          <!-- A - Green -->
          <text x="170" y="65" font-size="42" fill="#27AE60">A</text>
          
          <!-- L - Red -->
          <text x="210" y="65" font-size="42" fill="#E74C3C">L</text>
          
          <!-- L - Yellow -->
          <text x="240" y="65" font-size="42" fill="#F39C12">L</text>
          
          <!-- L - Green -->
          <text x="270" y="65" font-size="42" fill="#27AE60">L</text>
        </g>
        
        <!-- GROW TOGETHER tagline -->
        <text x="200" y="95" font-family="Arial, sans-serif" font-size="14" font-weight="normal" text-anchor="middle" fill="#7F8C8D" letter-spacing="3px">GROW TOGETHER</text>
      </svg>
    `).toString('base64')}`;

    // Read and convert logo to base64
    let logoBase64 = weAlllLogoSvg; // Use embedded logo as default
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      // Try multiple logo file paths - if found, override the embedded logo
      const logoPaths = [
        path.join(__dirname, '../../uploads/we-alll-logo.png'),
        path.join(__dirname, '../../uploads/we-alll-logo.svg'),
        path.join(__dirname, '../../uploads/we-alll-logo.jpg'),
        path.join(__dirname, '../../uploads/We-Alll-Office-Logo.png'),
        path.join(__dirname, '../../uploads/Wealll_mini.png'),
        path.join(__dirname, '../../uploads/We-Alll-Logo.jpg'),
        path.join(__dirname, '../../uploads/company-logo.png')
      ];
      
      let logoLoaded = false;
      for (const logoPath of logoPaths) {
        console.log('Checking for uploaded logo at:', logoPath);
        
        if (fs.default.existsSync(logoPath)) {
          const logoBuffer = fs.default.readFileSync(logoPath);
          const fileExtension = path.extname(logoPath).toLowerCase();
          let mimeType = 'image/png';
          
          if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
            mimeType = 'image/jpeg';
          } else if (fileExtension === '.png') {
            mimeType = 'image/png';
          } else if (fileExtension === '.svg') {
            mimeType = 'image/svg+xml';
          }
          
          logoBase64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
          console.log('Uploaded logo loaded successfully from:', logoPath, 'base64 length:', logoBase64.length);
          logoLoaded = true;
          break;
        }
      }
      
      if (!logoLoaded) {
        console.log('No uploaded logo found, using embedded We ALLL logo');
      }
    } catch (error) {
      console.log('Error loading uploaded logo, using embedded We ALLL logo:', error.message);
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
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4CAF50; padding-bottom: 20px; }
          .company-header { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
          .company-logo { width: 100%; max-width: 200px; height: auto; }
          .company-logo img { 
            width: 100%; 
            height: auto;
            max-height: 60px;
            object-fit: contain;
            border-radius: 6px; 
            background: white;
            padding: 6px;
            border: 2px solid #4CAF50;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
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
          .present { border-left: 4px solid #4CAF50; }
          .late { border-left: 4px solid #FF9800; }
          .absent { border-left: 4px solid #F44336; }
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
          <div class="company-header">
            <div class="company-logo">
              <img src="${logoBase64}" alt="We ALLL Logo" />
            </div>
          </div>
          </div>
          <h1>📊 Attendance Report</h1>
          <div class="employee-info">
            <p><strong>${employeeInfo.name}</strong></p>
            <p>${employeeInfo.email} ${employeeInfo.employeeId ? `| ID: ${employeeInfo.employeeId}` : ''}</p>
            <p>Period: ${(() => {
              const start = new Date(startDate);
              const end = new Date(endDate);
              const formatDate = (date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
              };
              return `${formatDate(start)} - ${formatDate(end)}`;
            })()}</p>
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
                <td>${(() => {
                  const date = new Date(att.date);
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = String(date.getFullYear()).slice(-2);
                  return `${day}/${month}/${year}`;
                })()}</td>
                <td>${att.clockIn ? (() => {
                  const time = new Date(att.clockIn);
                  const hours = String(time.getHours()).padStart(2, '0');
                  const minutes = String(time.getMinutes()).padStart(2, '0');
                  return `${hours}:${minutes}`;
                })() : '-'}</td>
                <td>${att.clockOut ? (() => {
                  const time = new Date(att.clockOut);
                  const hours = String(time.getHours()).padStart(2, '0');
                  const minutes = String(time.getMinutes()).padStart(2, '0');
                  return `${hours}:${minutes}`;
                })() : '-'}</td>
                <td>${att.workHours || 0} hrs</td>
                <td>${att.overtime || 0} hrs</td>
                <td><span class="status-badge status-${att.status}">${att.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p><strong>Attendance Management System</strong></p>
          <p>Generated on ${(() => {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year}, ${hours}:${minutes}`;
          })()}</p>
          <p>This is an official system-generated report</p>
          <p style="margin-top: 10px; font-size: 10px; color: #4CAF50;">© ${new Date().getFullYear()} We ALLL - GROW TOGETHER. All rights reserved.</p>
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
    // Use IST timezone-aware date range
    const { start: today, end: tomorrow } = getTodayRangeIST();

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
      
      // CRITICAL FIX: Convert UTC time to IST (Asia/Calcutta) for calculation
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const istTime = new Date(clockInTime.getTime() + istOffset);
      
      const clockInHour = istTime.getHours();
      const clockInMinute = istTime.getMinutes();
      const totalMinutes = clockInHour * 60 + clockInMinute;

      // Calculate correct status using IST time
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
          clockInUTC: clockInTime.toISOString(),
          clockInIST: timeStr,
          totalMinutes: totalMinutes,
          oldStatus: oldStatus,
          newStatus: correctStatus
        });

        console.log(`[FIX-TODAY] Fixed: ${record.employee?.name || 'Unknown'} - UTC: ${clockInTime.toISOString()} -> IST: ${timeStr} (${totalMinutes}min) - ${oldStatus} → ${correctStatus}`);
        fixedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: fixedCount > 0 ? `Fixed ${fixedCount} attendance records with timezone correction` : 'All attendance records are already correct',
      totalRecords: attendanceRecords.length,
      fixedCount: fixedCount,
      fixedRecords: fixedRecords,
      rules: {
        present: 'Before 10:30 AM IST',
        late: '10:31 AM - 11:59 AM IST',
        halfDay: '12:00 PM or later IST'
      },
      timezoneInfo: {
        serverTimezone: 'Asia/Calcutta (UTC+5:30)',
        note: 'All calculations now use IST timezone for accurate status determination'
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


// Start break (pause)
export const startBreak = async (req, res) => {
  try {
    const employee = req.user._id;
    
    // Employees, HoDs, and HR can take breaks (not clients, admin, superadmin)
    if (['client', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Admins and clients cannot take breaks. This feature is for employees only.",
        type: 'invalid_role'
      });
    }

    // Use IST timezone-aware date range
    const { start, end } = getTodayRangeIST();

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: start,
        $lt: end,
      },
    });

    if (!attendance) {
      return res.status(404).json({ 
        message: "You haven't clocked in yet today. Please clock in first.",
        type: 'not_clocked_in'
      });
    }

    if (attendance.clockOut) {
      return res.status(400).json({ 
        message: "You've already clocked out. Cannot start a break.",
        type: 'already_clocked_out'
      });
    }

    // Check if already on break
    if (attendance.isOnBreak()) {
      return res.status(400).json({ 
        message: "You're already on a break. Please end your current break first.",
        type: 'already_on_break'
      });
    }

    // Add new break
    attendance.breaks.push({
      startTime: new Date(),
    });

    await attendance.save();

    res.status(200).json({
      message: "Break started successfully",
      attendance,
      isOnBreak: true,
    });
  } catch (error) {
    console.error("Error in startBreak:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// End break (resume)
export const endBreak = async (req, res) => {
  try {
    const employee = req.user._id;
    
    // Employees, HoDs, and HR can end breaks (not clients, admin, superadmin)
    if (['client', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Admins and clients cannot end breaks. This feature is for employees only.",
        type: 'invalid_role'
      });
    }

    // Use IST timezone-aware date range
    const { start, end } = getTodayRangeIST();

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: start,
        $lt: end,
      },
    });

    if (!attendance) {
      return res.status(404).json({ 
        message: "You haven't clocked in yet today.",
        type: 'not_clocked_in'
      });
    }

    // Check if on break
    if (!attendance.isOnBreak()) {
      return res.status(400).json({ 
        message: "You're not currently on a break.",
        type: 'not_on_break'
      });
    }

    // End the current break
    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    lastBreak.endTime = new Date();

    // Calculate total break time
    attendance.totalBreakTime = attendance.calculateBreakTime();

    await attendance.save();

    res.status(200).json({
      message: "Break ended successfully",
      attendance,
      isOnBreak: false,
      totalBreakTime: attendance.totalBreakTime,
    });
  } catch (error) {
    console.error("Error in endBreak:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Initialize breaks field for existing attendance records
export const initializeBreaksField = async (req, res) => {
  try {
    console.log('[INIT-BREAKS] Starting breaks field initialization...');
    
    // Find all attendance records that don't have breaks field or have null/undefined breaks
    const recordsToUpdate = await Attendance.find({
      $or: [
        { breaks: { $exists: false } },
        { breaks: null },
        { breaks: [] }
      ]
    });
    
    console.log(`[INIT-BREAKS] Found ${recordsToUpdate.length} records to initialize`);
    
    let updatedCount = 0;
    
    for (const record of recordsToUpdate) {
      // Initialize breaks as empty array and totalBreakTime as 0
      record.breaks = [];
      record.totalBreakTime = 0;
      await record.save();
      updatedCount++;
    }
    
    console.log(`[INIT-BREAKS] Successfully initialized ${updatedCount} records`);
    
    res.status(200).json({
      success: true,
      message: `Initialized breaks field for ${updatedCount} attendance records`,
      totalRecords: recordsToUpdate.length,
      updatedCount: updatedCount
    });
    
  } catch (error) {
    console.error('[INIT-BREAKS] Error initializing breaks field:', error);
    res.status(500).json({
      success: false,
      message: "Error initializing breaks field",
      error: error.message
    });
  }
};


// Manual trigger for auto clock-out (for testing)
export const manualAutoClockOut = async (req, res) => {
  try {
    console.log('[MANUAL-AUTO-CLOCKOUT] Starting manual auto clock-out...');
    
    // Use IST timezone-aware date range
    const { start: today, end: tomorrow } = getTodayRangeIST();

    // Find all attendance records for today that are clocked in but not clocked out
    const forgottenClockOuts = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
      clockIn: { $exists: true },
      clockOut: { $exists: false },
    }).populate("employee", "name email");

    if (forgottenClockOuts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No employees found who forgot to clock out",
        count: 0
      });
    }

    console.log(`[MANUAL-AUTO-CLOCKOUT] Found ${forgottenClockOuts.length} employees who forgot to clock out`);

    // Auto clock-out at 10 PM
    const clockOutTime = new Date();
    clockOutTime.setHours(22, 0, 0, 0); // 10:00 PM

    let autoClockOutCount = 0;
    const clockedOutEmployees = [];

    for (const attendance of forgottenClockOuts) {
      // Set clock out time to 10 PM
      attendance.clockOut = clockOutTime;
      attendance.notes = attendance.notes 
        ? `${attendance.notes}\n⚠️ Auto clocked-out at 10:00 PM - You forgot to clock out!`
        : "⚠️ Auto clocked-out at 10:00 PM - You forgot to clock out!";
      
      await attendance.save();
      autoClockOutCount++;

      clockedOutEmployees.push({
        name: attendance.employee?.name || 'Unknown',
        email: attendance.employee?.email || 'Unknown',
        clockInTime: attendance.clockIn,
        autoClockOutTime: clockOutTime
      });

      console.log(`[MANUAL-AUTO-CLOCKOUT] Auto clocked-out: ${attendance.employee?.name} at 10:00 PM`);
    }

    res.status(200).json({
      success: true,
      message: `Successfully auto clocked-out ${autoClockOutCount} employees`,
      count: autoClockOutCount,
      employees: clockedOutEmployees
    });
    
  } catch (error) {
    console.error('[MANUAL-AUTO-CLOCKOUT] Error:', error);
    res.status(500).json({
      success: false,
      message: "Error during auto clock-out",
      error: error.message
    });
  }
};


// ==================== OVERTIME MANAGEMENT ====================

// Start overtime timer (Employee starts working overtime)
export const startOvertimeTimer = async (req, res) => {
  try {
    const employee = req.user._id;
    const { reason, taskReference } = req.body;

    if (!reason) {
      return res.status(400).json({
        message: "Reason is required to start overtime timer",
      });
    }

    // Use IST timezone-aware date range
    const { start, end } = getTodayRangeIST();

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: start,
        $lt: end,
      },
    });

    if (!attendance) {
      return res.status(404).json({
        message: "No attendance record found for today. Please clock in first.",
      });
    }

    // Start the timer
    const entry = attendance.startOvertimeTimer(reason, taskReference);
    await attendance.save();

    console.log(`[OVERTIME] ${req.user.name} started overtime timer`);

    res.status(201).json({
      message: "Overtime timer started successfully",
      entry,
      attendance,
    });
  } catch (error) {
    console.error("Error starting overtime timer:", error);
    res.status(500).json({
      message: error.message || "Failed to start overtime timer",
    });
  }
};

// Stop overtime timer (Employee finishes overtime work)
export const stopOvertimeTimer = async (req, res) => {
  try {
    const employee = req.user._id;
    const { entryId } = req.params;

    // Use IST timezone-aware date range
    const { start, end } = getTodayRangeIST();

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: start,
        $lt: end,
      },
    });

    if (!attendance) {
      return res.status(404).json({
        message: "No attendance record found",
      });
    }

    // Stop the timer
    const entry = attendance.stopOvertimeTimer(entryId);
    await attendance.save();

    console.log(`[OVERTIME] ${req.user.name} stopped overtime timer: ${entry.duration} hours`);

    res.status(200).json({
      message: `Overtime timer stopped. Duration: ${entry.duration} hours`,
      entry,
      attendance,
    });
  } catch (error) {
    console.error("Error stopping overtime timer:", error);
    res.status(500).json({
      message: error.message || "Failed to stop overtime timer",
    });
  }
};

// Get active overtime timer
export const getActiveOvertimeTimer = async (req, res) => {
  try {
    const employee = req.user._id;

    // Use IST timezone-aware date range
    const { start, end } = getTodayRangeIST();

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: start,
        $lt: end,
      },
    });

    if (!attendance) {
      return res.status(200).json({
        activeTimer: null,
      });
    }

    const activeTimer = attendance.getActiveOvertimeTimer();

    res.status(200).json({
      activeTimer,
      attendance: activeTimer ? attendance : null,
    });
  } catch (error) {
    console.error("Error getting active overtime timer:", error);
    res.status(500).json({
      message: "Failed to get active overtime timer",
    });
  }
};

// Add overtime entry (Legacy - for manual entry with specific times)
export const addOvertimeEntry = async (req, res) => {
  try {
    const employee = req.user._id;
    const { date, startTime, endTime, reason, taskReference, proofOfWork } = req.body;

    // Validate required fields
    if (!date || !startTime || !endTime || !reason) {
      return res.status(400).json({
        message: "Date, start time, end time, and reason are required",
      });
    }

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) {
      return res.status(400).json({
        message: "End time must be after start time",
      });
    }

    // Calculate duration
    const duration = (end - start) / (1000 * 60 * 60); // hours
    
    if (duration > 12) {
      return res.status(400).json({
        message: "Overtime duration cannot exceed 12 hours",
      });
    }

    // Get attendance record for the date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee,
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (!attendance) {
      return res.status(404).json({
        message: "No attendance record found for this date. Please clock in first.",
      });
    }

    if (!attendance.clockOut) {
      return res.status(400).json({
        message: "You must clock out before logging overtime",
      });
    }

    // Validate overtime is after clock out
    if (start < attendance.clockOut) {
      return res.status(400).json({
        message: "Overtime start time must be after your clock out time",
      });
    }

    // Add overtime entry
    const entry = attendance.addOvertimeEntry({
      startTime,
      endTime,
      reason,
      taskReference,
      proofOfWork,
    });

    await attendance.save();

    console.log(`[OVERTIME] Employee ${req.user.name} logged ${duration.toFixed(2)} hours overtime`);

    res.status(201).json({
      message: "Overtime entry added successfully. Pending approval.",
      entry,
      attendance,
    });
  } catch (error) {
    console.error("Error adding overtime entry:", error);
    res.status(500).json({
      message: "Failed to add overtime entry",
      error: error.message,
    });
  }
};

// Get overtime entries for employee
export const getMyOvertimeEntries = async (req, res) => {
  try {
    const employee = req.user._id;
    const { status, startDate, endDate } = req.query;

    // Build query
    const query = { employee };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const attendanceRecords = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('employee', 'name email')
      .lean();

    // Extract and filter overtime entries
    let overtimeEntries = [];
    
    attendanceRecords.forEach(record => {
      if (record.overtimeEntries && record.overtimeEntries.length > 0) {
        record.overtimeEntries.forEach(entry => {
          if (!status || entry.status === status) {
            overtimeEntries.push({
              ...entry,
              attendanceId: record._id,
              date: record.date,
              employee: record.employee,
            });
          }
        });
      }
    });

    // Calculate summary
    const summary = {
      total: overtimeEntries.length,
      pending: overtimeEntries.filter(e => e.status === 'pending').length,
      approved: overtimeEntries.filter(e => e.status === 'approved').length,
      rejected: overtimeEntries.filter(e => e.status === 'rejected').length,
      totalHours: overtimeEntries
        .filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + e.duration, 0)
        .toFixed(2),
    };

    res.status(200).json({
      entries: overtimeEntries,
      summary,
    });
  } catch (error) {
    console.error("Error fetching overtime entries:", error);
    res.status(500).json({
      message: "Failed to fetch overtime entries",
      error: error.message,
    });
  }
};

// Get all pending overtime entries (HR/Admin/HoD)
export const getPendingOvertimeEntries = async (req, res) => {
  try {
    const { departmentId } = req.query;
    
    // Build query based on role
    let query = {};
    
    // If HoD, only show their department's overtime
    if (req.user.role === 'hod' && req.user.department) {
      query = { 'employee.department': req.user.department };
    }
    
    // If department filter is provided
    if (departmentId) {
      query = { 'employee.department': departmentId };
    }

    const attendanceRecords = await Attendance.find({
      'overtimeEntries.status': 'pending',
    })
      .populate({
        path: 'employee',
        select: 'name email department',
        populate: {
          path: 'department',
          select: 'name',
        },
      })
      .sort({ date: -1 })
      .lean();

    // Extract pending overtime entries
    let pendingEntries = [];
    
    attendanceRecords.forEach(record => {
      if (record.overtimeEntries && record.overtimeEntries.length > 0) {
        record.overtimeEntries.forEach(entry => {
          if (entry.status === 'pending') {
            // Apply department filter if HoD
            if (req.user.role === 'hod' && req.user.department) {
              if (record.employee?.department?._id?.toString() === req.user.department.toString()) {
                pendingEntries.push({
                  ...entry,
                  attendanceId: record._id,
                  date: record.date,
                  employee: record.employee,
                });
              }
            } else {
              pendingEntries.push({
                ...entry,
                attendanceId: record._id,
                date: record.date,
                employee: record.employee,
              });
            }
          }
        });
      }
    });

    res.status(200).json({
      entries: pendingEntries,
      total: pendingEntries.length,
    });
  } catch (error) {
    console.error("Error fetching pending overtime entries:", error);
    res.status(500).json({
      message: "Failed to fetch pending overtime entries",
      error: error.message,
    });
  }
};

// Approve overtime entry (HR/Admin/HoD)
export const approveOvertimeEntry = async (req, res) => {
  try {
    const { attendanceId, entryId } = req.params;

    const attendance = await Attendance.findById(attendanceId).populate('employee', 'name email department');

    if (!attendance) {
      return res.status(404).json({
        message: "Attendance record not found",
      });
    }

    // Check if HoD can approve (only their department)
    if (req.user.role === 'hod') {
      if (attendance.employee.department?.toString() !== req.user.department?.toString()) {
        return res.status(403).json({
          message: "You can only approve overtime for your department",
        });
      }
    }

    // Approve the entry
    const entry = attendance.approveOvertimeEntry(entryId, req.user._id);
    await attendance.save();

    console.log(`[OVERTIME] ${req.user.name} approved ${entry.duration} hours overtime for ${attendance.employee.name}`);

    // TODO: Send notification to employee about approval
    // Example: notificationService.sendOvertimeApprovalNotification(attendance.employee._id, entry);

    res.status(200).json({
      message: "Overtime entry approved successfully",
      entry,
      attendance,
    });
  } catch (error) {
    console.error("Error approving overtime entry:", error);
    res.status(500).json({
      message: error.message || "Failed to approve overtime entry",
    });
  }
};

// Reject overtime entry (HR/Admin/HoD)
export const rejectOvertimeEntry = async (req, res) => {
  try {
    const { attendanceId, entryId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const attendance = await Attendance.findById(attendanceId).populate('employee', 'name email department');

    if (!attendance) {
      return res.status(404).json({
        message: "Attendance record not found",
      });
    }

    // Check if HoD can reject (only their department)
    if (req.user.role === 'hod') {
      if (attendance.employee.department?.toString() !== req.user.department?.toString()) {
        return res.status(403).json({
          message: "You can only reject overtime for your department",
        });
      }
    }

    // Reject the entry
    const entry = attendance.rejectOvertimeEntry(entryId, rejectionReason, req.user._id);
    await attendance.save();

    console.log(`[OVERTIME] ${req.user.name} rejected overtime for ${attendance.employee.name}: ${rejectionReason}`);

    // TODO: Send notification to employee about rejection
    // Example: notificationService.sendOvertimeRejectionNotification(attendance.employee._id, entry, rejectionReason);

    res.status(200).json({
      message: "Overtime entry rejected",
      entry,
      attendance,
    });
  } catch (error) {
    console.error("Error rejecting overtime entry:", error);
    res.status(500).json({
      message: error.message || "Failed to reject overtime entry",
    });
  }
};

// Get overtime statistics (HR/Admin)
export const getOvertimeStatistics = async (req, res) => {
  try {
    const { startDate, endDate, departmentId } = req.query;

    // Build query
    const query = {};
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'name email department',
        populate: {
          path: 'department',
          select: 'name',
        },
      })
      .lean();

    // Calculate statistics
    const stats = {
      totalAutoOvertime: 0,
      totalManualOvertime: 0,
      totalOvertime: 0,
      pendingApprovals: 0,
      approvedEntries: 0,
      rejectedEntries: 0,
      byEmployee: {},
      byDepartment: {},
    };

    attendanceRecords.forEach(record => {
      // Filter by department if specified
      if (departmentId && record.employee?.department?._id?.toString() !== departmentId) {
        return;
      }

      // Auto overtime
      stats.totalAutoOvertime += record.overtime || 0;

      // Manual overtime
      if (record.overtimeEntries && record.overtimeEntries.length > 0) {
        record.overtimeEntries.forEach(entry => {
          if (entry.status === 'pending') {
            stats.pendingApprovals++;
          } else if (entry.status === 'approved') {
            stats.approvedEntries++;
            stats.totalManualOvertime += entry.duration;
          } else if (entry.status === 'rejected') {
            stats.rejectedEntries++;
          }
        });
      }

      // By employee
      const empId = record.employee._id.toString();
      if (!stats.byEmployee[empId]) {
        stats.byEmployee[empId] = {
          name: record.employee.name,
          email: record.employee.email,
          department: record.employee.department?.name || 'N/A',
          autoOvertime: 0,
          manualOvertime: 0,
          totalOvertime: 0,
        };
      }
      stats.byEmployee[empId].autoOvertime += record.overtime || 0;
      stats.byEmployee[empId].manualOvertime += record.totalManualOvertime || 0;
      stats.byEmployee[empId].totalOvertime += record.totalWorkHours || 0;

      // By department
      const deptName = record.employee.department?.name || 'Unassigned';
      if (!stats.byDepartment[deptName]) {
        stats.byDepartment[deptName] = {
          autoOvertime: 0,
          manualOvertime: 0,
          totalOvertime: 0,
        };
      }
      stats.byDepartment[deptName].autoOvertime += record.overtime || 0;
      stats.byDepartment[deptName].manualOvertime += record.totalManualOvertime || 0;
      stats.byDepartment[deptName].totalOvertime += record.totalWorkHours || 0;
    });

    stats.totalOvertime = stats.totalAutoOvertime + stats.totalManualOvertime;

    // Convert objects to arrays
    stats.byEmployee = Object.values(stats.byEmployee).sort((a, b) => b.totalOvertime - a.totalOvertime);
    stats.byDepartment = Object.entries(stats.byDepartment).map(([name, data]) => ({
      department: name,
      ...data,
    })).sort((a, b) => b.totalOvertime - a.totalOvertime);

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching overtime statistics:", error);
    res.status(500).json({
      message: "Failed to fetch overtime statistics",
      error: error.message,
    });
  }
};
