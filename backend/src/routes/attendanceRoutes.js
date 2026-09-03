import express from "express";
import {
  clockIn,
  clockOut,
  getAllAttendance,
  getMyAttendance,
  getAttendanceById,
  updateAttendanceStatus,
  markAbsence,
  getAttendanceSummary,
  createManualAttendance,
  updateManualAttendance,
  deleteAttendance,
  getAttendanceReport,
  getTodayAttendance,
  recalculateTodayStatus,
  fixAllHRAttendance,
  testStatusLogic,
  debugStatusCalculation,
  downloadAttendancePDF,
  fixTodayAttendance,
  removeDuplicateAttendance,
  recalculateWorkHours,
  startBreak,
  endBreak,
  initializeBreaksField,
  manualAutoClockOut,
  startOvertimeTimer,
  stopOvertimeTimer,
  getActiveOvertimeTimer,
  addOvertimeEntry,
  getMyOvertimeEntries,
  getPendingOvertimeEntries,
  approveOvertimeEntry,
  rejectOvertimeEntry,
  getOvertimeStatistics,
} from "../controllers/attendanceController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";
import Attendance from "../models/attendanceModel.js";

const router = express.Router();

const ATTENDANCE_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];
const ATTENDANCE_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];
const ATTENDANCE_SELF_ROLES = [
  "employee",
  "hod",
  "sales",
  "manager",
  "hr",
  "admin",
  "superadmin",
];

const attendanceClock = requireModulePermission("attendance", "attendance.clock", {
  legacyRoles: ATTENDANCE_SELF_ROLES,
});
const attendanceViewSelf = requireModulePermission("attendance", "attendance.record.view_self", {
  legacyRoles: ATTENDANCE_SELF_ROLES,
});

// Test routes (no auth required)
router.get("/test-logic", testStatusLogic);
router.get("/test-api", (req, res) => {
  res.json({
    message: "Attendance API is working",
    timestamp: new Date().toISOString(),
    status: "success",
  });
});

router.get("/test-protected", protect, (req, res) => {
  res.json({
    message: "Protected attendance API is working",
    user: req.user?.email,
    role: req.user?.role,
    timestamp: new Date().toISOString(),
    status: "success",
  });
});

// Debug endpoint to check database contents
router.get(
  "/debug-db",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  async (req, res) => {
    try {
      const totalCount = await Attendance.countDocuments();
      const recentRecords = await Attendance.find()
        .populate("employee", "name email")
        .sort({ date: -1 })
        .limit(10)
        .lean();

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayCount = await Attendance.countDocuments({
        date: { $gte: todayStart, $lte: todayEnd },
      });

      res.json({
        totalRecords: totalCount,
        todayRecords: todayCount,
        recentRecords: recentRecords.map((r) => ({
          id: r._id,
          employee: r.employee?.name || "Unknown",
          date: r.date,
          status: r.status,
          clockIn: r.clockIn,
        })),
        dateInfo: {
          todayStart,
          todayEnd,
          serverTime: new Date(),
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post("/clock-in", protect, attendanceClock, clockIn);
router.post("/clock-out", protect, attendanceClock, clockOut);
router.post("/start-break", protect, attendanceClock, startBreak);
router.post("/end-break", protect, attendanceClock, endBreak);
router.get("/my-attendance", protect, attendanceViewSelf, getMyAttendance);
router.get("/today", protect, attendanceViewSelf, getTodayAttendance);
router.post("/recalculate-today", protect, attendanceViewSelf, recalculateTodayStatus);
router.post(
  "/fix-hr-attendance",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  fixAllHRAttendance
);

// Reports
router.get(
  "/report",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  getAttendanceReport
);

// PDF Download
router.get(
  "/download-pdf",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  downloadAttendancePDF
);

// Admin/HR/HoD view routes
router.get(
  "/",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  getAllAttendance
);
router.post(
  "/manual",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  createManualAttendance
);
router.get("/:id", protect, attendanceViewSelf, getAttendanceById);
router.put(
  "/:id",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  updateManualAttendance
);
router.put(
  "/:id/status",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  updateAttendanceStatus
);
router.delete(
  "/:id",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  deleteAttendance
);
router.post(
  "/mark-absence",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  markAbsence
);
router.get(
  "/summary/:employeeId",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  getAttendanceSummary
);

router.post(
  "/fix-today",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  fixTodayAttendance
);

router.post(
  "/remove-duplicates",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  removeDuplicateAttendance
);

router.post(
  "/recalculate-work-hours",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  recalculateWorkHours
);

router.post(
  "/initialize-breaks",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  initializeBreaksField
);

router.post(
  "/manual-auto-clockout",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  manualAutoClockOut
);

// ==================== OVERTIME ROUTES ====================

router.post("/overtime/start-timer", protect, attendanceClock, startOvertimeTimer);
router.post("/overtime/stop-timer/:entryId", protect, attendanceClock, stopOvertimeTimer);
router.get("/overtime/active-timer", protect, attendanceViewSelf, getActiveOvertimeTimer);
router.post("/overtime/add", protect, attendanceClock, addOvertimeEntry);
router.get("/overtime/my-entries", protect, attendanceViewSelf, getMyOvertimeEntries);

router.get(
  "/overtime/pending",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  getPendingOvertimeEntries
);

router.post(
  "/overtime/:attendanceId/:entryId/approve",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  approveOvertimeEntry
);

router.post(
  "/overtime/:attendanceId/:entryId/reject",
  protect,
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  rejectOvertimeEntry
);

router.get(
  "/overtime/statistics",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  getOvertimeStatistics
);

export default router;
