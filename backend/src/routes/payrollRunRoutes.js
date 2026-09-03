import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  dualRunEmployee,
  dualRunStructurePreview,
  dualRunMonth,
} from "../controllers/payrollRunController.js";

const router = express.Router();

const RUN_PROCESS_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];

const requireRunProcess = requireModulePermission(
  "finance",
  "payroll.run.process",
  { legacyRoles: RUN_PROCESS_ROLES }
);

router.post("/dual-run", protect, requireRunProcess, dualRunEmployee);
router.post(
  "/dual-run/preview",
  protect,
  requireRunProcess,
  dualRunStructurePreview
);
router.post("/dual-run/month", protect, requireRunProcess, dualRunMonth);

export default router;
