import express from "express";
import {
  createService,
  getAllServices,
  getServicesByCategory,
  getServiceById,
  updateService,
  deleteService,
  toggleServiceStatus,
  getCategories,
  updateDisplayOrder,
} from "../controllers/serviceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const SERVICE_ADMIN_ROLES = ["admin", "superadmin"];
const serviceManage = requireModulePermission("billing", "billing.subscription.manage", {
  legacyRoles: SERVICE_ADMIN_ROLES,
});

router.get("/", getAllServices);
router.get("/categories", getCategories);
router.get("/by-category", getServicesByCategory);
router.get("/:id", getServiceById);

router.post("/", protect, authorizeRoles(...SERVICE_ADMIN_ROLES), serviceManage, createService);
router.put("/:id", protect, authorizeRoles(...SERVICE_ADMIN_ROLES), serviceManage, updateService);
router.delete("/:id", protect, authorizeRoles(...SERVICE_ADMIN_ROLES), serviceManage, deleteService);
router.patch(
  "/:id/toggle-status",
  protect,
  authorizeRoles(...SERVICE_ADMIN_ROLES),
  serviceManage,
  toggleServiceStatus
);
router.post(
  "/display-order",
  protect,
  authorizeRoles(...SERVICE_ADMIN_ROLES),
  serviceManage,
  updateDisplayOrder
);

export default router;
