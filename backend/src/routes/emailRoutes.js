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
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const CRM_EMAIL_ROLES = ["admin", "superadmin", "hr", "manager"];
const EMAIL_ADMIN_ROLES = ["admin", "superadmin"];

const crmEmailAccess = requireModulePermission("crm", "crm.lead.manage", {
  legacyRoles: CRM_EMAIL_ROLES,
});
const emailAdminAccess = requireModulePermission("auth", "auth.role.manage", {
  legacyRoles: EMAIL_ADMIN_ROLES,
});

router.post("/bulk-send", protect, crmEmailAccess, sendBulkEmail);

router.get("/templates", getEmailTemplates);

router.post("/preview", protect, crmEmailAccess, previewEmail);

router.get("/test-config", protect, emailAdminAccess, testEmailConfig);

router.post("/test-send", protect, emailAdminAccess, sendTestEmail);

router.get("/lead/:leadId/history", protect, getLeadEmailHistory);

router.get("/campaigns/stats", protect, crmEmailAccess, getEmailCampaignStats);

router.get("/campaigns/recent", protect, crmEmailAccess, getRecentEmailCampaigns);

export default router;
