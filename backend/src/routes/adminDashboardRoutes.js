import express from "express";
import { getAdminDashboardStats } from "../controllers/adminDashboardController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin dashboard stats
router.get("/stats", protect, authorize("admin"), getAdminDashboardStats);

export default router;
