import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import notificationService from "../services/notificationService";

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

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
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
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/notifications/read-all`,
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
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local state
      const deletedNotif = notifications.find((n) => n._id === notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
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

  // Initialize notifications on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    fetchNotifications();
    
    // Check if notifications are already enabled
    const initRealTime = async () => {
      // iOS Safari detection - skip Firebase initialization
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isStandalone = window.navigator.standalone === true;
      
      if (isIOS && isSafari && !isStandalone) {
        console.log('📱 iOS Safari detected - Push notifications disabled for compatibility');
        return; // Skip Firebase initialization on iOS Safari
      }
      
      const permission = notificationService.getPermissionStatus();
      if (permission === 'granted') {
        setRealTimeEnabled(true);
        // Only initialize if not already initialized
        if (!notificationService.isServiceInitialized()) {
          try {
            // Silent initialization - errors are handled internally
            await notificationService.initializeMessaging();
          } catch (error) {
            // Silently fail - Firebase is optional
            console.debug("Firebase messaging not available");
          }
        }
      }
    };
    
    initRealTime();
  }, [fetchNotifications]);

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