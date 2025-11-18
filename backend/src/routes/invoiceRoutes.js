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

const router = express.Router();

// Create invoice (admin/accounts)
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  createInvoice
);

// Get all invoices (admin/accounts)
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  getAllInvoices
);

// Get logged-in client's own invoices
router.get(
  "/my-invoices",
  protect,
  authorizeRoles("client"),
  getMyInvoices
);

// Get client invoices (admin viewing specific client)
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getClientInvoices
);

// Get invoice by ID (must come after specific routes)
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getInvoiceById
);

// Update invoice
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  updateInvoice
);

// Update invoice status
router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  updateInvoiceStatus
);

// Send invoice
router.post(
  "/:id/send",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  sendInvoice
);

// Generate PDF
router.get(
  "/:id/pdf",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  generateInvoicePDF
);

// Delete invoice
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteInvoice
);

export default router;
