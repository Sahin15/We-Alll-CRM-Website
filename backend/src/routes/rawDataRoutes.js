import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  createRecord,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
  checkDuplicate,
  lockRecord,
  unlockRecord,
  updateCallResult,
  getCallHistory,
  getTodayQueue,
  assignRecord,
  bulkAssign,
  reassignRecord,
  convertToLead,
  batchImport,
  getDashboardSummary,
  getSourceAnalysis,
  getCategoryAnalysis,
} from "../controllers/rawDataController.js";

const router = express.Router();

const CRM_RAWDATA_ROLES = ["admin", "superadmin", "sales"];

const crmRawDataManage = requireModulePermission("crm", "crm.rawdata.manage", {
  legacyRoles: CRM_RAWDATA_ROLES,
});

const rawDataAnalytics = requireModulePermission("reports", "reports.analytics.view", {
  legacyRoles: ["admin", "superadmin", "hr", "manager"],
});

router.use(protect);

router.get("/dashboard/summary", rawDataAnalytics, getDashboardSummary);
router.get("/dashboard/source-analysis", rawDataAnalytics, getSourceAnalysis);
router.get("/dashboard/category-analysis", rawDataAnalytics, getCategoryAnalysis);

router.get("/queue/today", crmRawDataManage, getTodayQueue);

router.post("/check-duplicate", crmRawDataManage, checkDuplicate);
router.post("/batch-import", crmRawDataManage, batchImport);
router.post("/bulk-assign", crmRawDataManage, bulkAssign);

router.get("/", crmRawDataManage, getRecords);
router.post("/", crmRawDataManage, createRecord);
router.get("/:id", crmRawDataManage, getRecord);
router.put("/:id", crmRawDataManage, updateRecord);
router.delete("/:id", crmRawDataManage, deleteRecord);

router.post("/:id/lock", crmRawDataManage, lockRecord);
router.post("/:id/unlock", crmRawDataManage, unlockRecord);
router.post("/:id/call-result", crmRawDataManage, updateCallResult);
router.get("/:id/history", crmRawDataManage, getCallHistory);

router.post("/:id/assign", crmRawDataManage, assignRecord);
router.post("/:id/reassign", crmRawDataManage, reassignRecord);
router.post("/:id/convert-to-lead", crmRawDataManage, convertToLead);

export default router;
