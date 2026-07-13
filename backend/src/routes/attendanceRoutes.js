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
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import Attendance from "../models/attendanceModel.js";

const router = express.Router();

const ATTENDANCE_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];
const ATTENDANCE_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];

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
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
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

// Employee routes (legacy: any authenticated user)
router.post(
  "/clock-in",
  protect,
  requireModulePermission("attendance", "attendance.clock", { legacyAllowed: true }),
  clockIn
);
router.post(
  "/clock-out",
  protect,
  requireModulePermission("attendance", "attendance.clock", { legacyAllowed: true }),
  clockOut
);
router.post(
  "/start-break",
  protect,
  requireModulePermission("attendance", "attendance.clock", { legacyAllowed: true }),
  startBreak
);
router.post(
  "/end-break",
  protect,
  requireModulePermission("attendance", "attendance.clock", { legacyAllowed: true }),
  endBreak
);
router.get(
  "/my-attendance",
  protect,
  requireModulePermission("attendance", "attendance.record.view_self", { legacyAllowed: true }),
  getMyAttendance
);
router.get(
  "/today",
  protect,
  requireModulePermission("attendance", "attendance.record.view_self", { legacyAllowed: true }),
  getTodayAttendance
);
router.post(
  "/recalculate-today",
  protect,
  requireModulePermission("attendance", "attendance.record.view_self", { legacyAllowed: true }),
  recalculateTodayStatus
);
router.post(
  "/fix-hr-attendance",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  fixAllHRAttendance
);

// Reports
router.get(
  "/report",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  getAttendanceReport
);

// PDF Download
router.get(
  "/download-pdf",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  downloadAttendancePDF
);

// Admin/HR/HoD view routes
router.get(
  "/",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  getAllAttendance
);
router.post(
  "/manual",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  createManualAttendance
);
router.get(
  "/:id",
  protect,
  requireModulePermission("attendance", "attendance.record.view_self", { legacyAllowed: true }),
  getAttendanceById
);
router.put(
  "/:id",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  updateManualAttendance
);
router.put(
  "/:id/status",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  updateAttendanceStatus
);
router.delete(
  "/:id",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  deleteAttendance
);
router.post(
  "/mark-absence",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  markAbsence
);
router.get(
  "/summary/:employeeId",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  getAttendanceSummary
);

router.post(
  "/fix-today",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  fixTodayAttendance
);

router.post(
  "/remove-duplicates",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  removeDuplicateAttendance
);

router.post(
  "/recalculate-work-hours",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  recalculateWorkHours
);

router.post(
  "/initialize-breaks",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  initializeBreaksField
);

router.post(
  "/manual-auto-clockout",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  manualAutoClockOut
);

// ==================== OVERTIME ROUTES ====================

router.post(
  "/overtime/start-timer",
  protect,
  requireModulePermission("attendance", "attendance.clock", { legacyAllowed: true }),
  startOvertimeTimer
);
router.post(
  "/overtime/stop-timer/:entryId",
  protect,
  requireModulePermission("attendance", "attendance.clock", { legacyAllowed: true }),
  stopOvertimeTimer
);
router.get(
  "/overtime/active-timer",
  protect,
  requireModulePermission("attendance", "attendance.record.view_self", { legacyAllowed: true }),
  getActiveOvertimeTimer
);

router.post(
  "/overtime/add",
  protect,
  requireModulePermission("attendance", "attendance.clock", { legacyAllowed: true }),
  addOvertimeEntry
);
router.get(
  "/overtime/my-entries",
  protect,
  requireModulePermission("attendance", "attendance.record.view_self", { legacyAllowed: true }),
  getMyOvertimeEntries
);

router.get(
  "/overtime/pending",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  getPendingOvertimeEntries
);

router.post(
  "/overtime/:attendanceId/:entryId/approve",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  approveOvertimeEntry
);

router.post(
  "/overtime/:attendanceId/:entryId/reject",
  protect,
  authorizeRoles(...ATTENDANCE_VIEW_ROLES),
  requireModulePermission("attendance", "attendance.record.view", {
    legacyRoles: ATTENDANCE_VIEW_ROLES,
  }),
  rejectOvertimeEntry
);

router.get(
  "/overtime/statistics",
  protect,
  authorizeRoles(...ATTENDANCE_MANAGE_ROLES),
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ATTENDANCE_MANAGE_ROLES,
  }),
  getOvertimeStatistics
);

export default router;
