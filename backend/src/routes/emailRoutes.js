import express from "express";
import {
  sendBulkEmail,
  getEmailTemplates,
  previewEmail,
  testEmailConfig,
  sendTestEmail,
  getLeadEmailHistory,
  getEmailCampaignStats,
  getRecentEmailCampaigns,
} from "../controllers/emailController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Bulk email sending (temporarily allow all authenticated users)
router.post(
  "/bulk-send",
  protect,
  // authorizeRoles("admin", "superadmin", "hr", "manager"), // Temporarily commented out for testing
  sendBulkEmail
);

// Get available email templates (public endpoint for template metadata)
router.get(
  "/templates",
  // Temporarily allow public access for template metadata
  getEmailTemplates
);

// Preview email template
router.post(
  "/preview",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  previewEmail
);

// Test email configuration (Admin/SuperAdmin only)
router.get(
  "/test-config",
  protect,
  authorizeRoles("admin", "superadmin"),
  testEmailConfig
);

// Send test email (Admin/SuperAdmin only)
router.post(
  "/test-send",
  protect,
  authorizeRoles("admin", "superadmin"),
  sendTestEmail
);

// Get email history for a specific lead
router.get(
  "/lead/:leadId/history",
  protect,
  getLeadEmailHistory
);

// Get email campaign statistics
router.get(
  "/campaigns/stats",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  getEmailCampaignStats
);

// Get recent email campaigns
router.get(
  "/campaigns/recent",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  getRecentEmailCampaigns
);

export default router;