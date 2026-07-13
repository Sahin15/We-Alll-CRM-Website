import express from "express";
import {
  createAddOn,
  getAllAddOns,
  getAddOnById,
  updateAddOn,
  deleteAddOn,
  toggleAddOnStatus,
} from "../controllers/addOnController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const ADDON_ADMIN_ROLES = ["admin", "superadmin"];
const addOnManage = requireModulePermission("billing", "billing.subscription.manage", {
  legacyRoles: ADDON_ADMIN_ROLES,
});

router.get("/", getAllAddOns);
router.get("/:id", getAddOnById);

router.post("/", protect, authorizeRoles(...ADDON_ADMIN_ROLES), addOnManage, createAddOn);
router.put("/:id", protect, authorizeRoles(...ADDON_ADMIN_ROLES), addOnManage, updateAddOn);
router.delete("/:id", protect, authorizeRoles(...ADDON_ADMIN_ROLES), addOnManage, deleteAddOn);
router.put(
  "/:id/toggle-status",
  protect,
  authorizeRoles(...ADDON_ADMIN_ROLES),
  addOnManage,
  toggleAddOnStatus
);

export default router;
