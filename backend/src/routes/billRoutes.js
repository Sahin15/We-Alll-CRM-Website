import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  createBill,
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
  sendBillToClient,
  markBillAsPaid,
  getClientBills,
  getBillPDF,
  getOverdueBills,
  applyDiscount,
} from "../controllers/billController.js";

const router = express.Router();

const BILL_MANAGE_ROLES = ["admin", "superadmin", "accounts", "hod"];
const BILL_READ_ROLES = ["admin", "superadmin", "accounts", "client"];

router.post(
  "/",
  protect,
  authorizeRoles(...BILL_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: BILL_MANAGE_ROLES }),
  createBill
);
router.put(
  "/:id",
  protect,
  authorizeRoles(...BILL_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: BILL_MANAGE_ROLES }),
  updateBill
);
router.delete(
  "/:id",
  protect,
  authorizeRoles(...BILL_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: BILL_MANAGE_ROLES }),
  deleteBill
);
router.post(
  "/:id/send",
  protect,
  authorizeRoles(...BILL_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: BILL_MANAGE_ROLES }),
  sendBillToClient
);
router.put(
  "/:id/mark-paid",
  protect,
  authorizeRoles(...BILL_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: BILL_MANAGE_ROLES }),
  markBillAsPaid
);
router.put(
  "/:id/discount",
  protect,
  authorizeRoles(...BILL_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: BILL_MANAGE_ROLES }),
  applyDiscount
);
router.get(
  "/",
  protect,
  authorizeRoles(...BILL_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: BILL_MANAGE_ROLES }),
  getAllBills
);
router.get(
  "/overdue",
  protect,
  authorizeRoles(...BILL_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: BILL_MANAGE_ROLES }),
  getOverdueBills
);
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles(...BILL_READ_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: BILL_READ_ROLES }),
  getClientBills
);
router.get(
  "/:id",
  protect,
  authorizeRoles(...BILL_READ_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: BILL_READ_ROLES }),
  getBillById
);
router.get(
  "/:id/pdf",
  protect,
  authorizeRoles(...BILL_READ_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: BILL_READ_ROLES }),
  getBillPDF
);

export default router;
