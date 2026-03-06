import WorkLog from "../models/workLogModel.js";
import User from "../models/userModel.js";
import Attendance from "../models/attendanceModel.js";
import logger from "../utils/logger.js";
import { getCurrentISTTime, getTodayMidnightIST, getTodayRangeIST } from "../utils/timezone.js";
import * as XLSX from "xlsx";

// Submit or update today's work log
export const submitWorkLog = async (req, res) => {
  try {
    const { workLog } = req.body;
    const employee = req.user._id;

    // Validate work log length
    if (!workLog || workLog.trim().length < 50) {
      return res.status(400).json({
        message: "Work log must be at least 50 characters",
      });
    }

    if (workLog.trim().length > 2000) {
      return res.status(400).json({
        message: "Work log cannot exceed 2000 characters",
      });
    }

    const { start: todayStart, end: todayEnd } = getTodayRangeIST();
    const now = getCurrentISTTime();

    // Check if work log already exists for today
    let existingLog = await WorkLog.findOne({
      employee,
      date: { $gte: todayStart, $lt: todayEnd },
    });

    if (existingLog) {
      // Check if already reviewed
      if (existingLog.status === "reviewed") {
        return res.status(400).json({
          message: "Cannot edit work log after it has been reviewed",
        });
      }

      // Update existing log
      const oldWorkLog = existingLog.workLog;
      existingLog.workLog = workLog.trim();
      existingLog.status = "submitted";
      existingLog.submittedAt = now;

      // Add to edit history
      existingLog.editHistory.push({
        editedBy: employee,
        editedAt: now,
        changes: {
          oldWorkLog,
          newWorkLog: workLog.trim(),
        },
        reason: "Employee updated their work log",
      });

      await existingLog.save();

      logger.info(`Work log updated by ${req.user.name} for ${todayStart.toDateString()}`);

      return res.status(200).json({
        message: "Work log updated successfully",
        workLog: existingLog,
      });
    }

    // Create new work log
    const newWorkLog = await WorkLog.create({
      employee,
      date: todayStart,
      workLog: workLog.trim(),
      status: "submitted",
      submittedAt: now,
    });

    logger.info(`Work log submitted by ${req.user.name} for ${todayStart.toDateString()}`);

    res.status(201).json({
      message: "Work log submitted successfully",
      workLog: newWorkLog,
    });
  } catch (error) {
    console.error("Error in submitWorkLog:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Work log for today already exists. Please refresh and try again.",
      });
    }

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
// Save work log as draft (can be saved multiple times)
export const saveDraft = async (req, res) => {
  try {
    const { workLog } = req.body;
    const employee = req.user._id;

    // For drafts, we allow any length (even empty)
    if (workLog && workLog.trim().length > 2000) {
      return res.status(400).json({
        message: "Work log cannot exceed 2000 characters",
      });
    }

    const { start: todayStart, end: todayEnd } = getTodayRangeIST();
    const now = getCurrentISTTime();

    // Check if work log already exists for today
    let existingLog = await WorkLog.findOne({
      employee,
      date: { $gte: todayStart, $lt: todayEnd },
    });

    if (existingLog) {
      // Check if already reviewed
      if (existingLog.status === "reviewed") {
        return res.status(400).json({
          message: "Cannot edit work log after it has been reviewed",
        });
      }

      // Update existing draft
      const oldWorkLog = existingLog.workLog;
      existingLog.workLog = workLog ? workLog.trim() : '';
      existingLog.status = "draft";
      // Don't update submittedAt for drafts

      // Add to edit history
      existingLog.editHistory.push({
        editedBy: employee,
        editedAt: now,
        changes: {
          oldWorkLog,
          newWorkLog: workLog ? workLog.trim() : '',
        },
        reason: "Employee saved draft",
      });

      await existingLog.save();

      logger.info(`Work log draft saved by ${req.user.name} for ${todayStart.toDateString()}`);

      return res.status(200).json({
        message: "Draft saved successfully",
        workLog: existingLog,
      });
    }

    // Create new draft
    const newWorkLog = await WorkLog.create({
      employee,
      date: todayStart,
      workLog: workLog ? workLog.trim() : '',
      status: "draft",
      // No submittedAt for drafts
    });

    logger.info(`Work log draft created by ${req.user.name} for ${todayStart.toDateString()}`);

    res.status(201).json({
      message: "Draft saved successfully",
      workLog: newWorkLog,
    });
  } catch (error) {
    console.error("Error in saveDraft:", error);
    console.error("Error stack:", error.stack);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Work log for today already exists. Please refresh and try again.",
      });
    }

    res.status(500).json({
      message: "Server error",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get today's work log for current user
export const getTodayWorkLog = async (req, res) => {
  try {
    const employee = req.user._id;
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();

    const workLog = await WorkLog.findOne({
      employee,
      date: { $gte: todayStart, $lt: todayEnd },
    }).populate("reviewedBy", "name email");

    if (!workLog) {
      return res.status(404).json({
        message: "No work log found for today",
      });
    }

    res.status(200).json(workLog);
  } catch (error) {
    console.error("Error in getTodayWorkLog:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Check if today's work log is submitted (for clock-out validation)
export const checkWorkLogStatus = async (req, res) => {
  try {
    const employee = req.user._id;
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();

    const workLog = await WorkLog.findOne({
      employee,
      date: { $gte: todayStart, $lt: todayEnd },
      status: "submitted",
    });

    res.status(200).json({
      hasWorkLog: !!workLog,
      workLog: workLog || null,
    });
  } catch (error) {
    console.error("Error in checkWorkLogStatus:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get my work log history with pagination
export const getMyWorkLogs = async (req, res) => {
  try {
    const employee = req.user._id;
    const { startDate, endDate, status, page = 1, limit = 10 } = req.query;

    const query = { employee };

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [workLogs, total] = await Promise.all([
      WorkLog.find(query)
        .populate("reviewedBy", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WorkLog.countDocuments(query),
    ]);

    res.status(200).json({
      workLogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getMyWorkLogs:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all work logs (Admin/HR/Manager)
export const getAllWorkLogs = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      employeeId,
      department,
      status,
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        // Parse the date string and create IST midnight
        const [year, month, day] = startDate.split('-').map(Number);
        const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const start = new Date(startUTC.getTime() - istOffset);
        query.date.$gte = start;
      }
      if (endDate) {
        // Parse the date string and create IST end of day
        const [year, month, day] = endDate.split('-').map(Number);
        const endUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const end = new Date(endUTC.getTime() - istOffset);
        query.date.$lte = end;
      }
      console.log('Date filter:', { startDate, endDate, query: query.date });
    }

    // Employee filter
    if (employeeId) {
      query.employee = employeeId;
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Department filter - need to populate and filter
    let employeeIds = null;
    if (department) {
      const employees = await User.find({ department }).select("_id");
      employeeIds = employees.map((emp) => emp._id);
      query.employee = { $in: employeeIds };
    }

    // Search filter
    if (search) {
      const searchEmployees = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      
      const searchEmployeeIds = searchEmployees.map((emp) => emp._id);
      
      if (query.employee && query.employee.$in) {
        // Intersect with existing employee filter
        query.employee.$in = query.employee.$in.filter((id) =>
          searchEmployeeIds.some((searchId) => searchId.equals(id))
        );
      } else {
        query.employee = { $in: searchEmployeeIds };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [workLogs, total] = await Promise.all([
      WorkLog.find(query)
        .populate({
          path: "employee",
          select: "name email designation department",
          populate: {
            path: "department",
            select: "name"
          }
        })
        .populate("reviewedBy", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WorkLog.countDocuments(query),
    ]);

    console.log('Query result:', { total, workLogsCount: workLogs.length, query });

    res.status(200).json({
      workLogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getAllWorkLogs:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get specific employee's work logs
export const getEmployeeWorkLogs = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, status, page = 1, limit = 10 } = req.query;

    const query = { employee: employeeId };

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [workLogs, total, employee] = await Promise.all([
      WorkLog.find(query)
        .populate("reviewedBy", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WorkLog.countDocuments(query),
      User.findById(employeeId).select("name email designation department"),
    ]);

    res.status(200).json({
      employee,
      workLogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getEmployeeWorkLogs:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Review work log (Admin/HR/Manager)
export const reviewWorkLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const reviewer = req.user;

    const workLog = await WorkLog.findById(id).populate("employee", "name email");

    if (!workLog) {
      return res.status(404).json({
        message: "Work log not found",
      });
    }

    // Check if user can review this log
    if (!workLog.canUserReview(reviewer._id, reviewer.role)) {
      return res.status(403).json({
        message: "You cannot review your own work log",
      });
    }

    // Check if already reviewed
    if (workLog.status === "reviewed") {
      return res.status(400).json({
        message: "Work log has already been reviewed",
      });
    }

    workLog.status = "reviewed";
    workLog.reviewedBy = reviewer._id;
    workLog.reviewedAt = getCurrentISTTime();
    workLog.reviewNotes = reviewNotes?.trim() || "";

    await workLog.save();

    logger.info(`Work log reviewed by ${reviewer.name} for ${workLog.employee.name}`);

    res.status(200).json({
      message: "Work log reviewed successfully",
      workLog,
    });
  } catch (error) {
    console.error("Error in reviewWorkLog:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update work log (Admin/HR/Manager)
export const updateWorkLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { workLog: newWorkLog, reason } = req.body;
    const editor = req.user;

    if (!newWorkLog || newworkLog.trim().length < 50) {
      return res.status(400).json({
        message: "Work log must be at least 50 characters",
      });
    }

    if (newWorkLog.trim().length > 2000) {
      return res.status(400).json({
        message: "Work log cannot exceed 2000 characters",
      });
    }

    const workLogDoc = await WorkLog.findById(id);

    if (!workLogDoc) {
      return res.status(404).json({
        message: "Work log not found",
      });
    }

    const oldWorkLog = workLogDoc.workLog;
    workLogDoc.workLog = newWorkLog.trim();

    // Add to edit history
    workLogDoc.editHistory.push({
      editedBy: editor._id,
      editedAt: getCurrentISTTime(),
      changes: {
        oldWorkLog,
        newWorkLog: newWorkLog.trim(),
      },
      reason: reason || `Edited by ${editor.role}`,
    });

    await workLogDoc.save();

    logger.info(`Work log updated by ${editor.name} (${editor.role})`);

    res.status(200).json({
      message: "Work log updated successfully",
      workLog: workLogDoc,
    });
  } catch (error) {
    console.error("Error in updateWorkLog:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Late submission (after clock-out)
export const lateSubmission = async (req, res) => {
  try {
    const { workLog, date, remark } = req.body;
    const employee = req.user._id;

    if (!workLog || workLog.trim().length < 50) {
      return res.status(400).json({
        message: "Work log must be at least 50 characters",
      });
    }

    if (workLog.trim().length > 2000) {
      return res.status(400).json({
        message: "Work log cannot exceed 2000 characters",
      });
    }

    if (!date) {
      return res.status(400).json({
        message: "Date is required for late submission",
      });
    }

    if (!remark || remark.trim().length < 10) {
      return res.status(400).json({
        message: "Remark is required for late submission (minimum 10 characters)",
      });
    }

    const submissionDate = new Date(date);
    const midnight = getTodayMidnightIST(submissionDate);

    // Check if work log already exists for that date
    const existingLog = await WorkLog.findOne({
      employee,
      date: midnight,
    });

    if (existingLog) {
      return res.status(400).json({
        message: "Work log for this date already exists",
      });
    }

    // Create late submission
    const newWorkLog = await WorkLog.create({
      employee,
      date: midnight,
      workLog: workLog.trim(),
      status: "submitted",
      submittedAt: getCurrentISTTime(),
      isLateSubmission: true,
      lateSubmissionRemark: remark.trim(),
    });

    logger.info(`Late work log submitted by ${req.user.name} for ${submissionDate.toDateString()}`);

    res.status(201).json({
      message: "Late work log submitted successfully",
      workLog: newWorkLog,
    });
  } catch (error) {
    console.error("Error in lateSubmission:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get work log statistics
export const getWorkLogStats = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();

    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Employee filter
    if (employeeId) {
      query.employee = employeeId;
    }

    // Department filter
    if (department) {
      const employees = await User.find({ department }).select("_id");
      const employeeIds = employees.map((emp) => emp._id);
      query.employee = { $in: employeeIds };
    }

    // Get statistics
    const [
      totalLogs,
      submittedLogs,
      reviewedLogs,
      lateSubmissions,
      todayLogs,
      pendingReview,
    ] = await Promise.all([
      WorkLog.countDocuments(query),
      WorkLog.countDocuments({ ...query, status: "submitted" }),
      WorkLog.countDocuments({ ...query, status: "reviewed" }),
      WorkLog.countDocuments({ ...query, isLateSubmission: true }),
      WorkLog.countDocuments({
        ...query,
        date: { $gte: todayStart, $lt: todayEnd },
      }),
      WorkLog.countDocuments({
        ...query,
        status: { $in: ["submitted", "draft"] },
      }),
    ]);

    // Get total employees count
    const employeeQuery = { role: { $in: ["employee", "hr", "hod", "manager"] } };
    if (department) {
      employeeQuery.department = department;
    }
    const totalEmployees = await User.countDocuments(employeeQuery);

    res.status(200).json({
      totalLogs,
      submittedLogs,
      reviewedLogs,
      lateSubmissions,
      todayLogs,
      pendingReview,
      totalEmployees,
    });
  } catch (error) {
    console.error("Error in getWorkLogStats:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Export work logs to Excel
export const exportWorkLogs = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department, status, search } = req.query;

    console.log('Export request params:', { startDate, endDate, employeeId, department, status, search });

    const query = {};

    // Date range filter (same as getAllWorkLogs - with IST handling)
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        // Parse the date string and create IST midnight
        const [year, month, day] = startDate.split('-').map(Number);
        const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const start = new Date(startUTC.getTime() - istOffset);
        query.date.$gte = start;
      }
      if (endDate) {
        // Parse the date string and create IST end of day
        const [year, month, day] = endDate.split('-').map(Number);
        const endUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const end = new Date(endUTC.getTime() - istOffset);
        query.date.$lte = end;
      }
      console.log('Export date filter:', { startDate, endDate, queryDate: query.date });
    }

    // Exclude draft status - only export submitted and reviewed logs
    query.status = { $in: ['submitted', 'reviewed'] };

    // Employee filter
    if (employeeId) {
      query.employee = employeeId;
    }

    // Status filter (override the default if specified)
    if (status && status !== "all") {
      query.status = status;
    }

    // Department filter
    if (department) {
      const employees = await User.find({ department }).select("_id");
      const employeeIds = employees.map((emp) => emp._id);
      query.employee = { $in: employeeIds };
    }

    // Search filter
    if (search) {
      const searchEmployees = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      
      const searchEmployeeIds = searchEmployees.map((emp) => emp._id);
      
      if (query.employee && query.employee.$in) {
        // Intersect with existing employee filter
        query.employee.$in = query.employee.$in.filter((id) =>
          searchEmployeeIds.some((searchId) => searchId.equals(id))
        );
      } else {
        query.employee = { $in: searchEmployeeIds };
      }
    }

    console.log('Export final query:', JSON.stringify(query, null, 2));

    console.log('Export final query:', JSON.stringify(query, null, 2));

    const workLogs = await WorkLog.find(query)
      .populate({
        path: "employee",
        select: "name email designation department",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("reviewedBy", "name email")
      .sort({ date: -1 })
      .lean();

    console.log('Export query result:', { 
      total: workLogs.length, 
      firstLog: workLogs[0] ? { 
        date: workLogs[0].date, 
        employee: workLogs[0].employee?.name,
        status: workLogs[0].status 
      } : 'none'
    });

    if (workLogs.length === 0) {
      console.log('No work logs found for export with query:', query);
    }

    // Format data for Excel
    const excelData = workLogs.map((log) => ({
      Date: new Date(log.date).toLocaleDateString("en-IN"),
      "Employee Name": log.employee?.name || "N/A",
      Email: log.employee?.email || "N/A",
      Designation: log.employee?.designation || "N/A",
      Department: (typeof log.employee?.department === 'object' ? log.employee?.department?.name : log.employee?.department) || "N/A",
      "Work Log": log.workLog,
      Status: log.status,
      "Submitted At": log.submittedAt
        ? new Date(log.submittedAt).toLocaleString("en-IN")
        : "N/A",
      "Reviewed By": log.reviewedBy?.name || "N/A",
      "Reviewed At": log.reviewedAt
        ? new Date(log.reviewedAt).toLocaleString("en-IN")
        : "N/A",
      "Review Notes": log.reviewNotes || "N/A",
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Employee Name
      { wch: 25 }, // Email
      { wch: 20 }, // Designation
      { wch: 15 }, // Department
      { wch: 50 }, // Work Log
      { wch: 12 }, // Status
      { wch: 20 }, // Submitted At
      { wch: 20 }, // Reviewed By
      { wch: 20 }, // Reviewed At
      { wch: 30 }, // Review Notes
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Work Logs");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=work-logs-${new Date().toISOString().split("T")[0]}.xlsx`
    );

    res.send(buffer);
  } catch (error) {
    console.error("Error in exportWorkLogs:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

