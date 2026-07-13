import express from "express";
import {
  getClientDashboardStats,
  getClientDashboardStatsById,
} from "../controllers/clientDashboardController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

// Get logged-in client's dashboard stats
router.get(
  "/stats",
  protect,
  authorizeRoles("client"),
  requireModulePermission("dashboard", "dashboard.view", { legacyRoles: ["client"] }),
  getClientDashboardStats
);

// Get specific client's dashboard stats (admin view)
router.get(
  "/stats/:clientId",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  requireModulePermission("dashboard", "dashboard.view", {
    legacyRoles: ["admin", "superadmin", "accounts"],
  }),
  getClientDashboardStatsById
);

export default router;
