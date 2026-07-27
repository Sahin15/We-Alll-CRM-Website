import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  openPayrollPeriod,
  listPayrollPeriods,
  getPayrollPeriodById,
  getPayrollPeriodByYearMonth,
  getPeriodGatesStatus,
  freezePayrollPeriod,
  unfreezePayrollPeriod,
  lockPayrollPeriod,
  unlockPayrollPeriod,
  markPayrollPeriodPaid,
} from "../controllers/payrollPeriodController.js";

const router = express.Router();

const PERIOD_MANAGE_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];
const PERIOD_READ_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "accounts",
  "manager",
];

const requirePeriodManage = requireModulePermission(
  "finance",
  "payroll.period.manage",
  { legacyRoles: PERIOD_MANAGE_ROLES }
);

/** Gate status is needed by generate/export UIs (slip.manage / bank.export cohorts). */
const requirePeriodGateRead = requireModulePermission(
  "finance",
  "payroll.slip.manage",
  { legacyRoles: PERIOD_READ_ROLES }
);

// Static / nested paths before :id
router.get("/", protect, requirePeriodManage, listPayrollPeriods);
router.post("/", protect, requirePeriodManage, openPayrollPeriod);
router.get(
  "/gates-status",
  protect,
  requirePeriodGateRead,
  getPeriodGatesStatus
);
router.get(
  "/:year/:month",
  protect,
  requirePeriodManage,
  getPayrollPeriodByYearMonth
);

router.get("/:id", protect, requirePeriodManage, getPayrollPeriodById);
router.post("/:id/freeze", protect, requirePeriodManage, freezePayrollPeriod);
router.post("/:id/unfreeze", protect, requirePeriodManage, unfreezePayrollPeriod);
router.post("/:id/lock", protect, requirePeriodManage, lockPayrollPeriod);
router.post("/:id/unlock", protect, requirePeriodManage, unlockPayrollPeriod);
router.post(
  "/:id/mark-paid",
  protect,
  requirePeriodManage,
  markPayrollPeriodPaid
);

export default router;
