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
import { isHoDOfDepartment } from "../middleware/hodMiddleware.js";

const router = express.Router();

// Analytics routes
router.get(
  "/analytics/summary",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  getAllDepartmentsAnalytics
);
router.get(
  "/:id/analytics",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod", "employee"),
  getDepartmentAnalytics
);

// Department CRUD operations
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin"),
  createDepartment
);
router.get("/", protect, getDepartments);

// Get only operational departments (for client assignment)
router.get("/operational", protect, getOperationalDepartments);

// HoD Management (New) - MUST come before /:id route
router.post(
  "/:departmentId/assign-hod",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  assignHoD
);
router.delete(
  "/:departmentId/remove-hod",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  removeHoD
);

// HoD Access Routes - MUST come before /:id route
router.get(
  "/:departmentId/projects",
  protect,
  isHoDOfDepartment,
  getDepartmentProjects
);
router.get(
  "/:departmentId/members",
  protect,
  isHoDOfDepartment,
  getDepartmentMembers
);
router.get(
  "/:departmentId/stats",
  protect,
  isHoDOfDepartment,
  getDepartmentStats
);

// Department head management
router.put(
  "/:departmentId/head/:userId",
  protect,
  authorizeRoles("admin", "superadmin"),
  setDepartmentHead
);

// Generic /:id routes - MUST come AFTER specific routes
router.get("/:id", protect, getDepartmentById);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateDepartment
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteDepartment
);

// Employee management within department
router.put(
  "/:departmentId/employees/bulk",
  protect,
  authorizeRoles("admin", "superadmin"),
  bulkAssignEmployees
);
router.put(
  "/:departmentId/add/:userId",
  protect,
  authorizeRoles("admin", "superadmin"),
  addEmployeeToDepartment
);
router.put(
  "/:departmentId/remove/:userId",
  protect,
  authorizeRoles("admin", "superadmin"),
  removeEmployeeFromDepartment
);

export default router;
