import express from "express";
import { getAdminDashboardStats } from "../controllers/adminDashboardController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const ADMIN_DASHBOARD_ROLES = ["admin", "superadmin", "accounts", "manager", "hod"];

// Admin dashboard stats - accessible by admin, superadmin, accounts, manager, and hod roles
router.get(
  "/stats",
  protect,
  requireModulePermission("dashboard", "dashboard.view", { legacyRoles: ADMIN_DASHBOARD_ROLES }),
  getAdminDashboardStats
);

export default router;

