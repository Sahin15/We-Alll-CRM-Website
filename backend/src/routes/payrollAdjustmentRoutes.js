import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  listAdjustments,
  createAdjustment,
  createLateDeductionFromChoice,
  createLeaveBalanceDeduction,
  approveAdjustment,
  voidAdjustment,
} from "../controllers/payrollAdjustmentController.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];

const requireSlipManage = requireModulePermission(
  "finance",
  "payroll.slip.manage",
  { legacyRoles: PAYROLL_MANAGE_ROLES }
);

router.get("/", protect, requireSlipManage, listAdjustments);
router.post("/", protect, requireSlipManage, createAdjustment);
router.post(
  "/late-recommendation",
  protect,
  requireSlipManage,
  createLateDeductionFromChoice
);
router.post(
  "/deduct-leave-balance",
  protect,
  requireSlipManage,
  createLeaveBalanceDeduction
);
router.post("/:id/approve", protect, requireSlipManage, approveAdjustment);
router.post("/:id/void", protect, requireSlipManage, voidAdjustment);

export default router;
