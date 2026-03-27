import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createRecord, getRecords, getRecord, updateRecord, deleteRecord,
  checkDuplicate,
  lockRecord, unlockRecord, updateCallResult, getCallHistory,
  getTodayQueue,
  assignRecord, bulkAssign, reassignRecord,
  convertToLead,
  batchImport,
  getDashboardSummary, getSourceAnalysis, getCategoryAnalysis,
} from "../controllers/rawDataController.js";

const router = express.Router();

router.use(protect);

// Dashboard
router.get("/dashboard/summary", getDashboardSummary);
router.get("/dashboard/source-analysis", getSourceAnalysis);
router.get("/dashboard/category-analysis", getCategoryAnalysis);

// Queue
router.get("/queue/today", getTodayQueue);

// Duplicate check & batch import
router.post("/check-duplicate", checkDuplicate);
router.post("/batch-import", batchImport);

// Bulk assign
router.post("/bulk-assign", bulkAssign);

// CRUD
router.route("/").get(getRecords).post(createRecord);
router.route("/:id").get(getRecord).put(updateRecord).delete(deleteRecord);

// Calling operations
router.post("/:id/lock", lockRecord);
router.post("/:id/unlock", unlockRecord);
router.post("/:id/call-result", updateCallResult);
router.get("/:id/history", getCallHistory);

// Assignment
router.post("/:id/assign", assignRecord);
router.post("/:id/reassign", reassignRecord);

// Conversion
router.post("/:id/convert-to-lead", convertToLead);

export default router;
