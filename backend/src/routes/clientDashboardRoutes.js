import express from "express";
import {
  getClientDashboardStats,
  getClientDashboardStatsById,
} from "../controllers/clientDashboardController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get logged-in client's dashboard stats
router.get(
  "/stats",
  protect,
  authorizeRoles("client"),
  getClientDashboardStats
);

// Get specific client's dashboard stats (admin view)
router.get(
  "/stats/:clientId",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  getClientDashboardStatsById
);

export default router;
