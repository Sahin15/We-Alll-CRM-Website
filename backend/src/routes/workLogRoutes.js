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
import { protect } from '../middleware/authMiddleware.js';


import { isHoD } from "../middleware/hodMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const WORKLOG_REVIEW_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const WORKLOG_SELF_ROLES = [
  "employee",
  "hod",
  "sales",
  "manager",
  "hr",
  "admin",
  "superadmin",
];

const worklogCreate = requireModulePermission("worklog", "worklog.entry.create", {
  legacyRoles: WORKLOG_SELF_ROLES,
});
const worklogViewSelf = requireModulePermission("worklog", "worklog.entry.view_self", {
  legacyRoles: WORKLOG_SELF_ROLES,
});
const worklogReview = requireModulePermission("worklog", "worklog.entry.review", {
  legacyRoles: WORKLOG_REVIEW_ROLES,
});

router.post("/submit", protect, worklogCreate, submitWorkLog);
router.post("/save-draft", protect, worklogCreate, saveDraft);
router.get("/today", protect, worklogViewSelf, getTodayWorkLog);
router.get("/check-status", protect, worklogViewSelf, checkWorkLogStatus);
router.get("/my-logs/export", protect, worklogViewSelf, exportWorkLogs);
router.put("/my-logs/:id", protect, worklogCreate, updateMyWorkLog);
router.get("/my-logs", protect, worklogViewSelf, getMyWorkLogs);
router.post("/late-submission", protect, worklogCreate, lateSubmission);

router.get("/department/logs", protect, isHoD, worklogReview, getDepartmentWorkLogs);
router.put("/department/:id/review", protect, isHoD, worklogReview, reviewDepartmentWorkLog);
router.put("/department/:id/raise-concern", protect, isHoD, worklogReview, raiseDepartmentConcern);

// Admin/HR/Manager routes
router.get(
  "/all",
  protect,
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  getAllWorkLogs
);

router.get(
  "/employee/:employeeId",
  protect,
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  getEmployeeWorkLogs
);

router.put(
  "/:id/review",
  protect,
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  reviewWorkLog
);

router.put(
  "/:id/raise-concern",
  protect,
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  raiseConcern
);

router.put(
  "/:id/update",
  protect,
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  updateWorkLog
);

router.get(
  "/stats",
  protect,
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  getWorkLogStats
);

router.get(
  "/export",
  protect,
  requireModulePermission("worklog", "worklog.entry.review", { legacyRoles: WORKLOG_REVIEW_ROLES }),
  exportWorkLogs
);

export default router;
