import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  enqueueBulkGenerateJob,
  enqueueBulkEmailJob,
  listJobs,
  getJobById,
} from "../controllers/payrollJobController.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];

const requireSlipManage = requireModulePermission(
  "finance",
  "payroll.slip.manage",
  { legacyRoles: PAYROLL_MANAGE_ROLES }
);

// Static paths before :id
router.get("/", protect, requireSlipManage, listJobs);
router.post("/bulk-generate", protect, requireSlipManage, enqueueBulkGenerateJob);
router.post("/bulk-email", protect, requireSlipManage, enqueueBulkEmailJob);
router.get("/:id", protect, requireSlipManage, getJobById);

export default router;
