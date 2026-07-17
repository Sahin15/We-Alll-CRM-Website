import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  listSalaryComponents,
  getSalaryComponent,
  createSalaryComponent,
  updateSalaryComponent,
  deactivateSalaryComponent,
  seedDefaultSalaryComponents,
} from "../controllers/salaryComponentController.js";

const router = express.Router();

const COMPONENT_MANAGE_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "accounts",
  "manager",
];

const requireComponentManage = requireModulePermission(
  "finance",
  "payroll.component.manage",
  { legacyRoles: COMPONENT_MANAGE_ROLES }
);

// Static routes before parameterized
router.get("/", protect, requireComponentManage, listSalaryComponents);
router.post("/", protect, requireComponentManage, createSalaryComponent);
router.post(
  "/seed-defaults",
  protect,
  requireComponentManage,
  seedDefaultSalaryComponents
);
router.get("/:idOrCode", protect, requireComponentManage, getSalaryComponent);
router.put("/:id", protect, requireComponentManage, updateSalaryComponent);
router.delete(
  "/:id",
  protect,
  requireComponentManage,
  deactivateSalaryComponent
);

export default router;
