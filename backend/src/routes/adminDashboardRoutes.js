import express from "express";
import { getAdminDashboardStats } from "../controllers/adminDashboardController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin dashboard stats - accessible by admin, superadmin, and accounts roles
router.get("/stats", protect, authorize("admin", "superadmin", "accounts"), getAdminDashboardStats);

export default router;
