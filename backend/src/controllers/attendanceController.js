import Attendance from "../models/attendanceModel.js";
import logger from '../utils/logger.js';
import { buildDateRangeQuery } from '../utils/queryOptimizer.js';

// Clock in (HoD is also an employee)
export const clockIn = async (req, res) => {
  try {
    const employee = req.user.id;
    const location = req.body?.location || null;
    
    // HoDs are also employees and can clock in
    if (!['employee', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Only employees and HoDs can clock in",
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
    const attendance = await Attendance.create({
      employee,
      date: today, // Use today at midnight, not new Date()
      clockIn: clockInTime,
      location,
      // NO status field - let the model calculate it
    });

    // Determine message based on calculated status
    let message;
    if (attendance.status === "half-day") {
      message = "Clocked in successfully (Half day - arrived after 12:00 PM)";
    } else if (attendance.status === "late") {
      message = "Clocked in successfully (Late entry - arrived after 10:30 AM)";
    } else {
      message = "Clocked in successfully";
    }
    
    logger.success(`Attendance created with status: ${attendance.status} at ${clockInTime.toLocaleTimeString()}`);

    res.status(201).json({
      message: message,
      attendance,
      isLate: status === "late",
      isHalfDay: status === "half-day",
    });
  } catch (error) {
    logger.error("Error in clockIn:", error);
    
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
    const employee = req.user.id;
    const notes = req.body?.notes || null;
    
    // HoDs are also employees and can clock out
    if (!['employee', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Only employees and HoDs can clock out",
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
    const { startDate, endDate, date, employee, status } = req.query;

    let filter = {};

    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    
    // If user is HoD, filter to show only their department's employees
    if (req.user.role === 'hod' && req.user.headOfDepartment) {
      // Get all employees in the HoD's department
      const User = (await import('../models/userModel.js')).default;
      const departmentEmployees = await User.find({
        department: req.user.headOfDepartment
      }).select('_id').lean();
      
      const employeeIds = departmentEmployees.map(emp => emp._id);
      // Add HoD themselves
      employeeIds.push(req.user._id);
      
      // Add department filter to attendance query
      filter.employee = { $in: employeeIds };
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

    logger.info('getAllAttendance query:', filter);

    // Optimized query WITHOUT pagination (backward compatible)
    const attendance = await Attendance.find(filter)
      .select('employee date clockIn clockOut status workingHours isManuallyModified originalStatus modificationHistory')
      .populate("employee", "name email department")
      .populate("approvedBy", "name")
      .populate("modificationHistory.modifiedBy", "name email role")
      .sort({ date: -1 })
      .lean();

    logger.success(`Found ${attendance.length} attendance records`);

    // Return simple array (backward compatible)
    res.status(200).json(attendance);
  } catch (error) {
    logger.error("Error in getAllAttendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get employee's own attendance (HoD is also an employee)
export const getMyAttendance = async (req, res) => {
  try {
    const employee = req.user.id;
    const { startDate, endDate } = req.query;
    
    // HoDs are also employees and can view their attendance
    if (!['employee', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Only employees and HoDs can view their attendance"
      });
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
    logger.error("Error in getMyAttendance:", error);
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
    const approvedBy = req.user.id;

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
    const approvedBy = req.user.id;

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
    const approvedBy = req.user.id;

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
    const approvedBy = req.user.id;

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
    const employee = req.user.id;
    
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
