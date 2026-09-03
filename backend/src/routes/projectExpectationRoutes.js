import express from "express";
import {
  getProjectExpectations,
  createProjectExpectation,
  updateProjectExpectation,
  deleteProjectExpectation,
} from "../controllers/projectExpectationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PROJECT_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager", "employee", "client"];
const PROJECT_MANAGE_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];

router.use(protect);

// Expectations routes
router.get(
  "/projects/:projectId/expectations",
  requireModulePermission("projects", "projects.project.view", { legacyRoles: PROJECT_VIEW_ROLES }),
  getProjectExpectations
);

router.post(
  "/projects/:projectId/expectations",
  requireModulePermission("projects", "projects.project.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  createProjectExpectation
);

router.put(
  "/expectations/:id",
  requireModulePermission("projects", "projects.project.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  updateProjectExpectation
);

router.delete(
  "/expectations/:id",
  requireModulePermission("projects", "projects.project.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  deleteProjectExpectation
);

export default router;
