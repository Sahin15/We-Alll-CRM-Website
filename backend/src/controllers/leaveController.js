import LeaveRequest from "../models/leaveRequestModel.js";
import User from "../models/userModel.js";
import NotificationService from "../services/notificationService.js";
import { getLeaveRequestDays } from "../utils/leaveDays.js";
import {
  normalizeLeaveTypeForCreate,
} from "../constants/leaveTypes.js";
import { ANNUAL_EARNED_LEAVE_LIMIT } from "../constants/leaveCategoryLimits.js";
import { getCurrentLeaveYear } from "../utils/leaveAccrual.js";
import { getISTDateKey, getISTMidnightForYmd } from "../utils/timezone.js";
import { getISTDayBounds } from "../utils/attendanceISTDay.js";

// Create leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const employee = req.user.id;
    const files = req.files || [];

    

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedLeaveType = normalizeLeaveTypeForCreate(leaveType);

    if (!['medical', 'casual', 'half_day', 'unpaid', 'work_from_home'].includes(normalizedLeaveType)) {
      return res.status(400).json({ message: "Invalid leave type. Use medical, casual, or half day." });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start > end) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    if (normalizedLeaveType === "half_day") {
      const sameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();
      if (!sameDay) {
        return res.status(400).json({ message: "Half-day leave must be for a single date" });
      }
    }

    const employeeUser = await User.findById(employee).select('employmentType internshipDetails');

    if (
      !LeaveRequest.isFullTimeEmployee(employeeUser) &&
      normalizedLeaveType !== 'unpaid' &&
      normalizedLeaveType !== 'work_from_home'
    ) {
      return res.status(400).json({
        message:
          'Only unpaid leave is available for your employment type. Earned leave applies to full-time employees only.',
      });
    }

    const numberOfDays = getLeaveRequestDays(normalizedLeaveType, start, end);

    // Check leave balance (skip for unpaid leave and work from home)
    if (normalizedLeaveType !== 'unpaid' && normalizedLeaveType !== 'work_from_home') {
      try {
        await LeaveRequest.validateLeaveRequest(employee, normalizedLeaveType, numberOfDays);
      } catch (balanceError) {
        return res.status(400).json({ message: balanceError.message });
      }
    }

    // Upload attachments to S3 if any
    const attachmentUrls = [];
    if (files && files.length > 0) {
      const { uploadDocumentToS3 } = await import("../utils/documentUpload.js");
      
      for (const file of files) {
        try {
          const documentUrl = await uploadDocumentToS3(
            file.buffer,
            file.originalname,
            file.mimetype,
            "leave-attachments"
          );
          attachmentUrls.push(documentUrl);
        } catch (uploadError) {
          
          return res.status(400).json({ 
            message: `Failed to upload attachment "${file.originalname}": ${uploadError.message}` 
          });
        }
      }
    }

    const leaveRequest = await LeaveRequest.create({
      employee,
      leaveType: normalizedLeaveType,
      startDate,
      endDate,
      reason,
      attachments: attachmentUrls,
      numberOfDays,
      leaveYear: parseInt(getISTDateKey(start).slice(0, 4), 10),
    });

    

    // Send notification to manager/HR
    try {
      const employeeData = await User.findById(employee).populate('reportingManager department');
      
      
      // Send to reporting manager if exists
      if (employeeData.reportingManager) {
        
        await NotificationService.sendToUser(
          employeeData.reportingManager._id,
          '≡ƒôï New Leave Request',
          `${employeeData.name} has requested ${normalizedLeaveType} leave`,
          {
            type: 'leave_request',
            data: { leaveRequestId: leaveRequest._id.toString() },
            actionUrl: '/leaves',
            senderId: employee,
          }
        );
      }
      
      // Also send to HR department
      
      await NotificationService.sendToRole('hr',
        '≡ƒôï New Leave Request',
        `${employeeData.name} has requested ${normalizedLeaveType} leave for ${numberOfDays} day(s)`,
        {
          type: 'leave_request',
          data: { leaveRequestId: leaveRequest._id.toString() },
          actionUrl: '/leaves',
          senderId: employee,
        }
      );
      
      
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest,
    });
  } catch (error) {
    
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => error.errors[key].message) : []
    });
  }
};

