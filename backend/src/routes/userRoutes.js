import express from "express";
import {
  registerUser,
  getUsers,
  getMeetingDirectory,
  loginUser,
  getUserById,
  updateUserProfile,
  updateUser,
  updateUserStatus,
  updateEmployeeStatus,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getNextEmployeeIdSequence,
} from "../controllers/userController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";
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

const USER_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];

const userView = requireModulePermission("team", "team.user.view", {
  legacyRoles: USER_MANAGE_ROLES,
});

// Registration endpoint - used by admins to add users (not public)
router.post(
  "/register",
  protect,
  requireModulePermission("team", "team.user.create", { legacyRoles: USER_MANAGE_ROLES }),
  registerUser
);
router.post("/login", loginUser);
router.get(
  "/meeting-directory",
  protect,
  requireModulePermission("company", "company.meeting.view", {
    legacyRoles: [...USER_MANAGE_ROLES, "employee", "hod", "sales", "telecaller", "accounts", "client"],
  }),
  getMeetingDirectory
);
router.get("/", protect, userView, getUsers);
router.get(
  "/employees",
  protect,
  userView,
  async (req, res) => {
  try {
    const User = (await import("../models/userModel.js")).default;
    const { mergeExcludePastMembersFilter } = await import(
      "../utils/employeeQueryUtils.js"
    );
    // Employable roster: exclude terminated/offboarded past members
    const employees = await User.find(
      mergeExcludePastMembersFilter({ role: { $ne: "superadmin" } })
    )
      .select("-password")
      .populate("department", "name")
      .populate("reportingManager", "name")
      .sort({ name: 1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
router.get("/me", protect, requireModulePermission("profile", "profile.view"), async (req, res) => {
  try {
    const User = (await import("../models/userModel.js")).default;
    const user = await User.findById(req.user._id)
      .select('-password')
      .select('+governmentIds.aadhaarNumber')
      .select('+governmentIds.panNumber')
      .select('+governmentIds.uanNumber')
      .select('+governmentIds.esicNumber')
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
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Document download routes (MUST be before other document routes and /:id routes)
router.get("/documents/:documentId/download", protect, (req, res, next) => {
  
  
  
  next();
}, downloadDocument);
router.get("/official-documents/:documentId/download", protect, (req, res, next) => {
  
  
  next();
}, downloadDocument);

// New document routes to match frontend expectations (MUST be before /:id route)
router.get("/documents", protect, (req, res, next) => {
  
  next();
}, getUserDocuments);
router.get("/official-documents", protect, (req, res, next) => {
  
  next();
}, getOfficialDocuments);
router.post("/documents", protect, documentUpload.single('document'), uploadUserDocument);
router.post("/official-documents", protect, documentUpload.single('document'), uploadOfficialDocument);
router.post("/:id/official-documents", protect, requireModulePermission("team", "team.user.update", { legacyRoles: USER_MANAGE_ROLES }), documentUpload.single('document'), async (req, res, next) => {
  try {
    const { id: userId } = req.params;

    
    
    
    

    if (!req.file) {
      
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Set the target user ID in the request for the controller
    req.targetUserId = userId;
    
    
    
    // Call the controller function
    await uploadOfficialDocument(req, res);
    
    
  } catch (error) {
    
    
    
    
    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to upload official document", error: error.message });
    }
  }
});
router.delete("/documents/:documentId", protect, deleteUserDocument);

// Pending documents endpoint (placeholder for now)
router.get("/documents/pending", protect, requireModulePermission("team", "team.user.view", { legacyRoles: USER_MANAGE_ROLES }), (req, res) => {
  // TODO: Implement pending document approvals functionality
  res.status(200).json([]);
});

// Password management routes (MUST come before /:id routes)
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

// Change password route (for authenticated users to change their own password)
router.put("/change-password", protect, requireModulePermission("profile", "profile.update"), changePassword);

// Generate next employee ID sequence (HR/admin while editing employee profiles)
router.post(
  "/next-employee-id-sequence",
  protect,
  requireModulePermission("team", "team.user.update", {
    legacyRoles: USER_MANAGE_ROLES,
  }),
  getNextEmployeeIdSequence
);

// Clear broken profile picture
router.patch("/clear-broken-profile-picture", protect, requireModulePermission("profile", "profile.update"), async (req, res) => {
  try {
    const { clearBrokenProfilePicture } = await import("../controllers/uploadController.js");
    await clearBrokenProfilePicture(req, res);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get documents for a specific user (for HR/Admin)
router.get(
  "/:id/documents",
  protect,
  requireModulePermission("team", "team.user.view", { legacyRoles: USER_MANAGE_ROLES }),
  async (req, res) => {
  try {
    const { id: userId } = req.params;
    const Document = (await import("../models/documentModel.js")).default;
    
    // Get both personal and official documents for the user
    const documents = await Document.find({ userId })
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email')
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
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:id", protect, userView, getUserById);
router.put("/profile", protect, requireModulePermission("profile", "profile.update"), updateUserProfile);
router.put(
  "/:id/profile",
  protect,
  requireModulePermission("team", "team.user.update", { legacyRoles: USER_MANAGE_ROLES }),
  updateUser
);
router.put(
  "/:id/status",
  protect,
  requireModulePermission("team", "team.user.update", { legacyRoles: USER_MANAGE_ROLES }),
  updateEmployeeStatus
);
router.put(
  "/:id",
  protect,
  requireModulePermission("team", "team.user.update", { legacyRoles: USER_MANAGE_ROLES }),
  updateUser
);
router.delete(
  "/:id",
  protect,
  requireModulePermission("team", "team.user.update", { legacyRoles: ["superadmin"] }),
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
router.put(
  "/:id/reset-password",
  protect,
  requireModulePermission("team", "team.user.update", { legacyRoles: USER_MANAGE_ROLES }),
  async (req, res) => {
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
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
