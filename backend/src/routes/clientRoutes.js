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

// Admin, superadmin, hr can manage clients; hod and manager can view
router.post("/", protect, authorizeRoles("admin", "superadmin", "hr"), createClient);
router.get("/", protect, authorizeRoles("admin", "superadmin", "hr", "hod", "manager"), getClients);
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod", "manager"),
  getClientById
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  updateClient
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
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
