import express from "express";
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getUserPreferences,
  updateUserPreferences,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user's notifications
router.get("/", getUserNotifications);
router.get("/unread-count", getUnreadCount);

// Mark as read
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllAsRead);

// Delete notification
router.delete("/:id", deleteNotification);

// Create notification (admin only)
router.post("/", authorizeRoles("admin", "superadmin"), createNotification);

// Notification preferences
router.get("/preferences", getUserPreferences);
router.put("/preferences", updateUserPreferences);

export default router;
