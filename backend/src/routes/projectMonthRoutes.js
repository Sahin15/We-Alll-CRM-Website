import express from "express";
import {
  getOrCreateProjectMonth,
  updateProjectMonthGoals,
  getProjectMonthsHistory,
  getMonthProgress,
  submitProjectMonthReport,
  reviewProjectMonthReport,
} from "../controllers/projectMonthController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PROJECT_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager", "employee", "client"];
const PROJECT_MANAGE_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];

router.use(protect);

// Project Month routes
router.get(
  "/projects/:projectId/month",
  requireModulePermission("projects", "projects.project.view", { legacyRoles: PROJECT_VIEW_ROLES }),
  getOrCreateProjectMonth
);

router.get(
  "/projects/:projectId/month-progress",
  requireModulePermission("projects", "projects.project.view", { legacyRoles: PROJECT_VIEW_ROLES }),
  getMonthProgress
);

router.get(
  "/projects/:projectId/months-history",
  requireModulePermission("projects", "projects.project.view", { legacyRoles: PROJECT_VIEW_ROLES }),
  getProjectMonthsHistory
);

router.put(
  "/project-months/:id",
  requireModulePermission("projects", "projects.project.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  updateProjectMonthGoals
);

router.post(
  "/project-months/:id/submit",
  requireModulePermission("projects", "projects.report.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  submitProjectMonthReport
);

router.post(
  "/project-months/:id/review",
  requireModulePermission("projects", "projects.report.approve", { legacyRoles: ["admin", "superadmin", "hod"] }),
  reviewProjectMonthReport
);

export default router;
