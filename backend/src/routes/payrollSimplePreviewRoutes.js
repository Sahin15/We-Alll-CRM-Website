import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import { getSimplePreview } from "../controllers/payrollSimplePreviewController.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];

const requireSlipManage = requireModulePermission(
  "finance",
  "payroll.slip.manage",
  { legacyRoles: PAYROLL_MANAGE_ROLES }
);

router.get("/", protect, requireSlipManage, getSimplePreview);

export default router;