// Get leave balance for an employee
export const getLeaveBalance = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user.id;
    const year = parseInt(req.query.year, 10) || getCurrentLeaveYear();

    // Check if user can access this employee's data
    if (employeeId !== req.user.id && !['admin', 'superadmin', 'hr', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const balance = await LeaveRequest.getLeaveBalance(employeeId, year);
    
    res.status(200).json({
      employeeId,
      year,
      balance
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get leave usage summary for HR (shows usage ratio like 1/24, 2/24)
export const getLeaveUsageSummary = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const year = parseInt(req.query.year, 10) || getCurrentLeaveYear();

    // Check if user can access this data
    if (!['admin', 'superadmin', 'hr', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const yearStart = getISTMidnightForYmd(year, 1, 1);
    const yearEnd = getISTMidnightForYmd(year + 1, 1, 1);

    // Get all approved leaves for the employee in chronological order
    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: 'approved',
      startDate: { $gte: yearStart, $lt: yearEnd },
    }).sort({ startDate: 1 });

    // Calculate cumulative usage
    let cumulativeUsed = 0;
    const leaveHistory = approvedLeaves
      .filter(leave => leave.leaveType !== 'unpaid' && leave.leaveType !== 'work_from_home') // Exclude unpaid and WFH leaves
      .map(leave => {
        cumulativeUsed += leave.numberOfDays;
        return {
          leaveId: leave._id,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          numberOfDays: leave.numberOfDays,
          usageRatio: `${cumulativeUsed}/24`,
          cumulativeUsed: cumulativeUsed
        };
      });

    // Get current balance
    const balance = await LeaveRequest.getLeaveBalance(employeeId, year);

    res.status(200).json({
      employeeId,
      year,
      balance,
      leaveHistory,
      summary: {
        totalEarned: balance.earned.earned,
        totalUsed: balance.earned.used,
        totalRemaining: balance.earned.remaining,
        currentRatio: `${balance.earned.used}/${ANNUAL_EARNED_LEAVE_LIMIT}`,
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Bulk usage summaries for HR leave table (one request instead of N per employee)
export const getBulkLeaveUsageSummaries = async (req, res) => {
  try {
    if (!["admin", "superadmin", "hr", "hod"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const year = parseInt(req.query.year, 10) || getCurrentLeaveYear();
    const employeeIds = String(req.query.employeeIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (employeeIds.length > 500) {
      return res.status(400).json({ message: "Too many employee IDs (max 500)" });
    }

    if (!employeeIds.length) {
      return res.status(200).json({ year, summaries: {} });
    }

    const balances = await LeaveRequest.getBulkLeaveBalances(employeeIds, year);
    const summaries = {};

    for (const [empId, balance] of Object.entries(balances)) {
      summaries[empId] = {
        balance,
        summary: {
          totalEarned: balance.earned.earned,
          totalUsed: balance.earned.used,
          totalRemaining: balance.earned.remaining,
          currentRatio: `${balance.earned.used}/${ANNUAL_EARNED_LEAVE_LIMIT}`,
        },
      };
    }

    res.status(200).json({ year, summaries });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all leave requests (Admin/HR)
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, year, leaveType, employeeId } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (year) filter.leaveYear = parseInt(year);
    if (leaveType) filter.leaveType = leaveType;
    if (employeeId) filter.employee = employeeId;

    if (req.user.role === "hod" && req.user.department && !employeeId) {
      const departmentEmployees = await User.find({ department: req.user.department })
        .select("_id")
        .lean();
      filter.employee = { $in: departmentEmployees.map((emp) => emp._id) };
    }

    const leaveRequests = await LeaveRequest.find(filter)
      .populate({
        path: "employee",
        select: "name email designation employeeId department employmentType",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(leaveRequests);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get employee's own leave requests
export const getMyLeaveRequests = async (req, res) => {
  try {
    const employee = req.user.id;

    const leaveRequests = await LeaveRequest.find({ employee })
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(leaveRequests);
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get leave request by ID
export const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate({
        path: "employee",
        select: "name email designation employeeId department employmentType",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("approvedBy", "name email");

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    res.status(200).json(leaveRequest);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve leave request
export const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalComment } = req.body;
    const approvedBy = req.user.id;

    

    const leaveRequest = await LeaveRequest.findById(id).populate('employee', 'name email department');

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Only pending leave requests can be approved",
      });
    }

    // Check if employee is from HR department
    if (leaveRequest.employee.department) {
      const Department = (await import("../models/departmentModel.js")).default;
      const employeeDept = await Department.findById(leaveRequest.employee.department);
      
      // If employee is from HR department, only admin/superadmin can approve
      if (employeeDept && employeeDept.name === 'HR') {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
          return res.status(403).json({
            message: "Only Admin can approve leave requests for HR department employees",
          });
        }
      }
    }

    leaveRequest.status = "approved";
    leaveRequest.approvedBy = approvedBy;
    leaveRequest.approvedDate = new Date();
    if (approvalComment) {
      leaveRequest.rejectionReason = approvalComment; // Reusing field for approval comments
    }

    await leaveRequest.save();

    // Create attendance records for the leave period with "on-leave" status
    try {
      const Attendance = (await import("../models/attendanceModel.js")).default;
      
      const startDate = new Date(leaveRequest.startDate);
      const endDate = new Date(leaveRequest.endDate);
      
      // Loop through each IST calendar day in the leave period
      const currentDate = new Date(startDate);
      let recordsCreated = 0;
      let recordsUpdated = 0;
      
      while (currentDate <= endDate) {
        const ymd = getISTDateKey(currentDate);
        const [year, month, day] = ymd.split("-").map(Number);
        const istMidnight = getISTMidnightForYmd(year, month, day);
        const { start: dayStart, endExclusive: dayEnd } = getISTDayBounds(ymd);
        
        // Match either UTC-midnight or IST-midnight storage for this IST day
        const existingRecord = await Attendance.findOne({
          employee: leaveRequest.employee,
          date: {
            $gte: dayStart,
            $lt: dayEnd,
          }
        });
        
        if (!existingRecord) {
          await Attendance.create({
            employee: leaveRequest.employee,
            date: istMidnight,
            status: 'on-leave',
            workHours: 0,
            overtime: 0,
            notes: `On ${leaveRequest.leaveType} leave (Approved by ${approvedBy})`,
            approvedBy: approvedBy,
            isManuallyModified: true,
            originalStatus: 'on-leave'
          });
          
          recordsCreated++;
        } else {
          await Attendance.findByIdAndUpdate(
            existingRecord._id,
            {
              status: 'on-leave',
              clockIn: undefined,
              clockOut: undefined,
              workHours: 0,
              overtime: 0,
              breaks: [],
              totalBreakTime: 0,
              notes: `On ${leaveRequest.leaveType} leave (Approved by ${approvedBy})`,
              approvedBy: approvedBy,
              isManuallyModified: true,
              originalStatus: existingRecord.status
            },
            { new: true }
          );
          
          recordsUpdated++;
        }
        
        currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
      
    } catch (attendanceError) {
      // Don't fail the approval if attendance creation fails
    }

    // Send notification to employee
    try {
      const employeeData = await User.findById(leaveRequest.employee);
      if (employeeData) {
        await NotificationService.sendToUser(
          employeeData._id,
          'Γ£à Leave Request Approved',
          `Your ${leaveRequest.leaveType} leave request has been approved`,
          {
            type: 'leave_approval',
            data: { leaveRequestId: leaveRequest._id.toString() },
            actionUrl: '/leaves',
            senderId: approvedBy,
          }
        );
        
      }
    } catch (notificationError) {
      
    }

    res.status(200).json({
      message: "Leave request approved successfully",
      leaveRequest,
    });
  } catch (error) {
    
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: error.stack 
    });
  }
};

// Reject leave request
export const rejectLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const approvedBy = req.user.id;

    

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const leaveRequest = await LeaveRequest.findById(id).populate('employee', 'name email department');

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Only pending leave requests can be rejected",
      });
    }

    // Check if employee is from HR department
    if (leaveRequest.employee.department) {
      const Department = (await import("../models/departmentModel.js")).default;
      const employeeDept = await Department.findById(leaveRequest.employee.department);
      
      // If employee is from HR department, only admin/superadmin can reject
      if (employeeDept && employeeDept.name === 'HR') {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
          return res.status(403).json({
            message: "Only Admin can reject leave requests for HR department employees",
          });
        }
      }
    }

    leaveRequest.status = "rejected";
    leaveRequest.approvedBy = approvedBy;
    leaveRequest.rejectionReason = rejectionReason;
    leaveRequest.approvedDate = new Date();

    await leaveRequest.save();

    // Send notification to employee
    try {
      const employeeData = await User.findById(leaveRequest.employee);
      if (employeeData) {
        await NotificationService.sendToUser(
          employeeData._id,
          'Γ¥î Leave Request Rejected',
          `Your ${leaveRequest.leaveType} leave request has been rejected`,
          {
            type: 'leave_rejection',
            data: { leaveRequestId: leaveRequest._id.toString(), rejectionReason },
            actionUrl: '/leaves',
            senderId: req.user._id,
          }
        );
        
      }
    } catch (notificationError) {
      
    }

    res.status(200).json({
      message: "Leave request rejected",
      leaveRequest,
    });
  } catch (error) {
    
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: error.stack 
    });
  }
};

// Cancel leave request (Employee)
export const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = req.user.id;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Check if the leave request belongs to the employee
    if (leaveRequest.employee.toString() !== employee) {
      return res
        .status(403)
        .json({ message: "You can only cancel your own leave requests" });
    }

    if (leaveRequest.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Leave request is already cancelled" });
    }

    leaveRequest.status = "cancelled";
    await leaveRequest.save();

    res.status(200).json({
      message: "Leave request cancelled successfully",
      leaveRequest,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Update leave request (before approval)
export const updateLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveType, startDate, endDate, reason } = req.body;
    const employee = req.user.id;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Check if the leave request belongs to the employee
    if (leaveRequest.employee.toString() !== employee) {
      return res
        .status(403)
        .json({ message: "You can only update your own leave requests" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Only pending leave requests can be updated",
      });
    }

    if (leaveType) {
      const normalized = normalizeLeaveTypeForCreate(leaveType);
      if (!['medical', 'casual', 'unpaid'].includes(normalized)) {
        return res.status(400).json({ message: "Invalid leave type. Use medical or casual." });
      }
      leaveRequest.leaveType = normalized;
    }
    if (startDate) leaveRequest.startDate = startDate;
    if (endDate) leaveRequest.endDate = endDate;
    if (reason) leaveRequest.reason = reason;

    const employeeUser = await User.findById(employee).select('employmentType internshipDetails');
    const effectiveLeaveType = leaveRequest.leaveType;

    if (
      !LeaveRequest.isFullTimeEmployee(employeeUser) &&
      effectiveLeaveType !== 'unpaid'
    ) {
      return res.status(400).json({
        message:
          'Only unpaid leave is available for your employment type. Earned leave applies to full-time employees only.',
      });
    }

    const start = new Date(leaveRequest.startDate);
    const end = new Date(leaveRequest.endDate);
    const numberOfDays = getLeaveRequestDays(
      effectiveLeaveType,
      leaveRequest.startDate,
      leaveRequest.endDate
    );

    if (effectiveLeaveType !== 'unpaid') {
      try {
        await LeaveRequest.validateLeaveRequest(
          employee,
          effectiveLeaveType,
          numberOfDays,
          parseInt(getISTDateKey(start).slice(0, 4), 10)
        );
      } catch (balanceError) {
        return res.status(400).json({ message: balanceError.message });
      }
    }

    await leaveRequest.save();

    res.status(200).json({
      message: "Leave request updated successfully",
      leaveRequest,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};
