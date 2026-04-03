import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Register FCM token
router.post('/register-token', notificationController.registerFCMToken);

// Get user's notifications
router.get('/my-notifications', notificationController.getMyNotifications);

// Get only unread notifications (for login/refresh)
router.get('/unread', notificationController.getUnreadNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Sound settings routes (must be before /:id routes)
router.get('/sound-settings', notificationController.getSoundSettings);
router.put('/sound-settings', notificationController.updateSoundSettings);

// Send test notification (for debugging)
router.post('/test', notificationController.sendTestNotification);

// Send notification (admin only) — MUST be before /:id routes
router.post('/send', notificationController.sendNotification);

// Send bulk notification (admin only) — MUST be before /:id routes
router.post('/send-bulk', notificationController.sendBulkNotification);

// Mark all as read (must be before /:id routes)
router.put('/mark-all/read', notificationController.markAllAsRead);

// Delete all notifications (must be before /:id routes)
router.delete('/delete-all/notifications', notificationController.deleteAllNotifications);

// Cleanup old notifications (admin only)
router.delete('/cleanup/old', notificationController.cleanupOldNotifications);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

export default router;
