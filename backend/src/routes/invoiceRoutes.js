import express from "express";
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getClientInvoices,
  getMyInvoices,
  updateInvoice,
  updateInvoiceStatus,
  sendInvoice,
  generateInvoicePDF,
  deleteInvoice,
} from "../controllers/invoiceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const INVOICE_MANAGE_ROLES = ["admin", "superadmin", "accounts", "manager", "hod"];
const INVOICE_READ_ROLES = ["admin", "superadmin", "accounts", "client"];
const INVOICE_DELETE_ROLES = ["admin", "superadmin", "manager"];
const CLIENT_ROLES = ["client"];

router.post(
  "/",
  protect,
  authorizeRoles(...INVOICE_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_MANAGE_ROLES }),
  createInvoice
);
router.get(
  "/",
  protect,
  authorizeRoles(...INVOICE_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: INVOICE_MANAGE_ROLES }),
  getAllInvoices
);
router.get(
  "/my-invoices",
  protect,
  authorizeRoles(...CLIENT_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: CLIENT_ROLES }),
  getMyInvoices
);
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles(...INVOICE_READ_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: INVOICE_READ_ROLES }),
  getClientInvoices
);
router.get(
  "/:id",
  protect,
  authorizeRoles(...INVOICE_READ_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: INVOICE_READ_ROLES }),
  getInvoiceById
);
router.put(
  "/:id",
  protect,
  authorizeRoles(...INVOICE_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_MANAGE_ROLES }),
  updateInvoice
);
router.patch(
  "/:id/status",
  protect,
  authorizeRoles(...INVOICE_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_MANAGE_ROLES }),
  updateInvoiceStatus
);
router.post(
  "/:id/send",
  protect,
  authorizeRoles(...INVOICE_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_MANAGE_ROLES }),
  sendInvoice
);
router.get(
  "/:id/pdf",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client", "hod"),
  requireModulePermission("billing", "billing.invoice.view", {
    legacyRoles: ["admin", "superadmin", "accounts", "client", "hod"],
  }),
  generateInvoicePDF
);
router.delete(
  "/:id",
  protect,
  authorizeRoles(...INVOICE_DELETE_ROLES),
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_DELETE_ROLES }),
  deleteInvoice
);

export default router;
