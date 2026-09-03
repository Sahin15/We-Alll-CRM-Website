import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  getCapabilities,
  downloadBankNeftCsv,
  downloadComplianceRegisterCsv,
  getExportHistory,
} from "../controllers/payrollReportController.js";

const router = express.Router();

const REPORT_ROLES = ["admin", "superadmin", "hr", "accounts", "manager"];

const requireBankExport = requireModulePermission(
  "finance",
  "payroll.bank.export",
  { legacyRoles: REPORT_ROLES }
);

router.get("/capabilities", protect, requireBankExport, getCapabilities);
router.get("/exports", protect, requireBankExport, getExportHistory);
router.get("/bank-neft.csv", protect, requireBankExport, downloadBankNeftCsv);
router.get(
  "/registers/:registerId.csv",
  protect,
  requireBankExport,
  downloadComplianceRegisterCsv
);

export default router;
