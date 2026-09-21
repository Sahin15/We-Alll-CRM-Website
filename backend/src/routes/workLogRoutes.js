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
  getDepartmentWorkLogStats,
} from "../controllers/workLogController.js";
import { protect } from '../middleware/authMiddleware.js';


import { isHoD } from "../middleware/hodMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const WORKLOG_COMPANY_REVIEW_ROLES = ["admin", "superadmin", "hr", "manager"];
const WORKLOG_REVIEW_ROLES = [...WORKLOG_COMPANY_REVIEW_ROLES, "hod"];
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
const worklogCompanyReview = requireModulePermission("worklog", "worklog.entry.review", {
  legacyRoles: WORKLOG_COMPANY_REVIEW_ROLES,
  minScope: "COMPANY",
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
router.get("/department/stats", protect, isHoD, worklogReview, getDepartmentWorkLogStats);
router.put("/department/:id/review", protect, isHoD, worklogReview, reviewDepartmentWorkLog);
router.put("/department/:id/raise-concern", protect, isHoD, worklogReview, raiseDepartmentConcern);

// Admin/HR/Manager routes — company-wide (HoD uses /department/*)
router.get("/all", protect, worklogCompanyReview, getAllWorkLogs);

router.get("/employee/:employeeId", protect, worklogCompanyReview, getEmployeeWorkLogs);

router.put("/:id/review", protect, worklogCompanyReview, reviewWorkLog);

router.put("/:id/raise-concern", protect, worklogCompanyReview, raiseConcern);

router.put("/:id/update", protect, worklogCompanyReview, updateWorkLog);

router.get("/stats", protect, worklogCompanyReview, getWorkLogStats);

router.get("/export", protect, worklogCompanyReview, exportWorkLogs);

export default router;
