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
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PAYROLL_MANAGE_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];
const PAYROLL_DELETE_ROLES = ["admin", "superadmin", "hr", "manager"];
const PAYROLL_MARK_PAID_ROLES = ["admin", "superadmin", "accounts", "manager"];

router.get(
  "/my-slips",
  protect,
  requireModulePermission("finance", "payroll.slip.view_self", { legacyAllowed: true }),
  getMySalarySlips
);
router.get(
  "/:id",
  protect,
  requireModulePermission("finance", "payroll.slip.view_self", { legacyAllowed: true }),
  getSalarySlipById
);
router.get(
  "/:id/download-pdf",
  protect,
  requireModulePermission("finance", "payroll.slip.view_self", { legacyAllowed: true }),
  downloadSalarySlipPDF
);
router.post(
  "/:id/track-download",
  protect,
  requireModulePermission("finance", "payroll.slip.view_self", { legacyAllowed: true }),
  trackDownload
);

router.post(
  "/generate",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  generateSalarySlip
);

router.post(
  "/generate-bulk",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  bulkGenerateSalarySlips
);

router.put(
  "/:id/recalculate",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  recalculateSalarySlip
);

router.post(
  "/bulk-recalculate",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  bulkRecalculateSalarySlips
);

router.post(
  "/:id/send-email",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  sendSalarySlipEmail
);

router.post(
  "/send-bulk-emails",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  sendBulkSalarySlipEmails
);

router.get(
  "/employee/:employeeId",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getEmployeeSalarySlips
);

router.get(
  "/",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getAllSalarySlips
);

router.put(
  "/:id",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  updateSalarySlip
);

router.delete(
  "/:id",
  protect,
  authorizeRoles(...PAYROLL_DELETE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_DELETE_ROLES }),
  deleteSalarySlip
);

router.put(
  "/:id/mark-paid",
  protect,
  authorizeRoles(...PAYROLL_MARK_PAID_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MARK_PAID_ROLES }),
  markAsPaid
);

router.get(
  "/reports/payroll-summary",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getPayrollSummary
);

router.get(
  "/stats/overview",
  protect,
  authorizeRoles(...PAYROLL_MANAGE_ROLES),
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  getOverallStats
);

export default router;
