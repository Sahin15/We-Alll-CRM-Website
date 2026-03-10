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
  getProjectsForEmployee,
  addMilestone,
  updateMilestone,
  addTask,
  updateTask,
  addDeliverable,
  updateDeliverable,
  deleteProject,
  assignProjectHead,
  removeProjectHead,
  assignProjectToDepartment,
  assignHoP,
  addTeamMember,
  removeTeamMember,
  getProjectTeam,
  getMyLeadingProjects,
  getMyDepartmentProjects,
} from "../controllers/projectController.js";
import {
  getProjectWorkspace,
  getWorkBoard,
  getProjectTeam as getProjectTeamWorkload,
} from "../controllers/projectWorkspaceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { canAssignHoP } from "../middleware/hodMiddleware.js";
import { isHoPOfProject, canManageProject } from "../middleware/hopMiddleware.js";

const router = express.Router();

// Create new project (Admin / SuperAdmin / HR / Manager / HoD)
router.post("/", protect, authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), createProject);

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

// Assign and remove project head (SIMPLIFIED - HR/Admin/Manager can assign directly)
router.put(
  "/:projectId/project-head",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  assignProjectHead
);
router.delete(
  "/:projectId/project-head",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  removeProjectHead
);

// HoP/Project Manager Management Routes (SIMPLIFIED)
router.post(
  "/:projectId/assign-department",
  protect,
  authorizeRoles("admin", "superadmin", "manager"),
  assignProjectToDepartment
);
router.post(
  "/:projectId/assign-hop",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  assignHoP
);

// Team Management (HoP, HoD, Admin)
router.post(
  "/:projectId/team/add",
  protect,
  canManageProject,
  addTeamMember
);
router.delete(
  "/:projectId/team/:userId",
  protect,
  canManageProject,
  removeTeamMember
);
router.get(
  "/:projectId/team",
  protect,
  canManageProject,
  getProjectTeam
);

// Get logged-in user's projects
router.get("/my-projects", protect, getProjectsForUser);

// Get projects for a specific employee (HR/Admin viewing)
router.get("/employee/:employeeId", protect, getProjectsForEmployee);

// HoP Routes - Get projects where I'm the head
router.get("/my-leading", protect, getMyLeadingProjects);

// HoD Routes - Get projects in my department
router.get("/my-department", protect, getMyDepartmentProjects);

// Get single project (clients restricted to own)
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod", "employee", "client"),
  getProjectById
);

// Update project (full update)
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
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
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  deleteProject
);

// Project Workspace endpoints
router.get("/:id/workspace", protect, getProjectWorkspace);
router.get("/:id/work-board", protect, getWorkBoard);
router.get("/:id/team-workload", protect, getProjectTeamWorkload);

export default router;


// ============================================
// SLOT-BASED PROJECT TRACKING ROUTES
// ============================================

import {
  enableSlotsForProject,
  getProjectSlots,
  createProjectSlot,
  updateProjectSlot,
  deleteProjectSlot
} from "../controllers/workCalendarController.js";

import {
  getWorkItemsGroupedBySlots
} from "../controllers/workItemController.js";

// Enable slot system for existing project
router.post(
  "/:projectId/slots/enable",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  enableSlotsForProject
);

// Get all slots for a project
router.get(
  "/:projectId/slots",
  protect,
  getProjectSlots
);

// Create a new slot for a project
router.post(
  "/:projectId/slots",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod", "hop"),
  createProjectSlot
);

// Update slot details
router.put(
  "/:projectId/slots/:slotId",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod", "hop"),
  updateProjectSlot
);

// Delete a slot (restricted to HR, Manager, Admin, SuperAdmin)
router.delete(
  "/:projectId/slots/:slotId",
  protect,
  authorizeRoles("hr", "manager", "admin", "superadmin"),
  deleteProjectSlot
);

// Get work items grouped by slots
router.get(
  "/:projectId/workitems/grouped-by-slots",
  protect,
  getWorkItemsGroupedBySlots
);
