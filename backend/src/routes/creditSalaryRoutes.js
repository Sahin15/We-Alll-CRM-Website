import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import { creditSalary } from "../controllers/creditSalaryController.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];

const requireSlipManage = requireModulePermission(
  "finance",
  "payroll.slip.manage",
  { legacyRoles: PAYROLL_MANAGE_ROLES }
);

router.post("/", protect, requireSlipManage, creditSalary);

export default router;
