import express from "express";
import {
  getMyActivities,
  deleteOldActivities,
} from "../controllers/activityController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get my activities
router.get("/my-activities", getMyActivities);

// Delete old activities (admin only)
router.delete(
  "/cleanup",
  authorizeRoles("admin", "superadmin"),
  deleteOldActivities
);

export default router;
