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

router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  getSalaryStructureById
);

router.get(
  "/employee/:employeeId/active",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  getActiveSalaryStructure
);

router.get(
  "/employee/:employeeId/history",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  getSalaryStructureHistory
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
