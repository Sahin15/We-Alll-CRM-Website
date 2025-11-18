import LeaveRequest from "../models/leaveRequestModel.js";

// Create leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, attachments } = req.body;
    const employee = req.user.id;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date" });
    }

    const leaveRequest = await LeaveRequest.create({
      employee,
      leaveType,
      startDate,
      endDate,
      reason,
      attachments,
    });

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest,
    });
  } catch (error) {
    console.error("Error in createLeaveRequest:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all leave requests (Admin/HR)
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const leaveRequests = await LeaveRequest.find(filter)
      .populate("employee", "name email department position")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(leaveRequests);
  } catch (error) {
    console.error("Error in getAllLeaveRequests:", error.message);
    res.status(500).json({ message: "Server error" });
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
      .populate("employee", "name email department position")
      .populate("approvedBy", "name email");

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    res.status(200).json(leaveRequest);
  } catch (error) {
    console.error("Error in getLeaveRequestById:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve leave request
export const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user.id;

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

    await leaveRequest.save();

    res.status(200).json({
      message: "Leave request approved successfully",
      leaveRequest,
    });
  } catch (error) {
    console.error("Error in approveLeaveRequest:", error.message);
    res.status(500).json({ message: "Server error" });
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
    console.error("Error in rejectLeaveRequest:", error.message);
    res.status(500).json({ message: "Server error" });
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
