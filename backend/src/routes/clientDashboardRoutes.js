import express from "express";
import {
  getClientDashboardStats,
  getClientDashboardStatsById,
} from "../controllers/clientDashboardController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

// Get logged-in client's dashboard stats
router.get(
  "/stats",
  protect,
  requireModulePermission("dashboard", "dashboard.view", { legacyRoles: ["client"] }),
  getClientDashboardStats
);

// Get specific client's dashboard stats (admin view)
router.get(
  "/stats/:clientId",
  protect,
  requireModulePermission("dashboard", "dashboard.view", {
    legacyRoles: ["admin", "superadmin", "accounts"],
  }),
  getClientDashboardStatsById
);

export default router;
