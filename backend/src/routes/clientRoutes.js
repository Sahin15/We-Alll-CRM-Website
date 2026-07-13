import express from "express";
import {
  createClient,
  getClients,
  getClientById,
  getEmployeeClients,
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
  toggleClientVip,
  getVipClients,
  assignDepartmentsToClient,
  getClientsByDepartment,
} from "../controllers/clientController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const CLIENT_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];
const CLIENT_LIST_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];
const CLIENT_EMPLOYEE_ROLES = ["employee", "hod"];
const CLIENT_ONBOARD_WRITE_ROLES = ["admin", "superadmin", "accounts", "manager"];
const CLIENT_ONBOARD_READ_ROLES = ["admin", "superadmin", "accounts", "client", "manager"];
const CLIENT_OVERVIEW_ROLES = ["admin", "superadmin", "accounts", "client"];
const CLIENT_VIP_LIST_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];
const CLIENT_ACCOUNT_MANAGER_ROLES = ["admin", "superadmin", "manager"];
const CLIENT_PLAN_ROLES = ["admin", "superadmin", "accounts", "manager"];

router.post(
  "/",
  protect,
  authorizeRoles(...CLIENT_MANAGE_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  createClient
);
router.get(
  "/",
  protect,
  authorizeRoles(...CLIENT_LIST_ROLES),
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_LIST_ROLES }),
  getClients
);

router.get(
  "/my-clients",
  protect,
  authorizeRoles(...CLIENT_EMPLOYEE_ROLES),
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_EMPLOYEE_ROLES }),
  getEmployeeClients
);

router.get(
  "/:id",
  protect,
  requireModulePermission("crm", "crm.client.view", { legacyAllowed: true }),
  getClientById
);
router.put(
  "/:id",
  protect,
  authorizeRoles(...CLIENT_MANAGE_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  updateClient
);
router.delete(
  "/:id",
  protect,
  authorizeRoles(...CLIENT_MANAGE_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  deleteClient
);

router.get(
  "/:id/overview",
  protect,
  authorizeRoles(...CLIENT_OVERVIEW_ROLES),
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_OVERVIEW_ROLES }),
  getClientOverview
);

router.post(
  "/:id/onboard",
  protect,
  authorizeRoles(...CLIENT_ONBOARD_WRITE_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_ONBOARD_WRITE_ROLES }),
  initiateOnboarding
);
router.put(
  "/:id/onboarding-status",
  protect,
  authorizeRoles(...CLIENT_ONBOARD_WRITE_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_ONBOARD_WRITE_ROLES }),
  updateOnboardingStatus
);
router.put(
  "/:id/complete-onboarding",
  protect,
  authorizeRoles(...CLIENT_ONBOARD_WRITE_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_ONBOARD_WRITE_ROLES }),
  completeOnboarding
);
router.get(
  "/:id/onboarding",
  protect,
  authorizeRoles(...CLIENT_ONBOARD_READ_ROLES),
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_ONBOARD_READ_ROLES }),
  getOnboardingDetails
);
router.put(
  "/:id/account-manager",
  protect,
  authorizeRoles(...CLIENT_ACCOUNT_MANAGER_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_ACCOUNT_MANAGER_ROLES }),
  assignAccountManager
);
router.put(
  "/:id/plan",
  protect,
  authorizeRoles(...CLIENT_PLAN_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_PLAN_ROLES }),
  updateClientPlan
);
router.put(
  "/:id/renew",
  protect,
  authorizeRoles(...CLIENT_PLAN_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_PLAN_ROLES }),
  renewClientPlan
);

router.put(
  "/:id/vip",
  protect,
  authorizeRoles(...CLIENT_MANAGE_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  toggleClientVip
);
router.get(
  "/vip/list",
  protect,
  authorizeRoles(...CLIENT_VIP_LIST_ROLES),
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_VIP_LIST_ROLES }),
  getVipClients
);

router.put(
  "/:id/departments",
  protect,
  authorizeRoles(...CLIENT_MANAGE_ROLES),
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  assignDepartmentsToClient
);
router.get(
  "/department/:departmentId",
  protect,
  authorizeRoles(...CLIENT_VIP_LIST_ROLES),
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_VIP_LIST_ROLES }),
  getClientsByDepartment
);

export default router;
