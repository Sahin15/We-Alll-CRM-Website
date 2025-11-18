import express from "express";
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getClientOverview,
  initiateOnboarding,
  updateOnboardingStatus,
  completeOnboarding,
  getOnboardingDetails,
  assignAccountManager,
  updateClientPlan,
  renewClientPlan,
} from "../controllers/clientController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Admin and superadmin can manage clients
router.post("/", protect, authorizeRoles("admin", "superadmin"), createClient);
router.get("/", protect, authorizeRoles("admin", "superadmin"), getClients);
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  getClientById
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateClient
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteClient
);

router.get(
  "/:id/overview",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getClientOverview
);

// Client onboarding routes (admin/superadmin/accounts)
router.post(
  "/:id/onboard",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  initiateOnboarding
);
router.put(
  "/:id/onboarding-status",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  updateOnboardingStatus
);
router.put(
  "/:id/complete-onboarding",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  completeOnboarding
);
router.get(
  "/:id/onboarding",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getOnboardingDetails
);
router.put(
  "/:id/account-manager",
  protect,
  authorizeRoles("admin", "superadmin"),
  assignAccountManager
);
router.put(
  "/:id/plan",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  updateClientPlan
);
router.put(
  "/:id/renew",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  renewClientPlan
);

export default router;
