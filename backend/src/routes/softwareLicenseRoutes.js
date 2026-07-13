import express from "express";
import softwareLicenseController from "../controllers/softwareLicenseController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const LICENSE_VIEW_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const LICENSE_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];

router.use(protect);

router.get(
  "/dashboard",
  authorizeRoles(...LICENSE_VIEW_ROLES),
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getLicenseDashboard
);

router.get(
  "/expiring",
  authorizeRoles(...LICENSE_VIEW_ROLES),
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getExpiringLicenses
);

router.get(
  "/assignments",
  authorizeRoles(...LICENSE_VIEW_ROLES),
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getAssignments
);
router.post(
  "/assign",
  authorizeRoles(...LICENSE_MANAGE_ROLES),
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.assignLicense
);
router.put(
  "/assignments/:assignmentId/revoke",
  authorizeRoles(...LICENSE_MANAGE_ROLES),
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.revokeLicense
);

router.get(
  "/user/my-licenses",
  requireModulePermission("resources", "licenses.license.view", { legacyAllowed: true }),
  softwareLicenseController.getUserLicenses
);

router.get(
  "/",
  authorizeRoles(...LICENSE_VIEW_ROLES),
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getAllLicenses
);
router.post(
  "/",
  authorizeRoles(...LICENSE_MANAGE_ROLES),
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.createLicense
);

router.get(
  "/user/:userId",
  authorizeRoles(...LICENSE_VIEW_ROLES),
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getUserLicenses
);

router.get(
  "/:id",
  authorizeRoles(...LICENSE_VIEW_ROLES),
  requireModulePermission("resources", "licenses.license.view", { legacyRoles: LICENSE_VIEW_ROLES }),
  softwareLicenseController.getLicenseById
);
router.put(
  "/:id",
  authorizeRoles(...LICENSE_MANAGE_ROLES),
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.updateLicense
);
router.delete(
  "/:id",
  authorizeRoles(...LICENSE_MANAGE_ROLES),
  requireModulePermission("resources", "licenses.license.manage", { legacyRoles: LICENSE_MANAGE_ROLES }),
  softwareLicenseController.deleteLicense
);

export default router;
