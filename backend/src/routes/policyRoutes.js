import express from "express";
import {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getRecentPolicies,
  getPolicyCategories,
} from "../controllers/policyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const POLICY_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];

router.use(protect);

router.get("/", requireModulePermission("company", "company.policy.view"), getPolicies);
router.get("/recent", requireModulePermission("company", "company.policy.view"), getRecentPolicies);
router.get("/categories", requireModulePermission("company", "company.policy.view"), getPolicyCategories);
router.get("/:id", requireModulePermission("company", "company.policy.view"), getPolicyById);

router.post(
  "/",
  authorizeRoles(...POLICY_MANAGE_ROLES),
  requireModulePermission("company", "company.policy.manage", { legacyRoles: POLICY_MANAGE_ROLES }),
  createPolicy
);

router.put(
  "/:id",
  authorizeRoles(...POLICY_MANAGE_ROLES),
  requireModulePermission("company", "company.policy.manage", { legacyRoles: POLICY_MANAGE_ROLES }),
  updatePolicy
);

router.delete(
  "/:id",
  authorizeRoles(...POLICY_MANAGE_ROLES),
  requireModulePermission("company", "company.policy.manage", { legacyRoles: POLICY_MANAGE_ROLES }),
  deletePolicy
);

export default router;
