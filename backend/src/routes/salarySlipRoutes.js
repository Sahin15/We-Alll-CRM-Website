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
  sendBulkSalarySlipEmails
} from "../controllers/salarySlipController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Employee routes
router.get("/my-slips", protect, getMySalarySlips);
router.get("/:id", protect, getSalarySlipById);
router.get("/:id/download-pdf", protect, downloadSalarySlipPDF);
router.post("/:id/track-download", protect, trackDownload);

// HR/Admin routes
router.post(
  "/generate",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  generateSalarySlip
);

router.post(
  "/generate-bulk",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  bulkGenerateSalarySlips
);

router.post(
  "/:id/send-email",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  sendSalarySlipEmail
);

router.post(
  "/send-bulk-emails",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  sendBulkSalarySlipEmails
);

router.get(
  "/employee/:employeeId",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  getEmployeeSalarySlips
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  getAllSalarySlips
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  updateSalarySlip
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  deleteSalarySlip
);

router.put(
  "/:id/mark-paid",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  markAsPaid
);

router.get(
  "/reports/payroll-summary",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "accounts"),
  getPayrollSummary
);

export default router;
