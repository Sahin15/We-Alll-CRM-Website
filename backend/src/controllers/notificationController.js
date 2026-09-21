import NotificationService from '../services/notificationService.js';
import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';

export const registerFCMToken = async (req, res) => {
  try {
    const { token, deviceName, deviceType } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    console.log('[FCM] Registering token for user:', userId, 'device:', deviceName);

    const fcmToken = await NotificationService.registerToken(
      userId,
      token,
      deviceName || 'Unknown Device',
      deviceType || 'web'
    );

    console.log('[FCM] ✅ Token registered successfully:', fcmToken._id);

    res.status(200).json({
      message: 'FCM token registered successfully',
      data: fcmToken,
    });
  } catch (error) {
    console.error('[FCM] ❌ Error registering token:', error.message);
    res.status(500).json({ message: 'Error registering FCM token', error: error.message });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    const { notifications, unreadCount } = await NotificationService.getUserNotifications(
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      notifications,
      unreadCount,
      total: notifications.length + parseInt(skip, 10),
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

export const getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50 } = req.query;

    // Get only unread notifications (for login/refresh)
    const notifications = await Notification.getUnreadNotifications(userId, parseInt(limit));
    const unreadCount = notifications.length;

    res.status(200).json({
      notifications,
      unreadCount,
      total: unreadCount,
    });
  } catch (error) {
    console.error('[NotificationController] Error fetching unread notifications:', error.message);
    res.status(500).json({ message: 'Error fetching unread notifications' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    console.log('[NotificationController] ========== MARK AS READ REQUEST ==========');
    const { id } = req.params;
    const userId = req.user._id;

    console.log('[NotificationController] Notification ID:', id);
    console.log('[NotificationController] User ID:', userId);

    const notification = await NotificationService.markAsRead(id, userId);

    console.log('[NotificationController] ✅ Notification marked as read');
    console.log('[NotificationController] Notification:', notification._id, 'isRead:', notification.isRead);
    console.log('[NotificationController] ========== MARK AS READ REQUEST END ==========');

    res.status(200).json({
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('[NotificationController] ❌ Error marking notification as read:', error.message);
    console.error('[NotificationController] Error stack:', error.stack);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await NotificationService.markAllAsRead(userId);

    res.status(200).json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    await NotificationService.deleteNotification(id, userId);

    res.status(200).json({
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error deleting notification' });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await NotificationService.deleteAllNotifications(userId);

    res.status(200).json({
      message: 'All notifications deleted successfully',
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error deleting all notifications' });
  }
};

export const sendNotification = async (req, res) => {
  try {
    console.log('[NotificationController] ========== SEND NOTIFICATION REQUEST ==========');
    console.log('[NotificationController] User role:', req.user.role);
    console.log('[NotificationController] User ID:', req.user._id);
    
    // Allow any authenticated user to send notifications
    // (Remove role restrictions - notifications should work for everyone)

    const { recipientId, title, body, type, data, actionUrl } = req.body;

    console.log('[NotificationController] Request body:', { recipientId, title, body, type, actionUrl });

    if (!recipientId || !title || !body) {
      console.log('[NotificationController] ❌ Missing required fields');
      return res.status(400).json({
        message: 'recipientId, title, and body are required',
      });
    }

    console.log('[NotificationController] Calling NotificationService.sendToUser...');
    
    const notification = await NotificationService.sendToUser(
      recipientId,
      title,
      body,
      {
        type,
        data,
        actionUrl,
        senderId: req.user._id,
      }
    );

    console.log('[NotificationController] ✅ Notification sent successfully');
    console.log('[NotificationController] Notification ID:', notification._id);
    console.log('[NotificationController] ========== SEND NOTIFICATION REQUEST END ==========');

    res.status(200).json({
      message: 'Notification sent successfully',
      data: notification,
    });
  } catch (error) {
    console.error('[NotificationController] ❌ Error sending notification:', error.message);
    console.error('[NotificationController] Error stack:', error.stack);
    console.error('[NotificationController] ========== SEND NOTIFICATION REQUEST END (ERROR) ==========');
    
    res.status(500).json({ message: 'Error sending notification' });
  }
};

export const sendBulkNotification = async (req, res) => {
  try {
    // Allow any authenticated user to send bulk notifications
    // (Remove role restrictions - notifications should work for everyone)

    const { userIds, title, body, type, data, actionUrl } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: 'userIds array is required',
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        message: 'title and body are required',
      });
    }

    const notifications = await NotificationService.sendToMultiple(
      userIds,
      title,
      body,
      {
        type,
        data,
        actionUrl,
        senderId: req.user._id,
      }
    );

    res.status(200).json({
      message: `Notification sent to ${notifications.length} users`,
      data: notifications,
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error sending bulk notification' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.getUnreadCount(userId);

    res.status(200).json({
      count: unreadCount,
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};

export const sendTestNotification = async (req, res) => {
  try {
    console.log('[NotificationController] ========== SEND TEST NOTIFICATION ==========');
    const userId = req.user._id;
    const { title = 'Test Notification', body = 'This is a test notification' } = req.body;

    console.log('[NotificationController] Sending test notification to user:', userId);
    console.log('[NotificationController] Title:', title);
    console.log('[NotificationController] Body:', body);

    const notification = await NotificationService.sendToUser(
      userId,
      title,
      body,
      {
        type: 'general',
        data: { isTest: 'true' },
        actionUrl: '/notifications',
      }
    );

    console.log('[NotificationController] ✅ Test notification sent');
    console.log('[NotificationController] ========== SEND TEST NOTIFICATION END ==========');

    res.status(200).json({
      message: 'Test notification sent successfully',
      data: notification,
    });
  } catch (error) {
    console.error('[NotificationController] ❌ Error sending test notification:', error.message);
    res.status(500).json({ message: 'Error sending test notification', error: error.message });
  }
};


export const getSoundSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('[getSoundSettings] Fetching settings for user:', userId);

    const user = await User.findById(userId);

    if (!user) {
      console.log('[getSoundSettings] User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    const soundSettings = user.notificationSoundSettings || {
      sound: 'bell_chime',
      volume: 0.3,
      preferences: {
        leaves: true,
        tasks: true,
        meetings: true,
        attendance: true,
        projects: true,
        announcements: true,
        salary: true,
        expenses: true,
        documents: true,
        performance: true
      }
    };

    console.log('[getSoundSettings] Returning settings:', soundSettings);
    res.status(200).json(soundSettings);
  } catch (error) {
    console.error('[getSoundSettings] Error:', error.message);
    console.error('[getSoundSettings] Error details:', error);
    res.status(500).json({ 
      message: 'Error fetching sound settings',
      error: error.message 
    });
  }
};

export const updateSoundSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sound, volume, preferences } = req.body;

    console.log('[updateSoundSettings] Received request:', { userId, sound, volume, preferences });

    if (!sound || volume === undefined) {
      console.log('[updateSoundSettings] Missing required fields');
      return res.status(400).json({ message: 'sound and volume are required' });
    }

    if (volume < 0 || volume > 1) {
      console.log('[updateSoundSettings] Volume out of range:', volume);
      return res.status(400).json({ message: 'volume must be between 0 and 1' });
    }

    console.log('[updateSoundSettings] Updating user:', userId);

    const updateData = {
      $set: {
        'notificationSoundSettings.sound': sound,
        'notificationSoundSettings.volume': volume
      }
    };

    // Add preferences if provided
    if (preferences) {
      Object.keys(preferences).forEach(key => {
        updateData.$set[`notificationSoundSettings.preferences.${key}`] = preferences[key];
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('[updateSoundSettings] Update result:', user?.notificationSoundSettings);

    if (!user) {
      console.log('[updateSoundSettings] User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Sound settings updated successfully',
      data: user.notificationSoundSettings
    });
  } catch (error) {
    console.error('[updateSoundSettings] Error:', error.message);
    console.error('[updateSoundSettings] Error details:', error);
    res.status(500).json({ 
      message: 'Error updating sound settings',
      error: error.message 
    });
  }
};

export const cleanupOldNotifications = async (req, res) => {
  try {
    // Only allow admin/superadmin to run cleanup
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const daysOld = req.query.daysOld || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));

    const result = await Notification.deleteMany({
      isRead: true,
      readAt: { $lt: cutoffDate }
    });

    res.status(200).json({
      message: `Deleted ${result.deletedCount} old read notifications`,
      deletedCount: result.deletedCount,
      cutoffDate
    });
  } catch (error) {
    console.error('[NotificationController] Error cleaning up notifications:', error.message);
    res.status(500).json({ message: 'Error cleaning up notifications' });
  }
};
