import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  getCompensationRosterHandler,
  getCompensationTimelineHandler,
} from "../controllers/compensationController.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "accounts",
  "manager",
];

router.get(
  "/roster",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", {
    legacyRoles: PAYROLL_MANAGE_ROLES,
  }),
  getCompensationRosterHandler
);

router.get(
  "/employees/:employeeId/timeline",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", {
    legacyRoles: PAYROLL_MANAGE_ROLES,
  }),
  getCompensationTimelineHandler
);

export default router;
