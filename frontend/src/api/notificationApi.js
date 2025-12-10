import api from '../services/api';

/**
 * Notification API
 * Handles all notification operations
 */
export const notificationApi = {
  /**
   * Get user notifications
   * @returns {Promise} Notifications data
   */
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   * @returns {Promise} Updated notification
   */
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark multiple notifications as read
   * @param {Array} ids - Array of notification IDs
   * @returns {Promise} Result
   */
  bulkMarkAsRead: async (ids) => {
    const response = await api.post('/notifications/bulk-read', { ids });
    return response.data;
  },

  /**
   * Delete notification
   * @param {string} id - Notification ID
   * @returns {Promise} Result
   */
  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  }
};

export default notificationApi;
