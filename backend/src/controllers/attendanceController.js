import Attendance from "../models/attendanceModel.js";

// Clock in
export const clockIn = async (req, res) => {
  try {
    const employee = req.user.id;
    const location = req.body?.location || null;

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

    // Check if clock-in is late (after 10:30 AM)
    const clockInTime = new Date();
    const clockInHour = clockInTime.getHours();
    const clockInMinute = clockInTime.getMinutes();
    
    // Late if after 10:30 AM (10 hours 30 minutes)
    const isLate = clockInHour > 10 || (clockInHour === 10 && clockInMinute > 30);
    
    // Create attendance with date at midnight for consistency with unique index
    const attendance = await Attendance.create({
      employee,
      date: today, // Use today at midnight, not new Date()
      clockIn: clockInTime,
      location,
      status: isLate ? "late" : "present",
    });

    res.status(201).json({
      message: isLate 
        ? "Clocked in successfully (Late entry)" 
        : "Clocked in successfully",
      attendance,
      isLate,
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

// Clock out
export const clockOut = async (req, res) => {
  try {
    const employee = req.user.id;
    const notes = req.body?.notes || null;

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
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(filter)
      .populate("employee", "name email department position")
      .populate("approvedBy", "name email")
      .sort({ date: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error in getAllAttendance:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get employee's own attendance
export const getMyAttendance = async (req, res) => {
  try {
    const employee = req.user.id;
    const { startDate, endDate } = req.query;

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
    console.error("Error in getMyAttendance:", error.message);
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
    const { status, notes } = req.body;
    const approvedBy = req.user.id;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    attendance.status = status;
    attendance.approvedBy = approvedBy;
    if (notes) attendance.notes = notes;

    await attendance.save();

    res.status(200).json({
      message: "Attendance status updated successfully",
      attendance,
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
    });

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
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error in getAttendanceSummary:", error.message);
    res.status(500).json({ message: "Server error" });
  }
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
    const { clockIn, clockOut, status, notes } = req.body;
    const approvedBy = req.user.id;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    if (clockIn) attendance.clockIn = new Date(clockIn);
    if (clockOut) attendance.clockOut = new Date(clockOut);
    if (status) attendance.status = status;
    if (notes) attendance.notes = notes;
    attendance.approvedBy = approvedBy;

    await attendance.save();

    const populatedAttendance = await Attendance.findById(id)
      .populate("employee", "name email")
      .populate("approvedBy", "name email");

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

// Get today's attendance status
export const getTodayAttendance = async (req, res) => {
  try {
    const employee = req.user.id;

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
