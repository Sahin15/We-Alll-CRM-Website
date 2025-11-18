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

const router = express.Router();

// Public route - get all active add-ons
router.get("/", getAllAddOns);

// Get add-on by ID
router.get("/:id", getAddOnById);

// Admin/Superadmin routes
router.post("/", protect, authorizeRoles("admin", "superadmin"), createAddOn);
router.put("/:id", protect, authorizeRoles("admin", "superadmin"), updateAddOn);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteAddOn
);
router.put(
  "/:id/toggle-status",
  protect,
  authorizeRoles("admin", "superadmin"),
  toggleAddOnStatus
);

export default router;
