import express from "express";
import {
  submitWorkLog,
  saveDraft,
  getTodayWorkLog,
  checkWorkLogStatus,
  getMyWorkLogs,
  getAllWorkLogs,
  getEmployeeWorkLogs,
  reviewWorkLog,
  updateWorkLog,
  updateMyWorkLog,
  lateSubmission,
  getWorkLogStats,
  exportWorkLogs,
  getDepartmentWorkLogs,
  reviewDepartmentWorkLog,
} from "../controllers/workLogController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { isHoD } from "../middleware/hodMiddleware.js";

const router = express.Router();

// Employee routes (protected)
router.post("/submit", protect, submitWorkLog);
router.post("/save-draft", protect, saveDraft);
router.get("/today", protect, getTodayWorkLog);
router.get("/check-status", protect, checkWorkLogStatus);
router.get("/my-logs/export", protect, exportWorkLogs); // Employee can export their own logs (must be before /my-logs)
router.put("/my-logs/:id", protect, updateMyWorkLog); // Employee can update their own logs (must be before /my-logs)
router.get("/my-logs", protect, getMyWorkLogs);
router.post("/late-submission", protect, lateSubmission);

// HOD routes (Head of Department) - MUST come before /all to avoid conflicts
router.get(
  "/department/logs",
  protect,
  isHoD,
  getDepartmentWorkLogs
);

router.put(
  "/department/:id/review",
  protect,
  isHoD,
  reviewDepartmentWorkLog
);

// Admin/HR/Manager routes
router.get(
  "/all",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  getAllWorkLogs
);

router.get(
  "/employee/:employeeId",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  getEmployeeWorkLogs
);

router.put(
  "/:id/review",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  reviewWorkLog
);

router.put(
  "/:id/update",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  updateWorkLog
);

router.get(
  "/stats",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  getWorkLogStats
);

router.get(
  "/export",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  exportWorkLogs
);

export default router;
