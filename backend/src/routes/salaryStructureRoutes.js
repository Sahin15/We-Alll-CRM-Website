import express from "express";  
import {
  createSalaryStructure,
  getAllSalaryStructures,
  getSalaryStructureById,
  getActiveSalaryStructure,
  updateSalaryStructure,
  activateSalaryStructure,
  deleteSalaryStructure,
  deleteAllSalaryStructures,
  getSalaryStructureHistory
} from "../controllers/salaryStructureController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// HR/Admin only routes
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts", "manager"),
  createSalaryStructure
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts", "manager"),
  getAllSalaryStructures
);

// IMPORTANT: Specific routes must come BEFORE generic /:id routes
router.get(
  "/employee/:employeeId/active",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts", "manager"),
  (req, res, next) => {
    
    
    next();
  },
  getActiveSalaryStructure
);

router.get(
  "/employee/:employeeId/history",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts", "manager"),
  (req, res, next) => {
    
    
    next();
  },
  getSalaryStructureHistory
);

// Generic /:id routes come AFTER specific routes
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts", "manager"),
  getSalaryStructureById
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts", "manager"),
  updateSalaryStructure
);

router.put(
  "/:id/activate",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts", "manager"),
  activateSalaryStructure
);

// IMPORTANT: /all must come BEFORE /:id
router.delete(
  "/all",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteAllSalaryStructures
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts", "manager"),
  deleteSalaryStructure
);

export default router;
