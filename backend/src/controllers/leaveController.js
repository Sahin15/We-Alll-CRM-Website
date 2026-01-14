import LeaveRequest from "../models/leaveRequestModel.js";

// Create leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const employee = req.user.id;
    const files = req.files || [];

    console.log("📝 Creating leave request:", { leaveType, startDate, endDate, reason, employee, filesCount: files.length });

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate leave type
    if (!['personal', 'medical', 'vacation', 'unpaid'].includes(leaveType)) {
      return res.status(400).json({ message: "Invalid leave type" });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start > end) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    // Calculate number of days
    const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Validate advance notice requirements
    const daysDifference = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    
    if (leaveType === 'personal' && daysDifference < 3) {
      return res.status(400).json({ 
        message: "Personal leave must be requested at least 3 days in advance" 
      });
    }
    
    if (leaveType === 'vacation' && daysDifference < 30) {
      return res.status(400).json({ 
        message: "Vacation leave must be requested at least 30 days in advance" 
      });
    }

    // Check leave balance (skip for unpaid leave)
    if (leaveType !== 'unpaid') {
      try {
        await LeaveRequest.validateLeaveRequest(employee, leaveType, numberOfDays);
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
          console.error("Error uploading attachment:", uploadError);
          return res.status(400).json({ 
            message: `Failed to upload attachment "${file.originalname}": ${uploadError.message}` 
          });
        }
      }
    }

    const leaveRequest = await LeaveRequest.create({
      employee,
      leaveType,
      startDate,
      endDate,
      reason,
      attachments: attachmentUrls,
      numberOfDays,
      leaveYear: start.getFullYear()
    });

    console.log("✅ Leave request created successfully:", leaveRequest._id);

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest,
    });
  } catch (error) {
    console.error("❌ Error in createLeaveRequest:", error);
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
    const year = parseInt(req.query.year) || new Date().getFullYear();

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
    console.error("Error in getLeaveBalance:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get leave usage summary for HR (shows usage ratio like 1/24, 2/24)
export const getLeaveUsageSummary = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Check if user can access this data
    if (!['admin', 'superadmin', 'hr', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get all approved leaves for the employee in chronological order
    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId, // Mongoose will automatically convert string to ObjectId
      status: 'approved',
      leaveYear: year
    }).sort({ startDate: 1 });

    // Calculate cumulative usage
    let cumulativeUsed = 0;
    const leaveHistory = approvedLeaves
      .filter(leave => leave.leaveType !== 'unpaid') // Exclude unpaid leaves
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
        currentRatio: `${balance.earned.used}/24`
      }
    });
  } catch (error) {
    console.error("Error in getLeaveUsageSummary:", error);
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

    const leaveRequests = await LeaveRequest.find(filter)
      .populate({
        path: "employee",
        select: "name email designation employeeId department",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(leaveRequests);
  } catch (error) {
    console.error("Error in getAllLeaveRequests:", error);
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
    console.error("Error in getMyLeaveRequests:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get leave request by ID
export const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate({
        path: "employee",
        select: "name email designation employeeId department",
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
    console.error("Error in getLeaveRequestById:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve leave request
export const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalComment } = req.body;
    const approvedBy = req.user.id;

    console.log("🔍 Approve request:", { id, approvalComment, approvedBy, userRole: req.user.role });

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Only pending leave requests can be approved",
      });
    }

    leaveRequest.status = "approved";
    leaveRequest.approvedBy = approvedBy;
    leaveRequest.approvedDate = new Date();
    if (approvalComment) {
      leaveRequest.rejectionReason = approvalComment; // Reusing field for approval comments
    }

    await leaveRequest.save();

    res.status(200).json({
      message: "Leave request approved successfully",
      leaveRequest,
    });
  } catch (error) {
    console.error("Error in approveLeaveRequest:", error);
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

    console.log("🔍 Reject request:", { id, rejectionReason, approvedBy, userRole: req.user.role });

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Only pending leave requests can be rejected",
      });
    }

    leaveRequest.status = "rejected";
    leaveRequest.approvedBy = approvedBy;
    leaveRequest.rejectionReason = rejectionReason;
    leaveRequest.approvedDate = new Date();

    await leaveRequest.save();

    res.status(200).json({
      message: "Leave request rejected",
      leaveRequest,
    });
  } catch (error) {
    console.error("Error in rejectLeaveRequest:", error);
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
    console.error("Error in cancelLeaveRequest:", error.message);
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

    if (leaveType) leaveRequest.leaveType = leaveType;
    if (startDate) leaveRequest.startDate = startDate;
    if (endDate) leaveRequest.endDate = endDate;
    if (reason) leaveRequest.reason = reason;

    await leaveRequest.save();

    res.status(200).json({
      message: "Leave request updated successfully",
      leaveRequest,
    });
  } catch (error) {
    console.error("Error in updateLeaveRequest:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
