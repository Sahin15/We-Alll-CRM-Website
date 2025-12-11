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
} from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Test routes (no auth required)
router.get("/test-logic", testStatusLogic);

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

export default router;
