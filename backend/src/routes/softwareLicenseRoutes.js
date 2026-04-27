import express from "express";
import softwareLicenseController from "../controllers/softwareLicenseController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// ============================================
// STATIC ROUTES - MUST come FIRST before ANY dynamic routes
// ============================================

// Dashboard
router.get("/dashboard", authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), softwareLicenseController.getLicenseDashboard);

// Expiring licenses
router.get("/expiring", authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), softwareLicenseController.getExpiringLicenses);

// Assignments
router.get("/assignments", authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), softwareLicenseController.getAssignments);
router.post("/assign", authorizeRoles("admin", "superadmin", "hr", "manager"), softwareLicenseController.assignLicense);
router.put("/assignments/:assignmentId/revoke", authorizeRoles("admin", "superadmin", "hr", "manager"), softwareLicenseController.revokeLicense);

// User licenses - MUST come before /user/:userId
router.get("/user/my-licenses", softwareLicenseController.getUserLicenses);

// ============================================
// LICENSE CRUD - List all licenses
// ============================================
router.get("/", authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), softwareLicenseController.getAllLicenses);
router.post("/", authorizeRoles("admin", "superadmin", "hr", "manager"), softwareLicenseController.createLicense);

// ============================================
// DYNAMIC ROUTES - MUST come LAST
// ============================================

// User licenses by ID - MUST come after /user/my-licenses
router.get("/user/:userId", authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), softwareLicenseController.getUserLicenses);

// License by ID
router.get("/:id", authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), softwareLicenseController.getLicenseById);
router.put("/:id", authorizeRoles("admin", "superadmin", "hr", "manager"), softwareLicenseController.updateLicense);
router.delete("/:id", authorizeRoles("admin", "superadmin", "hr", "manager"), softwareLicenseController.deleteLicense);

export default router;
