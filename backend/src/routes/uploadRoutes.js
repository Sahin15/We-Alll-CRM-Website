import express from "express";
import {
  uploadPaymentProof,
  deletePaymentProof,
  uploadMultipleImages,
  uploadProfilePicture,
  uploadDocument,
  deleteDocument,
} from "../controllers/uploadController.js";
import { upload, handleMulterError } from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

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
  upload.single("file"),
  handleMulterError,
  uploadDocument
);

// Delete employee document
router.delete(
  "/document",
  protect,
  deleteDocument
);

export default router;
