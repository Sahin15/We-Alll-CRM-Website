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
  uploadEmployeeDocument,
  deleteEmployeeDocument,
  getDocumentStatus,
  getPendingDocumentApprovals,
  approveDocument,
  rejectDocument,
  getMyDocuments,
} from "../controllers/documentController.js";

const router = express.Router();

router.post("/register", registerUser);
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
      .populate('reportingManager', 'name email');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
router.get("/:id", protect, getUserById);
router.put("/profile", protect, updateUserProfile);
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

// Password management routes
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);
router.put("/change-password", protect, changePassword);

// Document management routes
router.get("/me/documents", protect, getMyDocuments);
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
