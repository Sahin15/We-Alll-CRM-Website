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
  raiseConcern,
  raiseDepartmentConcern,
} from "../controllers/workLogController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { isHoD } from "../middleware/hodMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const WORKLOG_REVIEW_ROLES = ["admin", "superadmin", "hr", "manager"];

// Employee routes (protected — legacy: any authenticated user)
router.post(
  "/submit",
  protect,
  requireModulePermission("worklog", "worklog.entry.create", { legacyAllowed: true }),
  submitWorkLog
);
router.post(
  "/save-draft",
  protect,
  requireModulePermission("worklog", "worklog.entry.create", { legacyAllowed: true }),
  saveDraft
);
router.get(
  "/today",
  protect,
  requireModulePermission("worklog", "worklog.entry.view_self", { legacyAllowed: true }),
  getTodayWorkLog
);
router.get(
  "/check-status",
  protect,
  requireModulePermission("worklog", "worklog.entry.view_self", { legacyAllowed: true }),
  checkWorkLogStatus
);
router.get(
  "/my-logs/export",
  protect,
  requireModulePermission("worklog", "worklog.entry.view_self", { legacyAllowed: true }),
  exportWorkLogs
);
router.put(
  "/my-logs/:id",
  protect,
  requireModulePermission("worklog", "worklog.entry.create", { legacyAllowed: true }),
  updateMyWorkLog
);
router.get(
  "/my-logs",
  protect,
  requireModulePermission("worklog", "worklog.entry.view_self", { legacyAllowed: true }),
  getMyWorkLogs
);
router.post(
  "/late-submission",
  protect,
  requireModulePermission("worklog", "worklog.entry.create", { legacyAllowed: true }),
  lateSubmission
);

// HOD routes — legacy gated by isHoD middleware
router.get(
  "/department/logs",
  protect,
  isHoD,
  requireModulePermission("worklog", "worklog.entry.review", { legacyAllowed: true }),
  getDepartmentWorkLogs
);

router.put(
  "/department/:id/review",
  protect,
  isHoD,
  requireModulePermission("worklog", "worklog.entry.review", { legacyAllowed: true }),
  reviewDepartmentWorkLog
);

router.put(
  "/department/:id/raise-concern",
  protect,
  isHoD,
  requireModulePermission("worklog", "worklog.entry.review", { legacyAllowed: true }),
  raiseDepartmentConcern
);

// Admin/HR/Manager routes
router.get(
  "/all",
  protect,
  authorizeRoles(...WORKLOG_REVIEW_ROLES),
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  getAllWorkLogs
);

router.get(
  "/employee/:employeeId",
  protect,
  authorizeRoles(...WORKLOG_REVIEW_ROLES),
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  getEmployeeWorkLogs
);

router.put(
  "/:id/review",
  protect,
  authorizeRoles(...WORKLOG_REVIEW_ROLES),
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  reviewWorkLog
);

router.put(
  "/:id/raise-concern",
  protect,
  authorizeRoles(...WORKLOG_REVIEW_ROLES),
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  raiseConcern
);

router.put(
  "/:id/update",
  protect,
  authorizeRoles(...WORKLOG_REVIEW_ROLES),
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  updateWorkLog
);

router.get(
  "/stats",
  protect,
  authorizeRoles(...WORKLOG_REVIEW_ROLES),
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  getWorkLogStats
);

router.get(
  "/export",
  protect,
  authorizeRoles(...WORKLOG_REVIEW_ROLES),
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  exportWorkLogs
);

export default router;
