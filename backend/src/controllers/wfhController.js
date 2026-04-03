import WFHRequest from "../models/wfhRequestModel.js";
import User from "../models/userModel.js";
import Attendance from "../models/attendanceModel.js";
import { buildDateRangeQuery } from "../utils/queryOptimizer.js";
import NotificationService from "../services/notificationService.js";

// @desc    Apply for Work From Home
// @route   POST /api/wfh/apply
// @access  Private (Employee)
export const applyWFH = async (req, res) => {
  try {
    const { date, reason } = req.body;
    const employeeId = req.user._id;

    if (!date || !reason) {
      return res.status(400).json({
        success: false,
        message: "Date and reason are required",
      });
    }

    // Parse date to start of day in IST
    const wfhDate = new Date(date);
    wfhDate.setHours(0, 0, 0, 0);

    // Check if WFH request already exists for this date
    const existingRequest = await WFHRequest.findOne({
      employee: employeeId,
      date: wfhDate,
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "WFH request already exists for this date",
      });
    }

    // Create WFH request
    const wfhRequest = await WFHRequest.create({
      employee: employeeId,
      date: wfhDate,
      reason: reason.trim(),
      status: "pending",
    });

    await wfhRequest.populate("employee", "name email employeeId");

    // SEND NOTIFICATION TO MANAGER
    try {
      const employee = await User.findById(employeeId).select('name reportingManager');
      const employeeName = employee?.name || 'Employee';
      
      // Get reporting manager
      if (employee?.reportingManager) {
        await NotificationService.sendToUser(
          employee.reportingManager,
          '🏠 WFH Request Submitted',
          `${employeeName} submitted a WFH request for ${wfhDate.toDateString()}`,
          {
            type: 'wfh_request_submitted',
            data: {
              wfhRequestId: wfhRequest._id.toString(),
              employeeId: employeeId.toString(),
              employeeName,
              date: wfhDate,
              reason: reason.trim(),
            },
            actionUrl: `/wfh/requests`,
            senderId: employeeId,
          }
        );
        
      }
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      message: "WFH request submitted successfully",
      data: wfhRequest,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to submit WFH request",
      error: error.message,
    });
  }
};

// @desc    Get my WFH requests
// @route   GET /api/wfh/my-requests
// @access  Private (Employee)
export const getMyWFHRequests = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { status, startDate, endDate } = req.query;

    const query = { employee: employeeId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      const dateRangeFilter = buildDateRangeQuery(startDate, endDate, 'date');
      Object.assign(query, dateRangeFilter);
    }

    const requests = await WFHRequest.find(query)
      .populate("employee", "name email employeeId")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch WFH requests",
      error: error.message,
    });
  }
};

// @desc    Get all WFH requests (for HR/Admin)
// @route   GET /api/wfh/all
// @access  Private (HR/Admin)
export const getAllWFHRequests = async (req, res) => {
  try {
    const { status, startDate, endDate, employeeId } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    if (startDate || endDate) {
      const dateRangeFilter = buildDateRangeQuery(startDate, endDate, 'date');
      Object.assign(query, dateRangeFilter);
    }

    const requests = await WFHRequest.find(query)
      .populate("employee", "name email employeeId department")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch WFH requests",
      error: error.message,
    });
  }
};

// @desc    Get pending WFH requests (for HR/Admin)
// @route   GET /api/wfh/pending
// @access  Private (HR/Admin)
export const getPendingWFHRequests = async (req, res) => {
  try {
    const requests = await WFHRequest.find({ status: "pending" })
      .populate("employee", "name email employeeId department")
      .sort({ date: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending WFH requests",
      error: error.message,
    });
  }
};

// @desc    Approve WFH request
// @route   PUT /api/wfh/:id/approve
// @access  Private (HR/Admin)
export const approveWFHRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const wfhRequest = await WFHRequest.findById(id).populate('employee', 'name email employeeId department');

    if (!wfhRequest) {
      return res.status(404).json({
        success: false,
        message: "WFH request not found",
      });
    }

    if (wfhRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `WFH request is already ${wfhRequest.status}`,
      });
    }

    // Check if employee is from HR department
    if (wfhRequest.employee.department) {
      const Department = (await import("../models/departmentModel.js")).default;
      const employeeDept = await Department.findById(wfhRequest.employee.department);
      
      // If employee is from HR department, only admin/superadmin can approve
      if (employeeDept && employeeDept.name === 'HR') {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
          return res.status(403).json({
            success: false,
            message: "Only Admin can approve WFH requests for HR department employees",
          });
        }
      }
    }

    wfhRequest.status = "approved";
    wfhRequest.approvedBy = req.user._id;
    wfhRequest.approvedAt = new Date();

    await wfhRequest.save();

    await wfhRequest.populate("employee", "name email employeeId");
    await wfhRequest.populate("approvedBy", "name email");

    // SEND NOTIFICATION TO EMPLOYEE
    try {
      const approver = await User.findById(req.user._id).select('name');
      const approverName = approver?.name || 'Manager';
      const employeeName = wfhRequest.employee?.name || 'Employee';
      
      await NotificationService.sendToUser(
        wfhRequest.employee._id,
        '✅ WFH Request Approved',
        `Your WFH request for ${wfhRequest.date.toDateString()} has been approved by ${approverName}`,
        {
          type: 'wfh_request_approved',
          data: {
            wfhRequestId: wfhRequest._id.toString(),
            date: wfhRequest.date,
            approvedBy: approverName,
            approvedAt: wfhRequest.approvedAt,
          },
          actionUrl: `/wfh/my-requests`,
          senderId: req.user._id,
        }
      );
      
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      message: "WFH request approved successfully",
      data: wfhRequest,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to approve WFH request",
      error: error.message,
    });
  }
};

