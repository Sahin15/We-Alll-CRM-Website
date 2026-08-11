import express from "express";
import { getProjectActivityLogs } from "../controllers/projectActivityController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager", "employee", "client"];

router.use(protect);

router.get(
  "/projects/:projectId/activities",
  requireModulePermission("projects", "projects.project.view", { legacyRoles: VIEW_ROLES }),
  getProjectActivityLogs
);

router.get(
  "/clients/:clientId/activities",
  requireModulePermission("crm", "crm.client.view", { legacyRoles: VIEW_ROLES }),
  getProjectActivityLogs
);

export default router;
