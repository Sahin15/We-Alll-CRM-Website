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

const router = express.Router();

// Public routes (for clients to view services)
router.get("/", getAllServices);
router.get("/categories", getCategories);
router.get("/by-category", getServicesByCategory);
router.get("/:id", getServiceById);

// Protected routes (admin only)
router.post("/", protect, authorizeRoles("admin", "superadmin"), createService);
router.put("/:id", protect, authorizeRoles("admin", "superadmin"), updateService);
router.delete("/:id", protect, authorizeRoles("admin", "superadmin"), deleteService);
router.patch("/:id/toggle-status", protect, authorizeRoles("admin", "superadmin"), toggleServiceStatus);
router.post("/display-order", protect, authorizeRoles("admin", "superadmin"), updateDisplayOrder);

export default router;
