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
import { canManageProject } from "../middleware/hopMiddleware.js";
import ProjectMonth from "../models/projectMonthModel.js";

const router = express.Router();

const PROJECT_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager", "employee", "client"];
const PROJECT_MANAGE_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];

/** Resolve project month id to project id for canManageProject checks. */
const loadProjectMonthProjectId = async (req, res, next) => {
  try {
    const projectMonth = await ProjectMonth.findById(req.params.id).select("project");
    if (!projectMonth) {
      return res.status(404).json({ message: "Project month record not found" });
    }
    req.params.projectId = projectMonth.project.toString();
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

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
  loadProjectMonthProjectId,
  canManageProject,
  updateProjectMonthGoals
);

router.post(
  "/project-months/:id/submit",
  requireModulePermission("projects", "projects.report.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  submitProjectMonthReport
);

router.post(
  "/project-months/:id/review",
  requireModulePermission("projects", "projects.report.approve", { legacyRoles: ["admin", "superadmin", "hod", "manager", "hr"] }),
  reviewProjectMonthReport
);

export default router;
