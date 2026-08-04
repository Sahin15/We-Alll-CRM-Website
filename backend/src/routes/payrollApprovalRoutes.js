import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  createPayrollApproval,
  listPayrollApprovals,
  listMyPendingApprovals,
  getPayrollApprovalById,
  actOnApproval,
  bulkApproveApproval,
  getApprovalCapabilities,
} from "../controllers/payrollApprovalController.js";

const router = express.Router();

const APPROVAL_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];

const requireApprovalManage = requireModulePermission(
  "finance",
  "payroll.approval.manage",
  { legacyRoles: APPROVAL_ROLES }
);

// Static before :id
router.get("/", protect, requireApprovalManage, listPayrollApprovals);
router.get(
  "/capabilities",
  protect,
  requireApprovalManage,
  getApprovalCapabilities
);
router.post("/", protect, requireApprovalManage, createPayrollApproval);
router.get(
  "/pending/mine",
  protect,
  requireApprovalManage,
  listMyPendingApprovals
);
router.get("/:id", protect, requireApprovalManage, getPayrollApprovalById);
router.post("/:id/act", protect, requireApprovalManage, actOnApproval);
router.post(
  "/:id/bulk-approve",
  protect,
  requireApprovalManage,
  bulkApproveApproval
);

export default router;
