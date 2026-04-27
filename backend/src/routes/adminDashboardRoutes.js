import express from "express";
import { getAdminDashboardStats } from "../controllers/adminDashboardController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Admin dashboard stats - accessible by admin, superadmin, accounts, manager, and hod roles
router.get("/stats", protect, authorizeRoles("admin", "superadmin", "accounts", "manager", "hod"), getAdminDashboardStats);

export default router;

