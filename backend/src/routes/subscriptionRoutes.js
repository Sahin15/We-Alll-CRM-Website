import express from "express";
import {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  activateSubscription,
  cancelSubscription,
  getClientSubscriptions,
  getMySubscriptions,
  updateSubscription,
  deleteSubscription,
} from "../controllers/subscriptionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create subscription (client or admin)
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "client", "accounts", "hod"),
  createSubscription
);

// Get all subscriptions (admin only, or employees for their assigned clients)
router.get(
  "/",
  protect,
  getAllSubscriptions
);

// Get logged-in client's own subscriptions
router.get(
  "/my-subscriptions",
  protect,
  authorizeRoles("client"),
  getMySubscriptions
);

// Get client subscriptions (admin viewing specific client)
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client", "hod"),
  getClientSubscriptions
);

// Get subscription by ID (must come after specific routes)
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client", "hod"),
  getSubscriptionById
);

// Update subscription
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "manager", "hod"),
  updateSubscription
);

// Activate subscription (admin/accounts after payment verification)
router.patch(
  "/:id/activate",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "manager", "hod"),
  activateSubscription
);

// Cancel subscription
router.patch(
  "/:id/cancel",
  protect,
  authorizeRoles("admin", "superadmin", "client"),
  cancelSubscription
);

// Delete subscription
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "manager"),
  deleteSubscription
);

export default router;
