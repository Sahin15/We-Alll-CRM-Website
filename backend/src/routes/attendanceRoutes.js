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
  // Overtime management
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
import Attendance from "../models/attendanceModel.js";

const router = express.Router();

// Test routes (no auth required)
router.get("/test-logic", testStatusLogic);
router.get("/test-api", (req, res) => {
  
  res.json({ 
    message: "Attendance API is working", 
    timestamp: new Date().toISOString(),
    status: "success" 
  });
});

router.get("/test-protected", protect, (req, res) => {
  
  res.json({ 
    message: "Protected attendance API is working", 
    user: req.user?.email,
    role: req.user?.role,
    timestamp: new Date().toISOString(),
    status: "success" 
  });
});

// Debug endpoint to check database contents
router.get("/debug-db", protect, authorizeRoles("admin", "superadmin", "hr", "manager"), async (req, res) => {
  try {
    const totalCount = await Attendance.countDocuments();
    const recentRecords = await Attendance.find()
      .populate('employee', 'name email')
      .sort({ date: -1 })
      .limit(10)
      .lean();
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayCount = await Attendance.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd }
    });
    
    res.json({
      totalRecords: totalCount,
      todayRecords: todayCount,
      recentRecords: recentRecords.map(r => ({
        id: r._id,
        employee: r.employee?.name || 'Unknown',
        date: r.date,
        status: r.status,
        clockIn: r.clockIn
      })),
      dateInfo: {
        todayStart,
        todayEnd,
        serverTime: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Employee routes
router.post("/clock-in", protect, clockIn);
router.post("/clock-out", protect, clockOut);
router.post("/start-break", protect, startBreak);
router.post("/end-break", protect, endBreak);
router.get("/my-attendance", protect, getMyAttendance);
router.get("/today", protect, getTodayAttendance);
router.post("/recalculate-today", protect, recalculateTodayStatus);
router.post("/fix-hr-attendance", protect, authorizeRoles("admin", "superadmin", "hr", "manager"), fixAllHRAttendance);

// Reports
router.get(
  "/report",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  getAttendanceReport
);

// PDF Download
router.get(
  "/download-pdf",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  downloadAttendancePDF
);

// Admin/HR routes
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  getAllAttendance
);
router.post(
  "/manual",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  createManualAttendance
);
router.get("/:id", protect, getAttendanceById);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  updateManualAttendance
);
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  updateAttendanceStatus
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  deleteAttendance
);
router.post(
  "/mark-absence",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  markAbsence
);
router.get(
  "/summary/:employeeId",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  getAttendanceSummary
);

// Fix attendance status endpoint
router.post(
  "/fix-today",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  fixTodayAttendance
);

// Remove duplicate attendance records
router.post(
  "/remove-duplicates",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  removeDuplicateAttendance
);

// Recalculate work hours for existing records
router.post(
  "/recalculate-work-hours",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  recalculateWorkHours
);

// Initialize breaks field for existing records
router.post(
  "/initialize-breaks",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  initializeBreaksField
);

// Manual trigger for auto clock-out (for testing)
router.post(
  "/manual-auto-clockout",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  manualAutoClockOut
);

// ==================== OVERTIME ROUTES ====================

// Employee overtime timer routes
router.post("/overtime/start-timer", protect, startOvertimeTimer);
router.post("/overtime/stop-timer/:entryId", protect, stopOvertimeTimer);
router.get("/overtime/active-timer", protect, getActiveOvertimeTimer);

// Employee overtime routes
router.post("/overtime/add", protect, addOvertimeEntry);
router.get("/overtime/my-entries", protect, getMyOvertimeEntries);

// HR/Admin/HoD overtime routes
router.get(
  "/overtime/pending",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  getPendingOvertimeEntries
);

router.post(
  "/overtime/:attendanceId/:entryId/approve",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  approveOvertimeEntry
);

router.post(
  "/overtime/:attendanceId/:entryId/reject",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  rejectOvertimeEntry
);

router.get(
  "/overtime/statistics",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  getOvertimeStatistics
);

export default router;

