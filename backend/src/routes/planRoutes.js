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

const router = express.Router();

// Public routes
router.get("/", getAllPlans);
router.get("/comparison", getPlansForComparison);
router.get("/:id", getPlanById);

// Admin/Superadmin routes
router.post("/", protect, authorizeRoles("admin", "superadmin"), createPlan);
router.put("/:id", protect, authorizeRoles("admin", "superadmin"), updatePlan);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deletePlan
);
router.put(
  "/:id/toggle-status",
  protect,
  authorizeRoles("admin", "superadmin"),
  togglePlanStatus
);

// Service management in plans
router.post(
  "/:id/services",
  protect,
  authorizeRoles("admin", "superadmin"),
  addServiceToPlan
);
router.delete(
  "/:id/services/:serviceId",
  protect,
  authorizeRoles("admin", "superadmin"),
  removeServiceFromPlan
);
router.patch(
  "/:id/services/:serviceId/price",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateServicePrice
);

export default router;
