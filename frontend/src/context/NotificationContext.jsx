import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import notificationService from "../services/notificationService";
import { playSound } from "../services/notificationService";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const prevUnreadRef = useRef(0);
  // Track IDs deleted in this session so polling doesn't bring them back
  // Persisted in localStorage so they survive page refreshes
  const deletedIdsRef = useRef(new Set(
    JSON.parse(localStorage.getItem('_deleted_notif_ids') || '[]')
  ));

  // Helper to persist deleted IDs
  const persistDeletedId = (id) => {
    deletedIdsRef.current.add(id);
    try {
      const arr = Array.from(deletedIdsRef.current).slice(-200); // keep last 200
      localStorage.setItem('_deleted_notif_ids', JSON.stringify(arr));
    } catch {}
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/notifications/my-notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let newNotifications = response.data.notifications || [];
      const newUnreadCount = response.data.unreadCount || 0;

      // Filter out any IDs we already deleted this session
      if (deletedIdsRef.current.size > 0) {
        newNotifications = newNotifications.filter(n => !deletedIdsRef.current.has(n._id));
      }

      // Play sound only after AudioContext is unlocked (avoids autoplay console noise)
      if (newUnreadCount > prevUnreadRef.current) {
        try { await playSound(); } catch {}
      }
      prevUnreadRef.current = newUnreadCount;

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [API_URL]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      console.log('[NotificationContext] ========== MARK AS READ START ==========');
      console.log('[NotificationContext] Notification ID:', notificationId);
      
      const token = localStorage.getItem("token");
      console.log('[NotificationContext] Token available:', !!token);
      
      const response = await axios.put(
        `${API_URL}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('[NotificationContext] ✅ Backend response:', response.status);
      
      // Update local state
      setNotifications((prev) => {
        const updated = prev.map((notif) =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        );
        console.log('[NotificationContext] Updated notifications in state');
        return updated;
      });
      
      setUnreadCount((prev) => {
        const newCount = Math.max(0, prev - 1);
        console.log('[NotificationContext] Unread count updated:', prev, '→', newCount);
        return newCount;
      });
      
      console.log('[NotificationContext] ========== MARK AS READ END (SUCCESS) ==========');
    } catch (error) {
      console.error("[NotificationContext] ❌ Error marking notification as read:", error);
      console.error("[NotificationContext] Error message:", error.message);
      console.error("[NotificationContext] Error response:", error.response?.data);
      console.error('[NotificationContext] ========== MARK AS READ END (ERROR) ==========');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/notifications/mark-all/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    // Immediately add to deleted set AND persist so polling won't bring it back after refresh
    persistDeletedId(notificationId);

    // Optimistically remove from local state
    setNotifications((prev) => {
      const deletedNotif = prev.find((n) => n._id === notificationId);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n._id !== notificationId);
    });

    // Delete from backend
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      // Even if backend fails, keep it out of local state
    }
  };

  // Enable/disable real-time notifications
  const enableRealTime = useCallback(async () => {
    try {
      const hasPermission = await notificationService.requestPermission();
      if (hasPermission) {
        setRealTimeEnabled(true);
        // Permission request already initializes messaging
      }
      return hasPermission;
    } catch (error) {
      console.error("Error enabling real-time notifications:", error);
      return false;
    }
  }, []);

  const disableRealTime = useCallback(() => {
    setRealTimeEnabled(false);
    // Note: Firebase messaging doesn't need explicit stopping
  }, []);

  // Initialize notifications on mount + poll every 30s for real-time feel
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetchNotifications();

    // Poll every 30 seconds so new notifications appear without a page refresh
    const pollInterval = setInterval(fetchNotifications, 30000);

    // Wire up foreground FCM message handler — instant bell update + sound
    notificationService.onForegroundMessage = () => {
      try {
        notificationService.playSound();
      } catch (soundError) {
        // Sound is optional - don't block on audio errors
        console.debug('Notification sound skipped:', soundError?.message);
      }
      fetchNotifications();
    };

    return () => {
      clearInterval(pollInterval);
      notificationService.onForegroundMessage = null;
    };
  }, []); // Empty dependency array - run only once on mount

  const value = {
    notifications,
    unreadCount,
    loading,
    realTimeEnabled,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    enableRealTime,
    disableRealTime,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;