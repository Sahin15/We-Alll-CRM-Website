import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
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

// Write operations: admin/superadmin/accounts only
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  createPayment
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  updatePayment
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  deletePayment
);
router.post(
  "/:id/partial",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  recordPartialPayment
);

// Read operations: admin/superadmin/accounts, plus client (restricted to own)
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  getAllPayments
);

// Payment verification routes - MUST come before /:id route
router.get(
  "/pending-verification",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  getPendingPayments
);
router.post(
  "/submit-verification",
  protect,
  authorizeRoles("admin", "superadmin", "client"),
  submitPaymentForVerification
);

// Client-specific routes
router.get(
  "/my-payments",
  protect,
  authorizeRoles("client"),
  getMyPayments
);

// Specific routes before parameterized routes
router.get(
  "/overdue",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  getOverduePayments
);
router.get(
  "/stats",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  getPaymentStats
);
router.get(
  "/history",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getPaymentHistory
);
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getClientPayments
);

// Parameterized routes MUST come last
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getPaymentById
);
router.put(
  "/:id/verify",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  verifyPayment
);
router.put(
  "/:id/reject",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  rejectPayment
);

export default router;
