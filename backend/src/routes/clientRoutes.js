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
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission, requireModulePermissionAny } from "../authz/authzMiddleware.js";

const router = express.Router();

const CLIENT_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];
const CLIENT_LIST_ROLES = ["admin", "superadmin", "hr", "hod", "manager", "employee"];
const CLIENT_EMPLOYEE_ROLES = ["employee", "hod"];
const CLIENT_ASSIGNED_VIEW_ROLES = ["employee", "hod", "admin", "superadmin", "hr", "manager"];
const CLIENT_ONBOARD_WRITE_ROLES = ["admin", "superadmin", "accounts", "manager"];
const CLIENT_ONBOARD_READ_ROLES = ["admin", "superadmin", "accounts", "client", "manager"];
const CLIENT_OVERVIEW_ROLES = ["admin", "superadmin", "accounts", "client"];
const CLIENT_VIP_LIST_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];
const CLIENT_ACCOUNT_MANAGER_ROLES = ["admin", "superadmin", "manager"];
const CLIENT_PLAN_ROLES = ["admin", "superadmin", "accounts", "manager"];
const CLIENT_DETAIL_VIEW_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "hod",
  "manager",
  "employee",
  "accounts",
  "sales",
];

router.post(
  "/",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  createClient
);
router.get(
  "/",
  protect,
  requireModulePermissionAny(
    "crm",
    ["crm.client.view", "crm.client.view_assigned"],
    { legacyRoles: CLIENT_LIST_ROLES }
  ),
  getClients
);

router.get(
  "/my-clients",
  protect,
  requireModulePermission("crm", "crm.client.view_assigned", { legacyRoles: CLIENT_ASSIGNED_VIEW_ROLES }),
  getEmployeeClients
);

router.get(
  "/:id",
  protect,
  requireModulePermissionAny(
    "crm",
    ["crm.client.view", "crm.client.view_assigned"],
    { legacyRoles: CLIENT_DETAIL_VIEW_ROLES }
  ),
  getClientById
);
router.put(
  "/:id",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  updateClient
);
router.delete(
  "/:id",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  deleteClient
);

router.get(
  "/:id/overview",
  protect,
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_OVERVIEW_ROLES }),
  getClientOverview
);

router.post(
  "/:id/onboard",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_ONBOARD_WRITE_ROLES }),
  initiateOnboarding
);
router.put(
  "/:id/onboarding-status",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_ONBOARD_WRITE_ROLES }),
  updateOnboardingStatus
);
router.put(
  "/:id/complete-onboarding",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_ONBOARD_WRITE_ROLES }),
  completeOnboarding
);
router.get(
  "/:id/onboarding",
  protect,
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_ONBOARD_READ_ROLES }),
  getOnboardingDetails
);
router.put(
  "/:id/account-manager",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_ACCOUNT_MANAGER_ROLES }),
  assignAccountManager
);
router.put(
  "/:id/plan",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_PLAN_ROLES }),
  updateClientPlan
);
router.put(
  "/:id/renew",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_PLAN_ROLES }),
  renewClientPlan
);

router.put(
  "/:id/vip",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  toggleClientVip
);
router.get(
  "/vip/list",
  protect,
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_VIP_LIST_ROLES }),
  getVipClients
);

router.put(
  "/:id/departments",
  protect,
  requireModulePermission("crm", "crm.client.manage", { legacyRoles: CLIENT_MANAGE_ROLES }),
  assignDepartmentsToClient
);
router.get(
  "/department/:departmentId",
  protect,
  requireModulePermission("crm", "crm.client.view", { legacyRoles: CLIENT_VIP_LIST_ROLES }),
  getClientsByDepartment
);

export default router;
