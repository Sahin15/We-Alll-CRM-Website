import express from "express";
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Only admin can manage users
router.get("/users", protect, authorizeRoles("admin", "superadmin"), getAllUsers);
router.put("/users/:id", protect, authorizeRoles("admin", "superadmin"), updateUserRole);
router.delete("/users/:id", protect, authorizeRoles("admin", "superadmin"), deleteUser);

export default router;
