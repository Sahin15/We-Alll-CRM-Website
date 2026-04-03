import { useEffect, useState, useCallback, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from '../config/firebaseConfig';
import api from '../services/api';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const shownNotificationIds = useRef(new Set()); // Track shown notifications to prevent duplicates

  // Register FCM token
  const registerToken = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[NOTIFICATIONS] Notification permission denied');
        return;
      }

      const messagingInstance = await getMessagingInstance();
      if (!messagingInstance) {
        console.log('[NOTIFICATIONS] Firebase Messaging not available');
        return;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
      const token = await getToken(messagingInstance, { vapidKey });

      if (token) {
        await api.post('/notifications/register-token', {
          token,
          deviceName: navigator.userAgent.split(' ').pop(),
          deviceType: 'web',
        });
        console.log('[NOTIFICATIONS] ✅ Token registered with backend');
      } else {
        console.log('[NOTIFICATIONS] ⚠️  No FCM token available');
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Error registering token:', error);
    }
  }, []);

  // Listen for foreground messages
  const setupMessageListener = useCallback(async () => {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) {
      console.log('[NOTIFICATIONS] Firebase Messaging not available');
      return;
    }

    onMessage(messagingInstance, payload => {
      console.log('[NOTIFICATIONS] Foreground message received:', payload);

      const notificationId = payload.data?.notificationId;
      
      // Prevent duplicate notifications
      if (notificationId && shownNotificationIds.current.has(notificationId)) {
        console.log('[NOTIFICATIONS] ⚠️  Notification already shown, skipping:', notificationId);
        return;
      }

      if (notificationId) {
        shownNotificationIds.current.add(notificationId);
      }

      const notification = {
        _id: notificationId,
        title: payload.notification?.title,
        body: payload.notification?.body,
        type: payload.data?.type,
        createdAt: new Date(),
        isRead: false,
      };

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title, {
          body: payload.notification?.body,
          icon: payload.notification?.icon || '/logo192.png',
          badge: '/badge-72x72.png',
          tag: payload.data?.type || 'notification',
        });
      }
    });
  }, []);

  // Fetch ONLY unread notifications on login/refresh
  const fetchUnreadNotifications = useCallback(async () => {
    try {
      console.log('[NOTIFICATIONS] Fetching unread notifications...');
      const response = await api.get('/notifications/unread', {
        params: { limit: 50 },
      });
      
      const unreadNotifications = response.data.notifications || [];
      console.log('[NOTIFICATIONS] Fetched', unreadNotifications.length, 'unread notifications');
      
      // Add to shown set to prevent re-showing
      unreadNotifications.forEach(n => {
        if (n._id) {
          shownNotificationIds.current.add(n._id);
        }
      });
      
      setNotifications(unreadNotifications);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('[NOTIFICATIONS] Error fetching unread notifications:', error);
    }
  }, []);

  // Fetch all notifications (for notification center/history)
  const fetchAllNotifications = useCallback(async () => {
    try {
      console.log('[NOTIFICATIONS] Fetching all notifications...');
      const response = await api.get('/notifications/my-notifications', {
        params: { limit: 50, skip: 0 },
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('[NOTIFICATIONS] Error fetching all notifications:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      console.log('[NOTIFICATIONS] Marking notification as read:', notificationId);
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => {
        const updated = prev.map(n => 
          n._id === notificationId ? { ...n, isRead: true } : n
        );
        console.log('[NOTIFICATIONS] Notification marked as read in state');
        return updated;
      });
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[NOTIFICATIONS] Error marking as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/mark-all/read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[NOTIFICATIONS] Error marking all as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[NOTIFICATIONS] Error deleting notification:', error);
    }
  }, []);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    try {
      await api.delete('/notifications/delete-all/notifications');
      setNotifications([]);
      setUnreadCount(0);
      shownNotificationIds.current.clear();
    } catch (error) {
      console.error('[NOTIFICATIONS] Error deleting all notifications:', error);
    }
  }, []);

  // Listen for service worker messages (notification clicks)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('[NOTIFICATIONS] Notification clicked from service worker');
        console.log('[NOTIFICATIONS] Notification ID:', event.data.notificationId);
        console.log('[NOTIFICATIONS] URL:', event.data.url);

        // Mark notification as read if we have the ID
        if (event.data.notificationId) {
          markAsRead(event.data.notificationId);
        }

        // Navigate to the URL
        if (event.data.url && event.data.url !== '/') {
          window.location.href = event.data.url;
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [markAsRead]);

  // Initialize on mount - fetch only unread notifications
  useEffect(() => {
    if (!isInitialized) {
      console.log('[NOTIFICATIONS] Initializing notifications system...');
      fetchUnreadNotifications(); // Only fetch unread on login
      setupMessageListener();
      registerToken();
      setIsInitialized(true);
    }
  }, [isInitialized, fetchUnreadNotifications, setupMessageListener, registerToken]);

  // Refresh unread notifications every 60 seconds (less frequent to reduce server load)
  useEffect(() => {
    const interval = setInterval(fetchUnreadNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    fetchUnreadNotifications,
    fetchAllNotifications,
  };
};

export default useNotifications;
