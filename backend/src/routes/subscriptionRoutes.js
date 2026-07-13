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
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const SUBSCRIPTION_MANAGE_ROLES = ["admin", "superadmin", "accounts", "manager", "hod"];
const SUBSCRIPTION_CREATE_ROLES = ["admin", "superadmin", "client", "accounts", "hod"];
const SUBSCRIPTION_READ_ROLES = ["admin", "superadmin", "accounts", "client", "hod"];
const SUBSCRIPTION_CANCEL_ROLES = ["admin", "superadmin", "client"];
const SUBSCRIPTION_DELETE_ROLES = ["admin", "superadmin", "manager"];
const CLIENT_ROLES = ["client"];

router.post(
  "/",
  protect,
  requireModulePermission("billing", "billing.subscription.manage", {
    legacyRoles: SUBSCRIPTION_CREATE_ROLES,
  }),
  createSubscription
);
router.get(
  "/",
  protect,
  requireModulePermission("billing", "billing.subscription.view", { legacyAllowed: true }),
  getAllSubscriptions
);
router.get(
  "/my-subscriptions",
  protect,
  requireModulePermission("billing", "billing.subscription.view", { legacyRoles: CLIENT_ROLES }),
  getMySubscriptions
);
router.get(
  "/client/:clientId",
  protect,
  requireModulePermission("billing", "billing.subscription.view", {
    legacyRoles: SUBSCRIPTION_READ_ROLES,
  }),
  getClientSubscriptions
);
router.get(
  "/:id",
  protect,
  requireModulePermission("billing", "billing.subscription.view", {
    legacyRoles: SUBSCRIPTION_READ_ROLES,
  }),
  getSubscriptionById
);
router.put(
  "/:id",
  protect,
  requireModulePermission("billing", "billing.subscription.manage", {
    legacyRoles: SUBSCRIPTION_MANAGE_ROLES,
  }),
  updateSubscription
);
router.patch(
  "/:id/activate",
  protect,
  requireModulePermission("billing", "billing.subscription.manage", {
    legacyRoles: SUBSCRIPTION_MANAGE_ROLES,
  }),
  activateSubscription
);
router.patch(
  "/:id/cancel",
  protect,
  requireModulePermission("billing", "billing.subscription.manage", {
    legacyRoles: SUBSCRIPTION_CANCEL_ROLES,
  }),
  cancelSubscription
);
router.delete(
  "/:id",
  protect,
  requireModulePermission("billing", "billing.subscription.manage", {
    legacyRoles: SUBSCRIPTION_DELETE_ROLES,
  }),
  deleteSubscription
);

export default router;
