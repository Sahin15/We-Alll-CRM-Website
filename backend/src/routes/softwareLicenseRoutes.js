import express from "express";
import softwareLicenseController from "../controllers/softwareLicenseController.js";
import { protect } from '../middleware/authMiddleware.js';

import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const LICENSE_VIEW_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const LICENSE_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];
const LICENSE_SELF_ROLES = ["employee", "admin", "superadmin", "hr", "hod", "manager", "accounts"];

router.use(protect);

router.get(
  "/dashboard",
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getLicenseDashboard
);

router.get(
  "/expiring",
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getExpiringLicenses
);

router.get(
  "/assignments",
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getAssignments
);
router.post(
  "/assign",
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.assignLicense
);
router.put(
  "/assignments/:assignmentId/revoke",
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.revokeLicense
);

router.get(
  "/user/my-licenses",
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_SELF_ROLES }),
  softwareLicenseController.getUserLicenses
);

router.get(
  "/",
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getAllLicenses
);
router.post(
  "/",
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.createLicense
);

router.get(
  "/user/:userId",
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getUserLicenses
);

router.get(
  "/:id",
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getLicenseById
);
router.put(
  "/:id",
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.updateLicense
);
router.delete(
  "/:id",
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.deleteLicense
);

export default router;
