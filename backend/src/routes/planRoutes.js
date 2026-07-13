import express from "express";
import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  togglePlanStatus,
  addServiceToPlan,
  removeServiceFromPlan,
  updateServicePrice,
  getPlansForComparison,
} from "../controllers/planController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PLAN_ADMIN_ROLES = ["admin", "superadmin"];
const planManage = requireModulePermission("billing", "billing.subscription.manage", {
  legacyRoles: PLAN_ADMIN_ROLES,
});

router.get("/", getAllPlans);
router.get("/comparison", getPlansForComparison);
router.get("/:id", getPlanById);

router.post("/", protect, authorizeRoles(...PLAN_ADMIN_ROLES), planManage, createPlan);
router.put("/:id", protect, authorizeRoles(...PLAN_ADMIN_ROLES), planManage, updatePlan);
router.delete("/:id", protect, authorizeRoles(...PLAN_ADMIN_ROLES), planManage, deletePlan);
router.put("/:id/toggle-status", protect, authorizeRoles(...PLAN_ADMIN_ROLES), planManage, togglePlanStatus);
router.post("/:id/services", protect, authorizeRoles(...PLAN_ADMIN_ROLES), planManage, addServiceToPlan);
router.delete(
  "/:id/services/:serviceId",
  protect,
  authorizeRoles(...PLAN_ADMIN_ROLES),
  planManage,
  removeServiceFromPlan
);
router.patch(
  "/:id/services/:serviceId/price",
  protect,
  authorizeRoles(...PLAN_ADMIN_ROLES),
  planManage,
  updateServicePrice
);

export default router;
