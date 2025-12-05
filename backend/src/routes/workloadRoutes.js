import express from "express";
import {
  getEmployeeWorkload,
  getDepartmentWorkload,
  getProjectWorkload,
  getWorkloadTrends,
  getBatchWorkload
} from "../controllers/workloadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get workload for a single employee
router.get("/employee/:employeeId", getEmployeeWorkload);

// Get workload for all employees in a department
router.get("/department/:departmentId", getDepartmentWorkload);

// Get workload for all team members in a project
router.get("/project/:projectId", getProjectWorkload);

// Get workload trends for an employee
router.get("/trends/:employeeId", getWorkloadTrends);

// Get workload for multiple employees (batch)
router.post("/batch", getBatchWorkload);

export default router;
