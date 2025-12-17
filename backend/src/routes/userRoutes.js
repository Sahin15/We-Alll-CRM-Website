import express from "express";
import {
  registerUser,
  getUsers,
  loginUser,
  getUserById,
  updateUserProfile,
  updateUser,
  updateUserStatus,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { uploadDocument, handleDocumentUploadError } from "../middleware/documentMiddleware.js";
import {
  upload as documentUpload,
  uploadDocument as uploadUserDocument,
  uploadOfficialDocument,
  getUserDocuments,
  getOfficialDocuments,
  downloadDocument,
  deleteDocument as deleteUserDocument,
} from "../controllers/documentController.js";

const router = express.Router();

// Registration endpoint - used by admins to add users (not public)
router.post("/register", protect, authorizeRoles("admin", "superadmin", "hr"), registerUser);
router.post("/login", loginUser);
router.get("/", protect, getUsers);
router.get("/employees", protect, async (req, res) => {
  try {
    const User = (await import("../models/userModel.js")).default;
    const employees = await User.find({ role: { $in: ['employee', 'hod', 'hr', 'accounts'] } })
      .select('-password')
      .populate('department', 'name')
      .sort({ name: 1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
router.get("/me", protect, async (req, res) => {
  try {
    const User = (await import("../models/userModel.js")).default;
    const user = await User.findById(req.user._id)
      .select('-password')
      .select('+governmentIds.aadhaarNumber +governmentIds.panNumber +governmentIds.uanNumber +governmentIds.esicNumber')
      .select('+bankDetails.accountNumber')
      .populate('department', 'name')
      .populate('reportingManager', 'name email')
      .populate('headOfDepartment', 'name')
      .populate('headOfProjects', 'name');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// New document routes to match frontend expectations (MUST be before /:id route)
router.get("/documents", protect, (req, res, next) => {
  console.log('[USER ROUTES] GET /documents called');
  next();
}, getUserDocuments);
router.get("/official-documents", protect, (req, res, next) => {
  console.log('[USER ROUTES] GET /official-documents called');
  next();
}, getOfficialDocuments);
router.post("/documents", protect, documentUpload.single('document'), uploadUserDocument);
router.post("/official-documents", protect, documentUpload.single('document'), uploadOfficialDocument);
router.post("/:id/official-documents", protect, authorizeRoles("admin", "superadmin", "hr"), documentUpload.single('document'), async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { category, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Import document controller function
    const { uploadOfficialDocument } = await import("../controllers/documentController.js");
    
    // Set the target user ID in the request
    req.targetUserId = userId;
    
    // Call the upload function
    await uploadOfficialDocument(req, res);
  } catch (error) {
    console.error("Error uploading official document for user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
router.get("/documents/:documentId/download", protect, downloadDocument);
router.get("/official-documents/:documentId/download", protect, downloadDocument);
router.delete("/documents/:documentId", protect, deleteUserDocument);

// Pending documents endpoint (placeholder for now)
router.get("/documents/pending", protect, authorizeRoles("admin", "superadmin", "hr"), (req, res) => {
  // TODO: Implement pending document approvals functionality
  res.status(200).json([]);
});

// Password management routes (MUST come before /:id routes)
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

// Change password route (for authenticated users to change their own password)
router.put("/change-password", protect, changePassword);

// Clear broken profile picture
router.patch("/clear-broken-profile-picture", protect, async (req, res) => {
  try {
    const { clearBrokenProfilePicture } = await import("../controllers/uploadController.js");
    await clearBrokenProfilePicture(req, res);
  } catch (error) {
    console.error("Error importing clearBrokenProfilePicture:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get documents for a specific user (for HR/Admin)
router.get("/:id/documents", protect, authorizeRoles("admin", "superadmin", "hr"), async (req, res) => {
  try {
    const { id: userId } = req.params;
    const Document = (await import("../models/documentModel.js")).default;
    
    // Get both personal and official documents for the user
    const documents = await Document.find({ userId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    // Transform documents to include proper URL and uploadedAt field
    const transformedDocuments = documents.map(doc => ({
      ...doc.toObject(),
      uploadedAt: doc.createdAt,
      fileUrl: `/api/users/documents/${doc._id}/download`,
      fileSize: doc.size
    }));

    res.json(transformedDocuments);
  } catch (error) {
    console.error("Error fetching user documents:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:id", protect, getUserById);
router.put("/profile", protect, updateUserProfile);
router.put("/:id/profile", protect, authorizeRoles("admin", "superadmin", "hr"), updateUser);
router.put("/:id", protect, authorizeRoles("admin", "superadmin", "hr"), updateUser);
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateUserStatus
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const User = (await import("../models/userModel.js")).default;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await User.findByIdAndDelete(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Reset password route (for admin/hr to reset other users' passwords)
router.put("/:id/reset-password", protect, authorizeRoles("admin", "superadmin", "hr"), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const User = (await import("../models/userModel.js")).default;
    const bcrypt = (await import("bcrypt")).default;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
