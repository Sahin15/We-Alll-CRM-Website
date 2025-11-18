import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  addEmployeeToDepartment,
  removeEmployeeFromDepartment,
  bulkAssignEmployees,
  setDepartmentHead,
  getDepartmentAnalytics,
  getAllDepartmentsAnalytics,
} from "../controllers/departmentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

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
  authorizeRoles("admin", "superadmin", "hr"),
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

// Department head management
router.put(
  "/:departmentId/head/:userId",
  protect,
  authorizeRoles("admin", "superadmin"),
  setDepartmentHead
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
