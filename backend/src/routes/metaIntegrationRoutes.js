import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import { attachDepartmentForAuthz } from "../authz/attachDepartmentContext.js";
import {
  disconnect,
  getAnalytics,
  getLeadDashboard,
  getMetaLeads,
  getStatus,
  getSyncRuns,
  configureAdAccount,
  updatePageClient,
  oauthCallback,
  receiveWebhook,
  refreshMetaAssets,
  startOAuth,
  syncNow,
  updateSelection,
  verifyWebhook,
} from "../controllers/metaIntegrationController.js";

const router = express.Router();

const META_ROLES = ["admin", "superadmin", "manager"];
const metaView = requireModulePermission("crm", "crm.meta.view", { legacyRoles: META_ROLES });
const metaManage = requireModulePermission("crm", "crm.meta.manage", { legacyRoles: META_ROLES });

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many webhook requests" },
});

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many Meta authorization attempts" },
});

router.get("/webhook", webhookLimiter, verifyWebhook);
router.post("/webhook", webhookLimiter, receiveWebhook);
router.get("/oauth/callback", oauthLimiter, oauthCallback);

router.use(protect, attachDepartmentForAuthz);

router.get("/status", metaView, getStatus);
router.get("/oauth/start", oauthLimiter, metaManage, startOAuth);
router.post("/assets/refresh", metaManage, refreshMetaAssets);
router.put("/selection", metaManage, updateSelection);
router.post("/sync", metaManage, syncNow);
router.get("/sync-runs", metaView, getSyncRuns);
router.get("/analytics", metaView, getAnalytics);
router.get("/dashboard", metaView, getLeadDashboard);
router.get("/leads", metaView, getMetaLeads);
router.put("/pages/:pageId/client", metaManage, updatePageClient);
router.put("/ad-accounts/:accountId/config", metaManage, configureAdAccount);
router.post("/disconnect", metaManage, disconnect);

export default router;
