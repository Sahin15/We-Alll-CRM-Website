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
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PLAN_ADMIN_ROLES = ["admin", "superadmin"];
const planManage = requireModulePermission("billing", "billing.subscription.manage", {
  legacyRoles: PLAN_ADMIN_ROLES,
});

router.get("/", getAllPlans);
router.get("/comparison", getPlansForComparison);
router.get("/:id", getPlanById);

router.post("/", protect, planManage, createPlan);
router.put("/:id", protect, planManage, updatePlan);
router.delete("/:id", protect, planManage, deletePlan);
router.put("/:id/toggle-status", protect, planManage, togglePlanStatus);
router.post("/:id/services", protect, planManage, addServiceToPlan);
router.delete(
  "/:id/services/:serviceId",
  protect,
  planManage,
  removeServiceFromPlan
);
router.patch(
  "/:id/services/:serviceId/price",
  protect,
  planManage,
  updateServicePrice
);

export default router;
