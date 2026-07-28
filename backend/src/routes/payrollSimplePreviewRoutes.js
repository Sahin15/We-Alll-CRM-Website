import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import { getSimplePreview } from "../controllers/payrollSimplePreviewController.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "accounts",
  "manager",
];
const PAYROLL_SELF_ROLES = [
  "employee",
  "hod",
  "sales",
  "hr",
  "admin",
  "superadmin",
  "accounts",
  "manager",
];

const requireSlipManage = requireModulePermission(
  "finance",
  "payroll.slip.manage",
  { legacyRoles: PAYROLL_MANAGE_ROLES }
);

const requireViewSelf = requireModulePermission(
  "finance",
  "payroll.slip.view_self",
  { legacyRoles: PAYROLL_SELF_ROLES }
);

/**
 * HR/accounts: any employee. Employees: only their own id (same as My Salary Preview).
 */
function requireSimplePreviewAccess(req, res, next) {
  const requested = String(req.query.employee || "");
  const selfId = String(req.user?.id || req.user?._id || "");
  if (requested && selfId && requested === selfId) {
    return requireViewSelf(req, res, next);
  }
  return requireSlipManage(req, res, next);
}

router.get("/", protect, requireSimplePreviewAccess, getSimplePreview);

export default router;
