import express from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  updateProjectProgress,
  assignUserToProject,
  removeUserFromProject,
  getProjectsForUser,
  addMilestone,
  updateMilestone,
  addTask,
  updateTask,
  addDeliverable,
  updateDeliverable,
  deleteProject,
} from "../controllers/projectController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create new project (Admin / Manager)
router.post("/", protect, authorizeRoles("admin", "manager"), createProject);

// Get all projects (Admin / Manager / User)
router.get("/", protect, getProjects);

// Update project status
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "hod"),
  updateProjectStatus
);

// Assign and remove users
router.put(
  "/:projectId/assign/:userId",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "hod"),
  assignUserToProject
);
router.put(
  "/:projectId/remove/:userId",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "hod"),
  removeUserFromProject
);

// Get logged-in user's projects
router.get("/my-projects", protect, getProjectsForUser);

// Get single project (clients restricted to own)
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "employee", "client"),
  getProjectById
);

// Update project (full update)
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "hod"),
  updateProject
);

// Update project progress
router.put(
  "/:id/progress",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "employee", "hod"),
  updateProjectProgress
);

// Milestone management
router.post(
  "/:id/milestones",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "hod"),
  addMilestone
);
router.put(
  "/:id/milestones/:milestoneId",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "hod"),
  updateMilestone
);

// Task management
router.post(
  "/:id/tasks",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "hod"),
  addTask
);
router.put(
  "/:id/tasks/:taskId",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "employee"),
  updateTask
);

// Deliverable management
router.post(
  "/:id/deliverables",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "employee"),
  addDeliverable
);
router.put(
  "/:id/deliverables/:deliverableId",
  protect,
  authorizeRoles("admin", "superadmin", "manager", "hod"),
  updateDeliverable
);

// Delete project
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteProject
);

export default router;
