import express from "express";
import {
  createLeaveRequest,
  getAllLeaveRequests,
  getMyLeaveRequests,
  getLeaveRequestById,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  updateLeaveRequest,
  getLeaveBalance,
  getLeaveUsageSummary,
} from "../controllers/leaveController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { uploadDocument, handleDocumentUploadError } from "../middleware/documentMiddleware.js";
import LeaveRequest from "../models/leaveRequestModel.js";
import User from "../models/userModel.js";

const router = express.Router();

// Specific routes MUST come before parameterized routes
// Employee routes
router.get("/my-leaves", protect, getMyLeaveRequests);
router.get("/balance", protect, getLeaveBalance);
router.get("/balance/:employeeId", protect, getLeaveBalance);
router.get("/usage-summary/:employeeId", protect, authorizeRoles("admin", "superadmin", "hr", "hod", "manager"), getLeaveUsageSummary);

// Bulk leave balance overview for all employees (HR/Admin)
router.get(
  "/all-balances",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  async (req, res) => {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month) : null;

      // Get all active employees
      const employees = await User.find({
        status: "active",
        role: { $in: ["employee", "hod", "hr", "accounts", "manager"] }
      })
        .select("name email employeeId designation department joiningDate")
        .populate("department", "name")
        .lean();

      // Build date range for monthly filter
      let monthStart, monthEnd;
      if (month) {
        monthStart = new Date(year, month - 1, 1);
        monthEnd = new Date(year, month, 0, 23, 59, 59);
      }

      // Fetch all approved leaves for the year in one query
      const allApprovedLeaves = await LeaveRequest.find({
        status: "approved",
        leaveYear: year
      }).lean();

      // Fetch attendance stats (late + absent) for the year and optionally the month
      const Attendance = (await import("../models/attendanceModel.js")).default;

      // Use wide UTC ranges to capture IST-midnight stored dates (IST = UTC+5:30)
      // IST Jan 1 midnight = Dec 31 18:30 UTC, IST Dec 31 midnight = Dec 30 18:30 UTC
      // So use: start = Dec 31 of prev year 18:30 UTC, end = Dec 31 of year 18:30 UTC
      const yearAttendanceStart = new Date(Date.UTC(year - 1, 11, 31, 18, 30, 0));
      const yearAttendanceEnd   = new Date(Date.UTC(year,     11, 31, 18, 30, 0));

      // Aggregate late and absent counts per employee for the full year
      const yearAttendanceStats = await Attendance.aggregate([
        {
          $match: {
            date: { $gte: yearAttendanceStart, $lte: yearAttendanceEnd },
            status: { $in: ["late", "absent"] }
          }
        },
        {
          $group: {
            _id: { employee: "$employee", status: "$status" },
            count: { $sum: 1 }
          }
        }
      ]);

      // Build map: employeeId -> { late, absent }
      const yearAttendanceMap = {};
      for (const stat of yearAttendanceStats) {
        const empId = stat._id.employee.toString();
        if (!yearAttendanceMap[empId]) yearAttendanceMap[empId] = { late: 0, absent: 0 };
        yearAttendanceMap[empId][stat._id.status] = stat.count;
      }

      // Monthly attendance stats if month filter is active
      let monthAttendanceMap = {};
      if (month) {
        // IST midnight for first day of month = UTC(year, month-1, 1, 0,0,0) - 5.5h
        const istMonthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 5.5 * 3600000);
        // IST midnight for last day of month + 24h - 1ms
        const istMonthEnd   = new Date(Date.UTC(year, month, 0, 0, 0, 0) - 5.5 * 3600000 + 24 * 3600000 - 1);

        const monthAttendanceStats = await Attendance.aggregate([
          {
            $match: {
              date: { $gte: istMonthStart, $lte: istMonthEnd },
              status: { $in: ["late", "absent"] }
            }
          },
          {
            $group: {
              _id: { employee: "$employee", status: "$status" },
              count: { $sum: 1 }
            }
          }
        ]);
        for (const stat of monthAttendanceStats) {
          const empId = stat._id.employee.toString();
          if (!monthAttendanceMap[empId]) monthAttendanceMap[empId] = { late: 0, absent: 0 };
          monthAttendanceMap[empId][stat._id.status] = stat.count;
        }
      }

      // Build a map: employeeId -> leaves[]
      const leavesByEmployee = {};
      for (const leave of allApprovedLeaves) {
        const empId = leave.employee.toString();
        if (!leavesByEmployee[empId]) leavesByEmployee[empId] = [];
        leavesByEmployee[empId].push(leave);
      }

      // For monthly filter: fetch leaves that overlap the selected month
      let monthlyLeavesByEmployee = {};
      if (month) {
        const monthlyLeaves = await LeaveRequest.find({
          status: "approved",
          $or: [
            { startDate: { $gte: monthStart, $lte: monthEnd } },
            { endDate: { $gte: monthStart, $lte: monthEnd } },
            { startDate: { $lte: monthStart }, endDate: { $gte: monthEnd } }
          ]
        }).lean();

        for (const leave of monthlyLeaves) {
          const empId = leave.employee.toString();
          if (!monthlyLeavesByEmployee[empId]) monthlyLeavesByEmployee[empId] = [];
          monthlyLeavesByEmployee[empId].push(leave);
        }
      }

      // Build summary for each employee
      const summaries = employees.map(emp => {
        const empId = emp._id.toString();
        const yearLeaves = leavesByEmployee[empId] || [];
        const monthLeaves = month ? (monthlyLeavesByEmployee[empId] || []) : [];

        // Year totals
        const yearTotals = { personal: 0, medical: 0, vacation: 0, unpaid: 0, half_day: 0, total: 0 };
        for (const l of yearLeaves) {
          // Always use 0.5 for half_day regardless of what's stored (old records may have numberOfDays=1)
          const days = l.leaveType === 'half_day' ? 0.5 : (l.numberOfDays || 0);
          if (yearTotals.hasOwnProperty(l.leaveType)) yearTotals[l.leaveType] += days;
          if (l.leaveType !== "unpaid") yearTotals.total += days;
        }

        // Month totals
        const monthTotals = { personal: 0, medical: 0, vacation: 0, unpaid: 0, half_day: 0, total: 0 };
        if (month) {
          for (const l of monthLeaves) {
            // Use stored numberOfDays for half_day (always 0.5), calculate overlap for others
            let days;
            if (l.leaveType === 'half_day') {
              days = l.numberOfDays || 0.5;
            } else {
              const leaveStart = new Date(Math.max(new Date(l.startDate), monthStart));
              const leaveEnd = new Date(Math.min(new Date(l.endDate), monthEnd));
              days = Math.max(0, Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1);
            }
            if (monthTotals.hasOwnProperty(l.leaveType)) monthTotals[l.leaveType] += days;
            if (l.leaveType !== "unpaid") monthTotals.total += days;
          }
        }

        // Earned leaves calculation
        const earnedLeaves = LeaveRequest.calculateEarnedLeaves(year, emp.joiningDate);
        const remaining = Math.max(0, earnedLeaves - yearTotals.total);

        const yearAtt = yearAttendanceMap[empId] || { late: 0, absent: 0 };
        const monthAtt = month ? (monthAttendanceMap[empId] || { late: 0, absent: 0 }) : null;

        return {
          employee: {
            _id: emp._id,
            name: emp.name,
            email: emp.email,
            employeeId: emp.employeeId,
            designation: emp.designation,
            department: emp.department
          },
          year: {
            earned: earnedLeaves,
            totalUsed: yearTotals.total,
            remaining,
            personal: yearTotals.personal,
            medical: yearTotals.medical,
            vacation: yearTotals.vacation,
            unpaid: yearTotals.unpaid,
            halfDay: yearTotals.half_day,
            late: yearAtt.late,
            absent: yearAtt.absent
          },
          month: month ? {
            month,
            totalUsed: monthTotals.total,
            personal: monthTotals.personal,
            medical: monthTotals.medical,
            vacation: monthTotals.vacation,
            unpaid: monthTotals.unpaid,
            halfDay: monthTotals.half_day,
            late: monthAtt.late,
            absent: monthAtt.absent
          } : null
        };
      });

      res.status(200).json({ year, month: month || null, summaries });
    } catch (error) {
      console.error("Error fetching all leave balances:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// HR/Manager/Admin routes
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  getAllLeaveRequests
);

// Create leave request
router.post("/", protect, uploadDocument.array("attachments", 5), handleDocumentUploadError, createLeaveRequest);

// Parameterized routes MUST come after specific routes
router.get("/:id", protect, getLeaveRequestById);
router.put("/:id", protect, updateLeaveRequest);
router.put("/:id/cancel", protect, cancelLeaveRequest);
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  approveLeaveRequest
);
router.put(
  "/:id/reject",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  rejectLeaveRequest
);

export default router;
