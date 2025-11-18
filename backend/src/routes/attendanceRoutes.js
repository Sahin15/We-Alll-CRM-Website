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
} from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Employee routes
router.post("/clock-in", protect, clockIn);
router.post("/clock-out", protect, clockOut);
router.get("/my-attendance", protect, getMyAttendance);
router.get("/today", protect, getTodayAttendance);

// Reports
router.get(
  "/report",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  getAttendanceReport
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

export default router;
