import express from "express";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const REPORT_VIEW_ROLES = ["admin", "superadmin", "hr", "manager"];

router.use(protect);

/**
 * Lightweight access probe for the HR reports module.
 * Aggregated analytics are composed client-side from team/leave/attendance APIs.
 */
router.get(
  "/access",
  requireModulePermission("reports", "reports.analytics.view", {
    legacyRoles: REPORT_VIEW_ROLES,
  }),
  (req, res) => {
    res.json({
      success: true,
      module: "reports",
      canViewAnalytics: true,
    });
  }
);

export default router;
