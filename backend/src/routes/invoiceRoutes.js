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
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const INVOICE_MANAGE_ROLES = ["admin", "superadmin", "accounts", "manager", "hod"];
const INVOICE_READ_ROLES = ["admin", "superadmin", "accounts", "client"];
const INVOICE_DELETE_ROLES = ["admin", "superadmin", "manager"];
const CLIENT_ROLES = ["client"];

router.post(
  "/",
  protect,
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_MANAGE_ROLES }),
  createInvoice
);
router.get(
  "/",
  protect,
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: INVOICE_MANAGE_ROLES }),
  getAllInvoices
);
router.get(
  "/my-invoices",
  protect,
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: CLIENT_ROLES }),
  getMyInvoices
);
router.get(
  "/client/:clientId",
  protect,
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: INVOICE_READ_ROLES }),
  getClientInvoices
);
router.get(
  "/:id",
  protect,
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: INVOICE_READ_ROLES }),
  getInvoiceById
);
router.put(
  "/:id",
  protect,
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_MANAGE_ROLES }),
  updateInvoice
);
router.patch(
  "/:id/status",
  protect,
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_MANAGE_ROLES }),
  updateInvoiceStatus
);
router.post(
  "/:id/send",
  protect,
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_MANAGE_ROLES }),
  sendInvoice
);
router.get(
  "/:id/pdf",
  protect,
  requireModulePermission("billing", "billing.invoice.view", {
    legacyRoles: ["admin", "superadmin", "accounts", "client", "hod"],
  }),
  generateInvoicePDF
);
router.delete(
  "/:id",
  protect,
  requireModulePermission("billing", "billing.invoice.manage", { legacyRoles: INVOICE_DELETE_ROLES }),
  deleteInvoice
);

export default router;
