import express from "express";
import {
  getMyActivities,
  deleteOldActivities,
} from "../controllers/activityController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const activityCleanup = requireModulePermission("auth", "auth.role.manage", {
  legacyRoles: ["admin", "superadmin"],
});

router.use(protect);

router.get("/my-activities", getMyActivities);

router.delete("/cleanup", activityCleanup, deleteOldActivities);

export default router;
