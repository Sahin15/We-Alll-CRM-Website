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
} from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import Attendance from "../models/attendanceModel.js";

const router = express.Router();

// Test routes (no auth required)
router.get("/test-logic", testStatusLogic);
router.get("/test-api", (req, res) => {
  console.log('[TEST] Attendance API test endpoint called');
  res.json({ 
    message: "Attendance API is working", 
    timestamp: new Date().toISOString(),
    status: "success" 
  });
});

router.get("/test-protected", protect, (req, res) => {
  console.log('[TEST] Protected attendance API test called by:', req.user?.email);
  res.json({ 
    message: "Protected attendance API is working", 
    user: req.user?.email,
    role: req.user?.role,
    timestamp: new Date().toISOString(),
    status: "success" 
  });
});

// Debug endpoint to check database contents
router.get("/debug-db", protect, authorizeRoles("admin", "superadmin", "hr"), async (req, res) => {
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
router.get("/my-attendance", protect, getMyAttendance);
router.get("/today", protect, getTodayAttendance);
router.post("/recalculate-today", protect, recalculateTodayStatus);
router.post("/fix-hr-attendance", protect, authorizeRoles("admin", "superadmin", "hr"), fixAllHRAttendance);

// Reports
router.get(
  "/report",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  getAttendanceReport
);

// PDF Download
router.get(
  "/download-pdf",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  downloadAttendancePDF
);

// Admin/HR routes
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  getAllAttendance
);
router.post(
  "/manual",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  createManualAttendance
);
router.get("/:id", protect, getAttendanceById);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  updateManualAttendance
);
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  updateAttendanceStatus
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  deleteAttendance
);
router.post(
  "/mark-absence",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  markAbsence
);
router.get(
  "/summary/:employeeId",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  getAttendanceSummary
);

// Fix attendance status endpoint
router.post(
  "/fix-today",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  fixTodayAttendance
);

// Remove duplicate attendance records
router.post(
  "/remove-duplicates",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  removeDuplicateAttendance
);

// Recalculate work hours for existing records
router.post(
  "/recalculate-work-hours",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  recalculateWorkHours
);

export default router;
