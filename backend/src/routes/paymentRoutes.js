import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  recordPartialPayment,
  getClientPayments,
  getMyPayments,
  getOverduePayments,
  getPaymentStats,
  getPaymentHistory,
  submitPaymentForVerification,
  getPendingPayments,
  verifyPayment,
  rejectPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

const PAYMENT_MANAGE_ROLES = ["admin", "superadmin", "accounts", "manager", "hod"];
const PAYMENT_READ_ROLES = ["admin", "superadmin", "accounts", "client"];
const CLIENT_ROLES = ["client"];
const PAYMENT_VERIFY_ROLES = ["admin", "superadmin", "accounts", "manager", "hod"];
const PAYMENT_SUBMIT_ROLES = ["admin", "superadmin", "client"];

router.post(
  "/",
  protect,
  authorizeRoles(...PAYMENT_MANAGE_ROLES),
  requireModulePermission("billing", "billing.payment.verify", { legacyRoles: PAYMENT_MANAGE_ROLES }),
  createPayment
);
router.put(
  "/:id",
  protect,
  authorizeRoles(...PAYMENT_MANAGE_ROLES),
  requireModulePermission("billing", "billing.payment.verify", { legacyRoles: PAYMENT_MANAGE_ROLES }),
  updatePayment
);
router.delete(
  "/:id",
  protect,
  authorizeRoles(...PAYMENT_MANAGE_ROLES),
  requireModulePermission("billing", "billing.payment.verify", { legacyRoles: PAYMENT_MANAGE_ROLES }),
  deletePayment
);
router.post(
  "/:id/partial",
  protect,
  authorizeRoles(...PAYMENT_MANAGE_ROLES),
  requireModulePermission("billing", "billing.payment.verify", { legacyRoles: PAYMENT_MANAGE_ROLES }),
  recordPartialPayment
);
router.get(
  "/",
  protect,
  authorizeRoles(...PAYMENT_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: PAYMENT_MANAGE_ROLES }),
  getAllPayments
);
router.get(
  "/pending-verification",
  protect,
  authorizeRoles(...PAYMENT_VERIFY_ROLES),
  requireModulePermission("billing", "billing.payment.verify", { legacyRoles: PAYMENT_VERIFY_ROLES }),
  getPendingPayments
);
router.post(
  "/submit-verification",
  protect,
  authorizeRoles(...PAYMENT_SUBMIT_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: PAYMENT_SUBMIT_ROLES }),
  submitPaymentForVerification
);
router.get(
  "/my-payments",
  protect,
  authorizeRoles(...CLIENT_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: CLIENT_ROLES }),
  getMyPayments
);
router.get(
  "/overdue",
  protect,
  authorizeRoles(...PAYMENT_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: PAYMENT_MANAGE_ROLES }),
  getOverduePayments
);
router.get(
  "/stats",
  protect,
  authorizeRoles(...PAYMENT_MANAGE_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: PAYMENT_MANAGE_ROLES }),
  getPaymentStats
);
router.get(
  "/history",
  protect,
  authorizeRoles(...PAYMENT_READ_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: PAYMENT_READ_ROLES }),
  getPaymentHistory
);
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles(...PAYMENT_READ_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: PAYMENT_READ_ROLES }),
  getClientPayments
);
router.get(
  "/:id",
  protect,
  authorizeRoles(...PAYMENT_READ_ROLES),
  requireModulePermission("billing", "billing.invoice.view", { legacyRoles: PAYMENT_READ_ROLES }),
  getPaymentById
);
router.put(
  "/:id/verify",
  protect,
  authorizeRoles(...PAYMENT_VERIFY_ROLES),
  requireModulePermission("billing", "billing.payment.verify", { legacyRoles: PAYMENT_VERIFY_ROLES }),
  verifyPayment
);
router.put(
  "/:id/reject",
  protect,
  authorizeRoles(...PAYMENT_VERIFY_ROLES),
  requireModulePermission("billing", "billing.payment.verify", { legacyRoles: PAYMENT_VERIFY_ROLES }),
  rejectPayment
);

export default router;
