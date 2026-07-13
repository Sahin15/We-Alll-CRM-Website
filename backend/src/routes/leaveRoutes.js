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
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";
import { uploadDocument, handleDocumentUploadError } from "../middleware/documentMiddleware.js";
import LeaveRequest from "../models/leaveRequestModel.js";
import User from "../models/userModel.js";

const router = express.Router();

const LEAVE_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];
const LEAVE_APPROVE_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];

// Specific routes MUST come before parameterized routes
// Employee routes (legacy: any authenticated user)
router.get(
  "/my-leaves",
  protect,
  requireModulePermission("leave", "leave.request.view_self", { legacyAllowed: true }),
  getMyLeaveRequests
);
router.get(
  "/balance",
  protect,
  requireModulePermission("leave", "leave.request.view_self", { legacyAllowed: true }),
  getLeaveBalance
);
router.get(
  "/balance/:employeeId",
  protect,
  requireModulePermission("leave", "leave.request.view_self", { legacyAllowed: true }),
  getLeaveBalance
);
router.get(
  "/usage-summary/:employeeId",
  protect,
  requireModulePermission("leave", "leave.request.view", { legacyRoles: LEAVE_VIEW_ROLES }),
  getLeaveUsageSummary
);

// Bulk leave balance overview for all employees (HR/Admin)
router.get(
  "/all-balances",
  protect,
  requireModulePermission("leave", "leave.request.view", { legacyRoles: LEAVE_VIEW_ROLES }),
  async (req, res) => {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month) : null;

      const { mergeActiveEmployeeFilter } = await import(
        "../utils/employeeQueryUtils.js"
      );
      const employees = await User.find(
        mergeActiveEmployeeFilter({
          role: { $in: ["employee", "hod", "hr", "accounts", "manager"] },
        })
      )
        .select("name email employeeId designation department joiningDate employmentType fullTimeStartDate internshipDetails")
        .populate("department", "name")
        .lean();

      let monthStart, monthEnd;
      if (month) {
        monthStart = new Date(year, month - 1, 1);
        monthEnd = new Date(year, month, 0, 23, 59, 59);
      }

      const allApprovedLeaves = await LeaveRequest.find({
        status: "approved",
        leaveYear: year,
      }).lean();

      const Attendance = (await import("../models/attendanceModel.js")).default;

      const yearAttendanceStart = new Date(Date.UTC(year - 1, 11, 31, 18, 30, 0));
      const yearAttendanceEnd = new Date(Date.UTC(year, 11, 31, 18, 30, 0));

      const yearAttendanceStats = await Attendance.aggregate([
        {
          $match: {
            date: { $gte: yearAttendanceStart, $lte: yearAttendanceEnd },
            status: { $in: ["late", "absent"] },
          },
        },
        {
          $group: {
            _id: { employee: "$employee", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]);

      const yearAttendanceMap = {};
      for (const stat of yearAttendanceStats) {
        const empId = stat._id.employee.toString();
        if (!yearAttendanceMap[empId]) yearAttendanceMap[empId] = { late: 0, absent: 0 };
        yearAttendanceMap[empId][stat._id.status] = stat.count;
      }

      let monthAttendanceMap = {};
      if (month) {
        const istMonthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 5.5 * 3600000);
        const istMonthEnd = new Date(Date.UTC(year, month, 0, 0, 0, 0) - 5.5 * 3600000 + 24 * 3600000 - 1);

        const monthAttendanceStats = await Attendance.aggregate([
          {
            $match: {
              date: { $gte: istMonthStart, $lte: istMonthEnd },
              status: { $in: ["late", "absent"] },
            },
          },
          {
            $group: {
              _id: { employee: "$employee", status: "$status" },
              count: { $sum: 1 },
            },
          },
        ]);
        for (const stat of monthAttendanceStats) {
          const empId = stat._id.employee.toString();
          if (!monthAttendanceMap[empId]) monthAttendanceMap[empId] = { late: 0, absent: 0 };
          monthAttendanceMap[empId][stat._id.status] = stat.count;
        }
      }

      const leavesByEmployee = {};
      for (const leave of allApprovedLeaves) {
        const empId = leave.employee.toString();
        if (!leavesByEmployee[empId]) leavesByEmployee[empId] = [];
        leavesByEmployee[empId].push(leave);
      }

      let monthlyLeavesByEmployee = {};
      if (month) {
        const monthlyLeaves = await LeaveRequest.find({
          status: "approved",
          $or: [
            { startDate: { $gte: monthStart, $lte: monthEnd } },
            { endDate: { $gte: monthStart, $lte: monthEnd } },
            { startDate: { $lte: monthStart }, endDate: { $gte: monthEnd } },
          ],
        }).lean();

        for (const leave of monthlyLeaves) {
          const empId = leave.employee.toString();
          if (!monthlyLeavesByEmployee[empId]) monthlyLeavesByEmployee[empId] = [];
          monthlyLeavesByEmployee[empId].push(leave);
        }
      }

      const summaries = await Promise.all(
        employees.map(async (emp) => {
          const empId = emp._id.toString();
          const monthLeaves = month ? monthlyLeavesByEmployee[empId] || [] : [];

          const balance = await LeaveRequest.getLeaveBalance(emp._id, year);

          const monthTotals = {
            personal: 0,
            medical: 0,
            vacation: 0,
            unpaid: 0,
            half_day: 0,
            total: 0,
          };
          if (month) {
            for (const l of monthLeaves) {
              let days;
              if (l.leaveType === "half_day") {
                days = l.numberOfDays || 0.5;
              } else {
                const leaveStart = new Date(Math.max(new Date(l.startDate), monthStart));
                const leaveEnd = new Date(Math.min(new Date(l.endDate), monthEnd));
                days = Math.max(0, Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1);
              }
              if (Object.prototype.hasOwnProperty.call(monthTotals, l.leaveType)) {
                monthTotals[l.leaveType] += days;
              }
              if (l.leaveType !== "unpaid") monthTotals.total += days;
            }
          }

          const yearAtt = yearAttendanceMap[empId] || { late: 0, absent: 0 };
          const monthAtt = month ? monthAttendanceMap[empId] || { late: 0, absent: 0 } : null;

          return {
            employee: {
              _id: emp._id,
              name: emp.name,
              email: emp.email,
              employeeId: emp.employeeId,
              designation: emp.designation,
              department: emp.department,
              employmentType: emp.employmentType ?? null,
            },
            eligibleForPaidLeave: balance.eligibleForPaidLeave,
            employmentType: balance.employmentType ?? emp.employmentType ?? null,
            year: {
              earned: balance.eligibleForPaidLeave ? balance.earned.earned : 0,
              totalUsed: balance.eligibleForPaidLeave ? balance.earned.used : 0,
              remaining: balance.eligibleForPaidLeave ? balance.earned.remaining : 0,
              personal: balance.personal.used,
              medical: balance.medical.used,
              vacation: balance.vacation.used,
              unpaid: balance.unpaid.used,
              halfDay: balance.half_day.used,
              late: yearAtt.late,
              absent: yearAtt.absent,
            },
            month: month
              ? {
                  month,
                  totalUsed: monthTotals.total,
                  personal: monthTotals.personal,
                  medical: monthTotals.medical,
                  vacation: monthTotals.vacation,
                  unpaid: monthTotals.unpaid,
                  halfDay: monthTotals.half_day,
                  late: monthAtt.late,
                  absent: monthAtt.absent,
                }
              : null,
          };
        })
      );

      res.status(200).json({ year, month: month || null, summaries });
    } catch (error) {
      console.error("Error fetching all leave balances:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

router.get(
  "/",
  protect,
  requireModulePermission("leave", "leave.request.view", { legacyRoles: LEAVE_VIEW_ROLES }),
  getAllLeaveRequests
);

router.post(
  "/",
  protect,
  requireModulePermission("leave", "leave.request.create", { legacyAllowed: true }),
  uploadDocument.array("attachments", 5),
  handleDocumentUploadError,
  createLeaveRequest
);

router.get(
  "/:id",
  protect,
  requireModulePermission("leave", "leave.request.view_self", { legacyAllowed: true }),
  getLeaveRequestById
);
router.put(
  "/:id",
  protect,
  requireModulePermission("leave", "leave.request.create", { legacyAllowed: true }),
  updateLeaveRequest
);
router.put(
  "/:id/cancel",
  protect,
  requireModulePermission("leave", "leave.request.create", { legacyAllowed: true }),
  cancelLeaveRequest
);
router.put(
  "/:id/approve",
  protect,
  requireModulePermission("leave", "leave.request.approve", { legacyRoles: LEAVE_APPROVE_ROLES }),
  approveLeaveRequest
);
router.put(
  "/:id/reject",
  protect,
  requireModulePermission("leave", "leave.request.approve", { legacyRoles: LEAVE_APPROVE_ROLES }),
  rejectLeaveRequest
);

export default router;
