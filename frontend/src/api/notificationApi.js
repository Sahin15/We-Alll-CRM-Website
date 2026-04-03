import api from '../services/api';

export const notificationApi = {
  // Register FCM token
  registerToken: (token, deviceName, deviceType) =>
    api.post('/notifications/register-token', {
      token,
      deviceName,
      deviceType,
    }),

  // Get user notifications (all)
  getMyNotifications: (limit = 20, skip = 0) =>
    api.get('/notifications/my-notifications', {
      params: { limit, skip },
    }),

  // Get ONLY unread notifications (for login/refresh)
  getUnreadNotifications: (limit = 50) =>
    api.get('/notifications/unread', {
      params: { limit },
    }),

  // Get unread count
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  // Mark as read
  markAsRead: (notificationId) =>
    api.put(`/notifications/${notificationId}/read`),

  // Mark all as read
  markAllAsRead: () =>
    api.put('/notifications/mark-all/read'),

  // Delete notification
  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),

  // Delete all notifications
  deleteAllNotifications: () =>
    api.delete('/notifications/delete-all/notifications'),

  // Send notification (admin only)
  sendNotification: (recipientId, title, body, type, data, actionUrl) =>
    api.post('/notifications/send', {
      recipientId,
      title,
      body,
      type,
      data,
      actionUrl,
    }),

  // Send bulk notification (admin only)
  sendBulkNotification: (userIds, title, body, type, data, actionUrl) =>
    api.post('/notifications/send-bulk', {
      userIds,
      title,
      body,
      type,
      data,
      actionUrl,
    }),

  // Cleanup old notifications (admin only)
  cleanupOldNotifications: (daysOld = 30) =>
    api.delete('/notifications/cleanup/old', {
      params: { daysOld },
    }),
};
