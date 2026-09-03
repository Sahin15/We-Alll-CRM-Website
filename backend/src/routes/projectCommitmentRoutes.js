import express from "express";
import {
  getProjectCommitments,
  createProjectCommitment,
  updateProjectCommitment,
  deleteProjectCommitment,
} from "../controllers/projectCommitmentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PROJECT_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager", "employee", "client"];
const PROJECT_MANAGE_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];

router.use(protect);

// Commitment routes
router.get(
  "/projects/:projectId/commitments",
  requireModulePermission("projects", "projects.project.view", { legacyRoles: PROJECT_VIEW_ROLES }),
  getProjectCommitments
);

router.post(
  "/projects/:projectId/commitments",
  requireModulePermission("projects", "projects.project.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  createProjectCommitment
);

router.put(
  "/commitments/:id",
  requireModulePermission("projects", "projects.project.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  updateProjectCommitment
);

router.delete(
  "/commitments/:id",
  requireModulePermission("projects", "projects.project.manage", { legacyRoles: PROJECT_MANAGE_ROLES }),
  deleteProjectCommitment
);

export default router;
