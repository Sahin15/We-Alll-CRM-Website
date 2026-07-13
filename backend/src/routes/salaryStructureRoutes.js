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
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];
const PAYROLL_DELETE_ALL_ROLES = ["admin", "superadmin"];

router.post(
  "/",
  protect,
  requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  createSalaryStructure
);

router.get(
  "/",
  protect,
  requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getAllSalaryStructures
);

router.get(
  "/employee/:employeeId/active",
  protect,
  (req, res, next) => {
    const allowedRoles = PAYROLL_MANAGE_ROLES;
    const isOwnSalary = req.user._id.toString() === req.params.employeeId;
    if (allowedRoles.includes(req.user.role) || isOwnSalary) {
      return next();
    }
    return res.status(403).json({ message: "Access denied" });
  },
  requireModulePermission("finance", "payroll.slip.view_self", { legacyAllowed: true }),
  getActiveSalaryStructure
);

router.get(
  "/employee/:employeeId/history",
  protect,
  requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getSalaryStructureHistory
);

router.get(
  "/:id",
  protect,
  requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getSalaryStructureById
);

router.put(
  "/:id",
  protect,
  requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  updateSalaryStructure
);

router.put(
  "/:id/activate",
  protect,
  requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  activateSalaryStructure
);

router.delete(
  "/all",
  protect,
  requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_DELETE_ALL_ROLES }),
  deleteAllSalaryStructures
);

router.delete(
  "/:id",
  protect,
  requireModulePermission("finance", "payroll.structure.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  deleteSalaryStructure
);

export default router;
