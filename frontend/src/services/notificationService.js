/**
 * Real-time Notification Service
 * Handles real-time updates for notifications using polling
 */

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.pollingInterval = null;
    this.isPolling = false;
    this.lastNotificationCount = 0;
  }

  /**
   * Start polling for new notifications
   * @param {number} interval - Polling interval in milliseconds (default: 30 seconds)
   */
  startPolling(interval = 30000) {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    this.pollingInterval = setInterval(() => {
      this.checkForNewNotifications();
    }, interval);

    // Initial check
    this.checkForNewNotifications();
  }

  /**
   * Stop polling for notifications
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Add a listener for notification updates
   * @param {Function} callback - Callback function to handle updates
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove a listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of updates
   * @param {Object} data - Update data
   */
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Check for new notifications
   */
  async checkForNewNotifications() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification count');
      }

      const data = await response.json();
      const currentCount = data.count || 0;

      // Check if there are new notifications
      if (currentCount > this.lastNotificationCount) {
        const newNotificationsCount = currentCount - this.lastNotificationCount;
        
        // Fetch the latest notifications to get details
        const notificationsResponse = await fetch('/api/notifications?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json();
          const latestNotifications = notificationsData.notifications || [];
          
          // Notify listeners about new notifications
          this.notifyListeners({
            type: 'NEW_NOTIFICATIONS',
            count: newNotificationsCount,
            totalUnread: currentCount,
            latestNotifications: latestNotifications.slice(0, newNotificationsCount)
          });

          // Show browser notification if permission granted
          this.showBrowserNotification(latestNotifications[0], newNotificationsCount);
        }
      }

      this.lastNotificationCount = currentCount;

      // Notify listeners about count update
      this.notifyListeners({
        type: 'COUNT_UPDATE',
        count: currentCount
      });

    } catch (error) {
      console.error('Error checking for new notifications:', error);
    }
  }

  /**
   * Show browser notification
   * @param {Object} notification - Latest notification object
   * @param {number} count - Number of new notifications
   */
  showBrowserNotification(notification, count) {
    if (!notification || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const title = count > 1 
        ? `${count} new notifications`
        : notification.title;
      
      const options = {
        body: count > 1 
          ? `Latest: ${notification.message}`
          : notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'we-alll-office-notification',
        requireInteraction: false,
        silent: false
      };

      const browserNotification = new Notification(title, options);
      
      // Auto close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);

      // Handle click
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        
        // Navigate to notifications page or specific notification
        if (notification.link) {
          window.location.href = notification.link;
        } else {
          window.location.href = '/employee/announcements';
        }
      };
    }
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Send a test notification
   */
  sendTestNotification() {
    if (Notification.permission === 'granted') {
      const notification = new Notification('We Alll Office', {
        body: 'Notifications are working! You\'ll receive updates here.',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });

      setTimeout(() => {
        notification.close();
      }, 3000);
    }
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;