import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import notificationService from '../services/notificationService.js';
import User from '../models/userModel.js';

const router = express.Router();

// Get user notifications (with pagination)
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // For now, return empty array since we don't have a notification storage model yet
    // TODO: Implement proper notification storage model
    const notifications = [];
    const totalCount = 0;
    const unreadCount = 0;

    res.json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread notification count
router.get('/unread-count', protect, async (req, res) => {
  try {
    // For now, return 0 since we don't have notification storage yet
    // TODO: Implement proper notification storage and counting
    const count = 0;
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement notification read status update
    // For now, just return success
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all notifications as read
router.patch('/read-all', protect, async (req, res) => {
  try {
    // TODO: Implement mark all as read functionality
    // For now, just return success
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement notification deletion
    // For now, just return success
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update FCM token for current user
router.post('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    
    // Subscribe to general topics
    await notificationService.subscribeToTopic(fcmToken, 'all-users');
    await notificationService.subscribeToTopic(fcmToken, `role-${req.user.role}`);
    
    if (req.user.department) {
      await notificationService.subscribeToTopic(fcmToken, `dept-${req.user.department}`);
    }

    res.json({ message: 'FCM token updated successfully' });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send test notification (Admin only)
router.post('/test', protect, authorizeRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const { userId, title, body } = req.body;
    
    const result = await notificationService.sendToUser(userId, {
      title: title || 'Test Notification',
      body: body || 'This is a test notification from your CRM system',
      icon: '/favicon.ico',
      tag: 'test'
    });

    res.json(result);
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send notification to role (Admin/HR only)
router.post('/send-to-role', protect, authorizeRoles('admin', 'superadmin', 'hr'), async (req, res) => {
  try {
    const { roles, title, body, clickAction, data } = req.body;
    
    const result = await notificationService.sendToRole(roles, {
      title,
      body,
      clickAction,
      data
    });

    res.json(result);
  } catch (error) {
    console.error('Error sending role notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send notification to department (Admin/HR only)
router.post('/send-to-department', protect, authorizeRoles('admin', 'superadmin', 'hr'), async (req, res) => {
  try {
    const { departmentId, title, body, clickAction, data } = req.body;
    
    const result = await notificationService.sendToDepartment(departmentId, {
      title,
      body,
      clickAction,
      data
    });

    res.json(result);
  } catch (error) {
    console.error('Error sending department notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update notification preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    const { notificationPreferences } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, { notificationPreferences });
    
    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get notification preferences
router.get('/preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    res.json(user.notificationPreferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;