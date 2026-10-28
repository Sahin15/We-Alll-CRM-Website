import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import { attachDepartmentForAuthz } from "../authz/attachDepartmentContext.js";
import {
  actOnSocialPost,
  createSocialAccount,
  createSocialPost,
  deleteSocialAccount,
  getSocialAccounts,
  getSocialAnalytics,
  getSocialClients,
  getSocialOverview,
  getSocialPosts,
  getSocialSettings,
  updateSocialAccount,
  updateSocialPost,
  updateSocialSettings,
} from "../controllers/socialMediaController.js";

const router = express.Router();

const SOCIAL_ROLES = ["admin", "superadmin", "manager"];
const SOCIAL_DEPARTMENTS = ["Social Media", "Digital Marketing", "Posting", "Social Media Marketing"];

const viewAccess = requireModulePermission("crm", "crm.social.view", {
  legacyRoles: SOCIAL_ROLES,
  legacyDepartments: SOCIAL_DEPARTMENTS,
});
const manageAccess = requireModulePermission("crm", "crm.social.manage", {
  legacyRoles: SOCIAL_ROLES,
  legacyDepartments: SOCIAL_DEPARTMENTS,
});

router.use(protect, attachDepartmentForAuthz);

router.get("/overview", viewAccess, getSocialOverview);
router.get("/analytics", viewAccess, getSocialAnalytics);
router.get("/clients", viewAccess, getSocialClients);
router.get("/accounts", viewAccess, getSocialAccounts);
router.post("/accounts", manageAccess, createSocialAccount);
router.put("/accounts/:id", manageAccess, updateSocialAccount);
router.delete("/accounts/:id", manageAccess, deleteSocialAccount);
router.get("/posts", viewAccess, getSocialPosts);
router.post("/posts", manageAccess, createSocialPost);
router.put("/posts/:id", manageAccess, updateSocialPost);
router.post("/posts/:id/:action", manageAccess, actOnSocialPost);
router.get("/settings", viewAccess, getSocialSettings);
router.put("/settings", manageAccess, updateSocialSettings);

export default router;
