import express from "express";
import {
  submitWorkLog,
  getTodayWorkLog,
  checkWorkLogStatus,
  getMyWorkLogs,
  getAllWorkLogs,
  getEmployeeWorkLogs,
  reviewWorkLog,
  updateWorkLog,
  lateSubmission,
  getWorkLogStats,
  exportWorkLogs,
} from "../controllers/workLogController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Employee routes (protected)
router.post("/submit", protect, submitWorkLog);
router.get("/today", protect, getTodayWorkLog);
router.get("/check-status", protect, checkWorkLogStatus);
router.get("/my-logs", protect, getMyWorkLogs);
router.post("/late-submission", protect, lateSubmission);

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
