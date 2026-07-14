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
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const PAYMENT_PROOF_ROLES = ["admin", "superadmin", "client", "accounts"];
const BILLING_UPLOAD_ROLES = ["admin", "superadmin", "accounts"];

const paymentProofAccess = requireModulePermission("billing", "billing.subscription.manage", {
  legacyRoles: PAYMENT_PROOF_ROLES,
});
const billingUploadAccess = requireModulePermission("billing", "billing.payment.verify", {
  legacyRoles: BILLING_UPLOAD_ROLES,
});

router.post(
  "/expense-receipt",
  protect,
  upload.single("receipt"),
  handleMulterError,
  uploadExpenseReceipt
);

router.post(
  "/payment-proof",
  protect,
  paymentProofAccess,
  upload.single("image"),
  handleMulterError,
  uploadPaymentProof
);

router.post(
  "/profile-picture",
  protect,
  upload.single("image"),
  handleMulterError,
  uploadProfilePicture
);

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

router.get("/profile-picture/:fileName", serveProfilePicture);

router.delete("/profile-picture", protect, deleteProfilePicture);

router.delete("/payment-proof", protect, paymentProofAccess, deletePaymentProof);

router.post(
  "/multiple",
  protect,
  billingUploadAccess,
  upload.array("images", 5),
  handleMulterError,
  uploadMultipleImages
);

router.post(
  "/document",
  protect,
  uploadDocMiddleware.single("file"),
  handleDocumentUploadError,
  uploadDocument
);

router.delete("/document", protect, deleteDocument);

export default router;
