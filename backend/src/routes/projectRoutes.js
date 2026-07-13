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
  getProjectCredentials,
  addProjectCredential,
  updateProjectCredential,
  deleteProjectCredential,
} from "../controllers/projectController.js";
import {
  getProjectWorkspace,
  getWorkBoard,
  getProjectTeam as getProjectTeamWorkload,
} from "../controllers/projectWorkspaceController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";
import { canManageProject } from "../middleware/hopMiddleware.js";
import {
  enableSlotsForProject,
  getProjectSlots,
  createProjectSlot,
  updateProjectSlot,
  deleteProjectSlot,
} from "../controllers/workCalendarController.js";
import { getWorkItemsGroupedBySlots } from "../controllers/workItemController.js";

const router = express.Router();

const PROJECT_CREATE_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const PROJECT_UPDATE_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const PROJECT_STATUS_ROLES = ["admin", "superadmin", "manager", "hod"];
const PROJECT_ASSIGN_ROLES = ["admin", "superadmin", "manager", "hod"];
const PROJECT_HEAD_ROLES = ["admin", "superadmin", "hr", "manager"];
const PROJECT_ADMIN_ROLES = ["admin", "superadmin", "manager"];
const PROJECT_VIEW_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "manager",
  "hod",
  "employee",
  "client",
];
const PROJECT_PROGRESS_ROLES = ["admin", "superadmin", "manager", "employee", "hod"];
const PROJECT_MILESTONE_ROLES = ["admin", "superadmin", "manager", "hod"];
const PROJECT_TASK_UPDATE_ROLES = ["admin", "superadmin", "manager", "employee"];
const PROJECT_DELIVERABLE_ADD_ROLES = ["admin", "superadmin", "manager", "employee"];
const PROJECT_DELIVERABLE_UPDATE_ROLES = ["admin", "superadmin", "manager", "hod"];
const PROJECT_DELETE_ROLES = ["admin", "superadmin", "hr", "manager"];
const SLOT_ENABLE_ROLES = ["admin", "superadmin", "hr", "manager"];
const SLOT_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager", "hod", "hop"];
const SLOT_DELETE_ROLES = ["hr", "manager", "admin", "superadmin"];

// Create new project (Admin / SuperAdmin / HR / Manager / HoD)
router.post(
  "/",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_CREATE_ROLES,
  }),
  createProject
);

// Update project (full update) - HoD can edit their own projects
router.put(
  "/:id",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_UPDATE_ROLES,
  }),
  updateProject
);

// Get all projects (controller filters by role)
router.get(
  "/",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getProjects
);

// Update project status
router.put(
  "/:id/status",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_STATUS_ROLES,
  }),
  updateProjectStatus
);

// Assign and remove users
router.put(
  "/:projectId/assign/:userId",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_ASSIGN_ROLES,
  }),
  assignUserToProject
);
router.put(
  "/:projectId/remove/:userId",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_ASSIGN_ROLES,
  }),
  removeUserFromProject
);

// Assign and remove project head
router.put(
  "/:projectId/project-head",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_HEAD_ROLES,
  }),
  assignProjectHead
);
router.delete(
  "/:projectId/project-head",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_HEAD_ROLES,
  }),
  removeProjectHead
);

// HoP/Project Manager Management Routes
router.post(
  "/:projectId/assign-department",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_ADMIN_ROLES,
  }),
  assignProjectToDepartment
);
router.post(
  "/:projectId/assign-hop",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_HEAD_ROLES,
  }),
  assignHoP
);

// Team Management (HoP, HoD, Admin — custom middleware in controller)
router.post(
  "/:projectId/team/add",
  protect,
  canManageProject,
  requireModulePermission("projects", "projects.project.manage", { legacyAllowed: true }),
  addTeamMember
);
router.delete(
  "/:projectId/team/:userId",
  protect,
  canManageProject,
  requireModulePermission("projects", "projects.project.manage", { legacyAllowed: true }),
  removeTeamMember
);
router.get(
  "/:projectId/team",
  protect,
  canManageProject,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getProjectTeam
);