// @desc    Reject WFH request
// @route   PUT /api/wfh/:id/reject
// @access  Private (HR/Admin)
export const rejectWFHRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const wfhRequest = await WFHRequest.findById(id).populate('employee', 'name email employeeId department');

    if (!wfhRequest) {
      return res.status(404).json({
        success: false,
        message: "WFH request not found",
      });
    }

    if (wfhRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `WFH request is already ${wfhRequest.status}`,
      });
    }

    // Check if employee is from HR department
    if (wfhRequest.employee.department) {
      const Department = (await import("../models/departmentModel.js")).default;
      const employeeDept = await Department.findById(wfhRequest.employee.department);
      
      // If employee is from HR department, only admin/superadmin can reject
      if (employeeDept && employeeDept.name === 'HR') {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
          return res.status(403).json({
            success: false,
            message: "Only Admin can reject WFH requests for HR department employees",
          });
        }
      }
    }

    wfhRequest.status = "rejected";
    wfhRequest.rejectedBy = req.user._id;
    wfhRequest.rejectedAt = new Date();
    wfhRequest.rejectionReason = reason.trim();

    await wfhRequest.save();

    await wfhRequest.populate("employee", "name email employeeId");
    await wfhRequest.populate("rejectedBy", "name email");

    // SEND NOTIFICATION TO EMPLOYEE
    try {
      const rejector = await User.findById(req.user._id).select('name');
      const rejectorName = rejector?.name || 'Manager';
      const employeeName = wfhRequest.employee?.name || 'Employee';
      
      await NotificationService.sendToUser(
        wfhRequest.employee._id,
        '❌ WFH Request Rejected',
        `Your WFH request for ${wfhRequest.date.toDateString()} was rejected. Reason: ${reason}`,
        {
          type: 'wfh_request_rejected',
          data: {
            wfhRequestId: wfhRequest._id.toString(),
            date: wfhRequest.date,
            rejectedBy: rejectorName,
            rejectionReason: reason,
            rejectedAt: wfhRequest.rejectedAt,
          },
          actionUrl: `/wfh/requests`,
          senderId: req.user._id,
        }
      );
      
    } catch (notificationError) {
      
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      message: "WFH request rejected",
      data: wfhRequest,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to reject WFH request",
      error: error.message,
    });
  }
};

// @desc    Cancel WFH request (by employee)
// @route   DELETE /api/wfh/:id
// @access  Private (Employee - own requests only)
export const cancelWFHRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user._id;

    const wfhRequest = await WFHRequest.findById(id);

    if (!wfhRequest) {
      return res.status(404).json({
        success: false,
        message: "WFH request not found",
      });
    }

    // Check if request belongs to the employee
    if (wfhRequest.employee.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own WFH requests",
      });
    }

    // Can only cancel pending requests
    if (wfhRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ${wfhRequest.status} WFH request`,
      });
    }

    await wfhRequest.deleteOne();

    res.status(200).json({
      success: true,
      message: "WFH request cancelled successfully",
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to cancel WFH request",
      error: error.message,
    });
  }
};

// @desc    Check if employee has approved WFH for a date
// @route   GET /api/wfh/check/:date
// @access  Private (Employee)
export const checkWFHStatus = async (req, res) => {
  try {
    const { date } = req.params;
    const employeeId = req.user._id;

    const wfhDate = new Date(date);
    wfhDate.setHours(0, 0, 0, 0);

    const wfhRequest = await WFHRequest.findOne({
      employee: employeeId,
      date: wfhDate,
    });

    res.status(200).json({
      success: true,
      hasWFH: !!wfhRequest,
      status: wfhRequest?.status || null,
      data: wfhRequest || null,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to check WFH status",
      error: error.message,
    });
  }
};

// @desc    Get WFH statistics
// @route   GET /api/wfh/statistics
// @access  Private (HR/Admin)
export const getWFHStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      const dateRangeFilter = buildDateRangeQuery(startDate, endDate, 'date');
      Object.assign(query, dateRangeFilter);
    }

    const [total, pending, approved, rejected] = await Promise.all([
      WFHRequest.countDocuments(query),
      WFHRequest.countDocuments({ ...query, status: "pending" }),
      WFHRequest.countDocuments({ ...query, status: "approved" }),
      WFHRequest.countDocuments({ ...query, status: "rejected" }),
    ]);

    // Get top WFH users
    const topUsers = await WFHRequest.aggregate([
      { $match: { ...query, status: "approved" } },
      {
        $group: {
          _id: "$employee",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          name: "$employee.name",
          email: "$employee.email",
          employeeId: "$employee.employeeId",
          count: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        approvalRate: total > 0 ? ((approved / total) * 100).toFixed(2) : 0,
        topUsers,
      },
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch WFH statistics",
      error: error.message,
    });
  }
};
