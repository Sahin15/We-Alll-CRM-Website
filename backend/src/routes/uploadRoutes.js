import express from "express";
import {
  uploadPaymentProof,
  deletePaymentProof,
  uploadMultipleImages,
  uploadProfilePicture,
  deleteProfilePicture,
  serveProfilePicture,
  uploadDocument,
  deleteDocument,
  uploadExpenseReceipt,
} from "../controllers/uploadController.js";
import { upload, handleMulterError } from "../middleware/uploadMiddleware.js";
import { uploadDocument as uploadDocMiddleware, handleDocumentUploadError } from "../middleware/documentMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Upload expense receipt
router.post(
  "/expense-receipt",
  protect,
  upload.single("receipt"),
  handleMulterError,
  uploadExpenseReceipt
);

// Upload single payment proof image
router.post(
  "/payment-proof",
  protect,
  authorizeRoles("admin", "superadmin", "client", "accounts"),
  upload.single("image"),
  handleMulterError,
  uploadPaymentProof
);

// Upload profile picture
router.post(
  "/profile-picture",
  protect,
  upload.single("image"),
  handleMulterError,
  uploadProfilePicture
);

// Check profile picture health (must be before :fileName route)
router.get(
  "/profile-picture/health",
  protect,
  async (req, res) => {
    try {
      const { checkProfilePictureHealth } = await import("../controllers/uploadController.js");
      await checkProfilePictureHealth(req, res);
    } catch (error) {
      
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Serve profile picture through backend (public read; filenames are unguessable UUIDs)
router.get(
  "/profile-picture/:fileName",
  serveProfilePicture
);

// Delete profile picture
router.delete(
  "/profile-picture",
  protect,
  deleteProfilePicture
);

// Delete payment proof image
router.delete(
  "/payment-proof",
  protect,
  authorizeRoles("admin", "superadmin", "client", "accounts"),
  deletePaymentProof
);

// Upload multiple images (for future use)
router.post(
  "/multiple",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  upload.array("images", 5), // Max 5 images
  handleMulterError,
  uploadMultipleImages
);

// Upload employee document
router.post(
  "/document",
  protect,
  uploadDocMiddleware.single("file"),
  handleDocumentUploadError,
  uploadDocument
);

// Delete employee document
router.delete(
  "/document",
  protect,
  deleteDocument
);

export default router;