// Get logged-in user's projects
router.get(
  "/my-projects",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getProjectsForUser
);

// Get projects for a specific employee (HR/Admin viewing)
router.get(
  "/employee/:employeeId",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getProjectsForEmployee
);

// HoP Routes - Get projects where I'm the head
router.get(
  "/my-leading",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getMyLeadingProjects
);

// HoD Routes - Get projects in my department
router.get(
  "/my-department",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getMyDepartmentProjects
);

// Get single project (clients restricted to own in controller)
router.get(
  "/:id",
  protect,
  requireModulePermission("projects", "projects.project.view", {
    legacyRoles: PROJECT_VIEW_ROLES,
  }),
  getProjectById
);

// Update project progress
router.put(
  "/:id/progress",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_PROGRESS_ROLES,
  }),
  updateProjectProgress
);

// Milestone management
router.post(
  "/:id/milestones",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_MILESTONE_ROLES,
  }),
  addMilestone
);
router.put(
  "/:id/milestones/:milestoneId",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_MILESTONE_ROLES,
  }),
  updateMilestone
);

// Task management
router.post(
  "/:id/tasks",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_MILESTONE_ROLES,
  }),
  addTask
);
router.put(
  "/:id/tasks/:taskId",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_TASK_UPDATE_ROLES,
  }),
  updateTask
);

// Deliverable management
router.post(
  "/:id/deliverables",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_DELIVERABLE_ADD_ROLES,
  }),
  addDeliverable
);
router.put(
  "/:id/deliverables/:deliverableId",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_DELIVERABLE_UPDATE_ROLES,
  }),
  updateDeliverable
);

// Delete project
router.delete(
  "/:id",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: PROJECT_DELETE_ROLES,
  }),
  deleteProject
);

// Project Workspace endpoints
router.get(
  "/:id/workspace",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getProjectWorkspace
);
router.get(
  "/:id/work-board",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getWorkBoard
);
router.get(
  "/:id/team-workload",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getProjectTeamWorkload
);

// ============================================
// SLOT-BASED PROJECT TRACKING ROUTES
// ============================================

router.post(
  "/:projectId/slots/enable",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: SLOT_ENABLE_ROLES,
  }),
  enableSlotsForProject
);

router.get(
  "/:projectId/slots",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getProjectSlots
);

router.post(
  "/:projectId/slots",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: SLOT_MANAGE_ROLES,
  }),
  createProjectSlot
);

router.put(
  "/:projectId/slots/:slotId",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: SLOT_MANAGE_ROLES,
  }),
  updateProjectSlot
);

router.delete(
  "/:projectId/slots/:slotId",
  protect,
  requireModulePermission("projects", "projects.project.manage", {
    legacyRoles: SLOT_DELETE_ROLES,
  }),
  deleteProjectSlot
);

router.get(
  "/:projectId/workitems/grouped-by-slots",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getWorkItemsGroupedBySlots
);

// ============================================
// PROJECT CREDENTIALS ROUTES
// ============================================

router.get(
  "/:id/credentials",
  protect,
  requireModulePermission("projects", "projects.project.view", { legacyAllowed: true }),
  getProjectCredentials
);

router.post(
  "/:id/credentials",
  protect,
  requireModulePermission("projects", "projects.project.manage", { legacyAllowed: true }),
  addProjectCredential
);

router.put(
  "/:id/credentials/:credentialId",
  protect,
  requireModulePermission("projects", "projects.project.manage", { legacyAllowed: true }),
  updateProjectCredential
);

router.delete(
  "/:id/credentials/:credentialId",
  protect,
  requireModulePermission("projects", "projects.project.manage", { legacyAllowed: true }),
  deleteProjectCredential
);

export default router;
