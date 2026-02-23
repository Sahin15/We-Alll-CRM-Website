import express from "express";  
import {
  createSalaryStructure,
  getAllSalaryStructures,
  getSalaryStructureById,
  getActiveSalaryStructure,
  updateSalaryStructure,
  activateSalaryStructure,
  deleteSalaryStructure,
  getSalaryStructureHistory
} from "../controllers/salaryStructureController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// HR/Admin only routes
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  createSalaryStructure
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  getAllSalaryStructures
);

// IMPORTANT: Specific routes must come BEFORE generic /:id routes
router.get(
  "/employee/:employeeId/active",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  (req, res, next) => {
    console.log('[SALARY ROUTE] GET /employee/:employeeId/active called');
    console.log('[SALARY ROUTE] Employee ID:', req.params.employeeId);
    next();
  },
  getActiveSalaryStructure
);

router.get(
  "/employee/:employeeId/history",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  (req, res, next) => {
    console.log('[SALARY ROUTE] GET /employee/:employeeId/history called');
    console.log('[SALARY ROUTE] Employee ID:', req.params.employeeId);
    next();
  },
  getSalaryStructureHistory
);

// Generic /:id routes come AFTER specific routes
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  getSalaryStructureById
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  updateSalaryStructure
);

router.put(
  "/:id/activate",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  activateSalaryStructure
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  deleteSalaryStructure
);

export default router;
