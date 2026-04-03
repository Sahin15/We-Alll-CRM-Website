import WorkOnLeaveDayRequest from "../models/workOnLeaveDayRequestModel.js";
import LeaveRequest from "../models/leaveRequestModel.js";
import Attendance from "../models/attendanceModel.js";
import { getTodayRangeIST, getCurrentISTTime } from '../utils/timezone.js';

// Create work on leave day request (when employee tries to clock in on leave day)
export const createWorkOnLeaveDayRequest = async (req, res) => {
  try {
    const { date, leaveRequestId, reason } = req.body;
    const employee = req.user._id;

    if (!date || !leaveRequestId || !reason) {
      return res.status(400).json({ 
        message: "Date, leave request ID, and reason are required" 
      });
    }

    // Verify the leave request exists and is approved
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "approved") {
      return res.status(400).json({ message: "Leave request is not approved" });
    }

    if (leaveRequest.employee.toString() !== employee.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Check if request already exists for this date
    const requestDate = new Date(date);
    const existingRequest = await WorkOnLeaveDayRequest.findOne({
      employee,
      date: {
        $gte: new Date(requestDate.setHours(0, 0, 0, 0)),
        $lt: new Date(requestDate.setHours(23, 59, 59, 999)),
      },
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: "Request already exists for this date",
        request: existingRequest
      });
    }

    // Create the request
    const workOnLeaveDayRequest = await WorkOnLeaveDayRequest.create({
      employee,
      date: new Date(date),
      leaveRequest: leaveRequestId,
      reason,
    });

    const populatedRequest = await WorkOnLeaveDayRequest.findById(workOnLeaveDayRequest._id)
      .populate("employee", "name email department")
      .populate("leaveRequest", "leaveType startDate endDate")
      .populate("reviewedBy", "name email");

    res.status(201).json({
      message: "Work on leave day request submitted successfully. Waiting for HR approval.",
      request: populatedRequest,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all work on leave day requests (HR/Admin)
export const getAllWorkOnLeaveDayRequests = async (req, res) => {
  try {
    const { status, employee } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (employee) filter.employee = employee;

    const requests = await WorkOnLeaveDayRequest.find(filter)
      .populate("employee", "name email department")
      .populate("leaveRequest", "leaveType startDate endDate numberOfDays")
      .populate("reviewedBy", "name email")
      .populate("attendanceRecord", "clockIn clockOut status")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get my work on leave day requests (Employee)
export const getMyWorkOnLeaveDayRequests = async (req, res) => {
  try {
    const employee = req.user._id;

    const requests = await WorkOnLeaveDayRequest.find({ employee })
      .populate("leaveRequest", "leaveType startDate endDate numberOfDays")
      .populate("reviewedBy", "name email")
      .populate("attendanceRecord", "clockIn clockOut status")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve work on leave day request (HR/Admin)
export const approveWorkOnLeaveDayRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelLeave } = req.body; // Boolean: whether to cancel the leave for this day
    const reviewedBy = req.user._id;

    const request = await WorkOnLeaveDayRequest.findById(id)
      .populate("employee", "name email")
      .populate("leaveRequest");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request has already been reviewed" });
    }

    // Update request status
    request.status = "approved";
    request.reviewedBy = reviewedBy;
    request.reviewedAt = getCurrentISTTime();

    // If HR chooses to cancel the leave for this day
    if (cancelLeave) {
      const leaveRequest = request.leaveRequest;
      const requestDate = new Date(request.date);
      
      // Check if this is a single-day leave
      const leaveStartDate = new Date(leaveRequest.startDate);
      const leaveEndDate = new Date(leaveRequest.endDate);
      
      leaveStartDate.setHours(0, 0, 0, 0);
      leaveEndDate.setHours(0, 0, 0, 0);
      requestDate.setHours(0, 0, 0, 0);
      
      const isSingleDayLeave = leaveStartDate.getTime() === leaveEndDate.getTime();
      
      if (isSingleDayLeave) {
        // Cancel the entire leave request
        leaveRequest.status = "cancelled";
        await leaveRequest.save();
        request.leaveCancelled = true;
        
        
      } else {
        // Multi-day leave: adjust the leave dates
        if (requestDate.getTime() === leaveStartDate.getTime()) {
          // Working on first day - move start date forward
          const newStartDate = new Date(leaveStartDate);
          newStartDate.setDate(newStartDate.getDate() + 1);
          leaveRequest.startDate = newStartDate;
          await leaveRequest.save();
          request.leaveCancelled = true;
          
          
        } else if (requestDate.getTime() === leaveEndDate.getTime()) {
          // Working on last day - move end date backward
          const newEndDate = new Date(leaveEndDate);
          newEndDate.setDate(newEndDate.getDate() - 1);
          leaveRequest.endDate = newEndDate;
          await leaveRequest.save();
          request.leaveCancelled = true;
          
          
        } else {
          // Working on a middle day - this is complex, requires splitting the leave
          // For now, we'll just mark it but not auto-cancel
          
          request.leaveCancelled = false;
        }
      }
    }

    await request.save();

    // Create or update attendance record for this day
    const { start: dayStart, end: dayEnd } = getTodayRangeIST();
    const requestDateStart = new Date(request.date);
    requestDateStart.setHours(0, 0, 0, 0);
    const requestDateEnd = new Date(requestDateStart);
    requestDateEnd.setDate(requestDateEnd.getDate() + 1);

    let attendance = await Attendance.findOne({
      employee: request.employee._id,
      date: {
        $gte: requestDateStart,
        $lt: requestDateEnd,
      },
    });

    if (attendance) {
      // Update existing attendance record
      if (attendance.status === "on-leave") {
        // Change from on-leave to present/late/half-day based on clock-in time
        attendance.status = attendance.calculateStatus();
      }
      request.attendanceRecord = attendance._id;
      await request.save();
    }

    const populatedRequest = await WorkOnLeaveDayRequest.findById(id)
      .populate("employee", "name email department")
      .populate("leaveRequest", "leaveType startDate endDate numberOfDays status")
      .populate("reviewedBy", "name email")
      .populate("attendanceRecord", "clockIn clockOut status");

    res.status(200).json({
      message: "Work on leave day request approved successfully",
      request: populatedRequest,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject work on leave day request (HR/Admin)
export const rejectWorkOnLeaveDayRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const reviewedBy = req.user._id;

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const request = await WorkOnLeaveDayRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request has already been reviewed" });
    }

    request.status = "rejected";
    request.reviewedBy = reviewedBy;
    request.reviewedAt = getCurrentISTTime();
    request.rejectionReason = rejectionReason;

    await request.save();

    // If there's an attendance record, delete it or mark as absent
    if (request.attendanceRecord) {
      await Attendance.findByIdAndDelete(request.attendanceRecord);
    }

    const populatedRequest = await WorkOnLeaveDayRequest.findById(id)
      .populate("employee", "name email department")
      .populate("leaveRequest", "leaveType startDate endDate")
      .populate("reviewedBy", "name email");

    res.status(200).json({
      message: "Work on leave day request rejected",
      request: populatedRequest,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Check if employee has pending work on leave day request for today
export const checkTodayWorkOnLeaveRequest = async (req, res) => {
  try {
    const employee = req.user._id;
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();

    const request = await WorkOnLeaveDayRequest.findOne({
      employee,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    })
      .populate("leaveRequest", "leaveType startDate endDate")
      .populate("reviewedBy", "name email");

    if (!request) {
      return res.status(200).json({ hasRequest: false, request: null });
    }

    res.status(200).json({ hasRequest: true, request });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  createWorkOnLeaveDayRequest,
  getAllWorkOnLeaveDayRequests,
  getMyWorkOnLeaveDayRequests,
  approveWorkOnLeaveDayRequest,
  rejectWorkOnLeaveDayRequest,
  checkTodayWorkOnLeaveRequest,
};
