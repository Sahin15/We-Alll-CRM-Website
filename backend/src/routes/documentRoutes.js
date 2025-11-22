import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { uploadDocument, handleDocumentUploadError } from "../middleware/documentMiddleware.js";
import {
  uploadEmployeeDocument,
  deleteEmployeeDocument,
  getDocumentStatus,
  getPendingDocumentApprovals,
  approveDocument,
  rejectDocument,
  getMyDocuments,
} from "../controllers/documentController.js";

const router = express.Router();

// Get all documents (for dashboard - returns empty for now)
router.get("/", protect, (req, res) => {
  // This is a placeholder - documents are stored in User model
  // Return empty array for now to prevent 404 errors
  res.status(200).json([]);
});

// Employee routes - Get own documents
router.get("/me/documents", protect, getMyDocuments);

// HR/Admin routes - Document management
router.post(
  "/:userId/documents/upload",
  protect,
  authorizeRoles("hr", "admin", "superadmin", "accounts"),
  uploadDocument.single("file"),
  handleDocumentUploadError,
  uploadEmployeeDocument
);

router.delete(
  "/:userId/documents/:documentType",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  deleteEmployeeDocument
);

// Document status and approvals
router.get(
  "/documents/status",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  getDocumentStatus
);

router.get(
  "/documents/pending",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  getPendingDocumentApprovals
);

router.post(
  "/documents/:docId/approve",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  approveDocument
);

router.post(
  "/documents/:docId/reject",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  rejectDocument
);

export default router;
