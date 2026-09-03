import express from "express";
import {
  getBusinessDocuments,
  createBusinessDocument,
  deleteBusinessDocument,
} from "../controllers/businessDocumentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const DOC_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager", "employee", "client"];
const DOC_MANAGE_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];

router.use(protect);

// Business Document routes
router.get(
  "/business-documents",
  requireModulePermission("projects", "projects.document.view", { legacyRoles: DOC_VIEW_ROLES }),
  getBusinessDocuments
);

router.post(
  "/business-documents",
  requireModulePermission("projects", "projects.document.manage", { legacyRoles: DOC_MANAGE_ROLES }),
  createBusinessDocument
);

router.delete(
  "/business-documents/:id",
  requireModulePermission("projects", "projects.document.manage", { legacyRoles: DOC_MANAGE_ROLES }),
  deleteBusinessDocument
);

export default router;
