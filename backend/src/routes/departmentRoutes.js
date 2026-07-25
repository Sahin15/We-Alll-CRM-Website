import express from "express";
import {
  createDepartment,
  getDepartments,
  getOperationalDepartments,
  getDepartmentDirectory,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  addEmployeeToDepartment,
  removeEmployeeFromDepartment,
  bulkAssignEmployees,
  setDepartmentHead,
  getDepartmentAnalytics,
  getAllDepartmentsAnalytics,
  assignHoD,
  removeHoD,
  getDepartmentProjects,
  getDepartmentMembers,
  getDepartmentStats,
} from "../controllers/departmentController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";
import { isHoDOfDepartment } from "../middleware/hodMiddleware.js";

const router = express.Router();

const DEPT_VIEW_ROLES = ["manager", "hr", "admin", "superadmin"];

const DEPT_DIRECTORY_ROLES = [
  "employee",
  "hod",
  "sales",
  "telecaller",
  "manager",
  "hr",
  "admin",
  "superadmin",
  "accounts",
  "client",
];

const deptView = requireModulePermission("team", "team.department.view", {
  legacyRoles: DEPT_VIEW_ROLES,
});

const DEPT_MANAGE_ROLES = ["admin", "superadmin"];
const DEPT_HOD_OPS_ROLES = ["admin", "superadmin", "hr", "manager"];
const DEPT_ANALYTICS_ROLES = ["admin", "superadmin", "hr", "manager"];
const DEPT_ANALYTICS_DETAIL_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "manager",
  "hod",
  "employee",
];

// Analytics routes
router.get(
  "/analytics/summary",
  protect,
  requireModulePermission("team", "team.department.view", {
    legacyRoles: DEPT_ANALYTICS_ROLES,
  }),
  getAllDepartmentsAnalytics
);
router.get(
  "/:id/analytics",
  protect,
  requireModulePermission("team", "team.department.view", {
    legacyRoles: DEPT_ANALYTICS_DETAIL_ROLES,
  }),
  getDepartmentAnalytics
);

// Department CRUD operations
router.post(
  "/",
  protect,
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  createDepartment
);
router.get("/", protect, deptView, getDepartments);

router.get(
  "/directory",
  protect,
  requireModulePermission("dashboard", "dashboard.view", {
    legacyRoles: DEPT_DIRECTORY_ROLES,
  }),
  getDepartmentDirectory
);

router.get("/operational", protect, deptView, getOperationalDepartments);

// HoD Management (New) - MUST come before /:id route
router.post(
  "/:departmentId/assign-hod",
  protect,
  requireModulePermission("team", "team.user.update", {
    legacyRoles: DEPT_HOD_OPS_ROLES,
  }),
  assignHoD
);
router.delete(
  "/:departmentId/remove-hod",
  protect,
  requireModulePermission("team", "team.user.update", {
    legacyRoles: DEPT_HOD_OPS_ROLES,
  }),
  removeHoD
);

// HoD Access Routes - MUST come before /:id route
router.get("/:departmentId/projects", protect, isHoDOfDepartment, deptView, getDepartmentProjects);
router.get("/:departmentId/members", protect, isHoDOfDepartment, deptView, getDepartmentMembers);
router.get("/:departmentId/stats", protect, isHoDOfDepartment, deptView, getDepartmentStats);

// Department head management
router.put(
  "/:departmentId/head/:userId",
  protect,
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  setDepartmentHead
);

// Generic /:id routes - MUST come AFTER specific routes
router.get("/:id", protect, deptView, getDepartmentById);
router.put(
  "/:id",
  protect,
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  updateDepartment
);
router.delete(
  "/:id",
  protect,
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  deleteDepartment
);

// Employee management within department
router.put(
  "/:departmentId/employees/bulk",
  protect,
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  bulkAssignEmployees
);
router.put(
  "/:departmentId/add/:userId",
  protect,
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  addEmployeeToDepartment
);
router.put(
  "/:departmentId/remove/:userId",
  protect,
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  removeEmployeeFromDepartment
);

export default router;
