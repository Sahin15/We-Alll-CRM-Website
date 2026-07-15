import express from "express";
import {
  generateSalarySlip,
  bulkGenerateSalarySlips,
  getAllSalarySlips,
  getEmployeeSalarySlips,
  getMySalarySlips,
  getSalarySlipById,
  updateSalarySlip,
  deleteSalarySlip,
  markAsPaid,
  trackDownload,
  getPayrollSummary,
  downloadSalarySlipPDF,
  sendSalarySlipEmail,
  sendBulkSalarySlipEmails,
  getOverallStats,
  recalculateSalarySlip,
  bulkRecalculateSalarySlips
} from "../controllers/salarySlipController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];
const PAYROLL_DELETE_ROLES = ["admin", "superadmin", "hr", "manager"];
const PAYROLL_MARK_PAID_ROLES = ["admin", "superadmin", "accounts", "manager"];
const PAYROLL_SELF_ROLES = [
  "employee",
  "hod",
  "sales",
  "hr",
  "admin",
  "superadmin",
];

const payrollViewSelf = requireModulePermission("finance", "payroll.slip.view_self", {
  legacyRoles: PAYROLL_SELF_ROLES,
});

router.get("/my-slips", protect, payrollViewSelf, getMySalarySlips);
router.get("/:id", protect, payrollViewSelf, getSalarySlipById);
router.get("/:id/download-pdf", protect, payrollViewSelf, downloadSalarySlipPDF);
router.post("/:id/track-download", protect, payrollViewSelf, trackDownload);

router.post(
  "/generate",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  generateSalarySlip
);

router.post(
  "/generate-bulk",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  bulkGenerateSalarySlips
);

router.put(
  "/:id/recalculate",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  recalculateSalarySlip
);

router.post(
  "/bulk-recalculate",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  bulkRecalculateSalarySlips
);

router.post(
  "/:id/send-email",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  sendSalarySlipEmail
);

router.post(
  "/send-bulk-emails",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  sendBulkSalarySlipEmails
);

router.get(
  "/employee/:employeeId",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getEmployeeSalarySlips
);

router.get(
  "/",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getAllSalarySlips
);

router.put(
  "/:id",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  updateSalarySlip
);

router.delete(
  "/:id",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_DELETE_ROLES }),
  deleteSalarySlip
);

router.put(
  "/:id/mark-paid",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MARK_PAID_ROLES }),
  markAsPaid
);

router.get(
  "/reports/payroll-summary",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getPayrollSummary
);

router.get(
  "/stats/overview",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getOverallStats
);

export default router;
