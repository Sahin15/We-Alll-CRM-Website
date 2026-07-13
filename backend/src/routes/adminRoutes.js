import express from "express";
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const AUTH_ADMIN_ROLES = ["admin", "superadmin"];

router.get(
  "/users",
  protect,
  authorizeRoles(...AUTH_ADMIN_ROLES),
  requireModulePermission("auth", "auth.role.manage", { legacyRoles: AUTH_ADMIN_ROLES }),
  getAllUsers
);
router.put(
  "/users/:id",
  protect,
  authorizeRoles(...AUTH_ADMIN_ROLES),
  requireModulePermission("auth", "auth.role.manage", { legacyRoles: AUTH_ADMIN_ROLES }),
  updateUserRole
);
router.delete(
  "/users/:id",
  protect,
  authorizeRoles(...AUTH_ADMIN_ROLES),
  requireModulePermission("auth", "auth.role.manage", { legacyRoles: AUTH_ADMIN_ROLES }),
  deleteUser
);

export default router;
