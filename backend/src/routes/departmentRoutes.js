import express from "express";
import {
  createDepartment,
  getDepartments,
  getOperationalDepartments,
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
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import { isHoDOfDepartment } from "../middleware/hodMiddleware.js";

const router = express.Router();

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
  authorizeRoles(...DEPT_ANALYTICS_ROLES),
  requireModulePermission("team", "team.department.view", {
    legacyRoles: DEPT_ANALYTICS_ROLES,
  }),
  getAllDepartmentsAnalytics
);
router.get(
  "/:id/analytics",
  protect,
  authorizeRoles(...DEPT_ANALYTICS_DETAIL_ROLES),
  requireModulePermission("team", "team.department.view", {
    legacyRoles: DEPT_ANALYTICS_DETAIL_ROLES,
  }),
  getDepartmentAnalytics
);

// Department CRUD operations
router.post(
  "/",
  protect,
  authorizeRoles(...DEPT_MANAGE_ROLES),
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  createDepartment
);
router.get(
  "/",
  protect,
  requireModulePermission("team", "team.department.view", { legacyAllowed: true }),
  getDepartments
);

// Get only operational departments (for client assignment)
router.get(
  "/operational",
  protect,
  requireModulePermission("team", "team.department.view", { legacyAllowed: true }),
  getOperationalDepartments
);

// HoD Management (New) - MUST come before /:id route
router.post(
  "/:departmentId/assign-hod",
  protect,
  authorizeRoles(...DEPT_HOD_OPS_ROLES),
  requireModulePermission("team", "team.user.update", {
    legacyRoles: DEPT_HOD_OPS_ROLES,
  }),
  assignHoD
);
router.delete(
  "/:departmentId/remove-hod",
  protect,
  authorizeRoles(...DEPT_HOD_OPS_ROLES),
  requireModulePermission("team", "team.user.update", {
    legacyRoles: DEPT_HOD_OPS_ROLES,
  }),
  removeHoD
);

// HoD Access Routes - MUST come before /:id route
router.get(
  "/:departmentId/projects",
  protect,
  isHoDOfDepartment,
  requireModulePermission("team", "team.department.view", { legacyAllowed: true }),
  getDepartmentProjects
);
router.get(
  "/:departmentId/members",
  protect,
  isHoDOfDepartment,
  requireModulePermission("team", "team.department.view", { legacyAllowed: true }),
  getDepartmentMembers
);
router.get(
  "/:departmentId/stats",
  protect,
  isHoDOfDepartment,
  requireModulePermission("team", "team.department.view", { legacyAllowed: true }),
  getDepartmentStats
);

// Department head management
router.put(
  "/:departmentId/head/:userId",
  protect,
  authorizeRoles(...DEPT_MANAGE_ROLES),
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  setDepartmentHead
);

// Generic /:id routes - MUST come AFTER specific routes
router.get(
  "/:id",
  protect,
  requireModulePermission("team", "team.department.view", { legacyAllowed: true }),
  getDepartmentById
);
router.put(
  "/:id",
  protect,
  authorizeRoles(...DEPT_MANAGE_ROLES),
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  updateDepartment
);
router.delete(
  "/:id",
  protect,
  authorizeRoles(...DEPT_MANAGE_ROLES),
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  deleteDepartment
);

// Employee management within department
router.put(
  "/:departmentId/employees/bulk",
  protect,
  authorizeRoles(...DEPT_MANAGE_ROLES),
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  bulkAssignEmployees
);
router.put(
  "/:departmentId/add/:userId",
  protect,
  authorizeRoles(...DEPT_MANAGE_ROLES),
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  addEmployeeToDepartment
);
router.put(
  "/:departmentId/remove/:userId",
  protect,
  authorizeRoles(...DEPT_MANAGE_ROLES),
  requireModulePermission("team", "team.department.manage", {
    legacyRoles: DEPT_MANAGE_ROLES,
  }),
  removeEmployeeFromDepartment
);

export default router;
