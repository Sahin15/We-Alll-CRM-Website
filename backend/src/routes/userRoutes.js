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

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", protect, getUsers);
router.get("/me", protect, (req, res) => {
  res.json({ message: "You have accessed a protected route", user: req.user });
});
router.get("/:id", protect, getUserById);
router.put("/profile", protect, updateUserProfile);
router.put("/:id", protect, authorizeRoles("admin", "superadmin"), updateUser);
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

export default router;
