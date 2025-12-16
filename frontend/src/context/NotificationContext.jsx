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
    const hasPermission = await notificationService.requestNotificationPermission();
    if (hasPermission) {
      setRealTimeEnabled(true);
      notificationService.startPolling(30000); // Poll every 30 seconds
      
      // Add listener for real-time updates
      notificationService.addListener((data) => {
        if (data.type === 'NEW_NOTIFICATIONS') {
          setUnreadCount(data.totalUnread);
          // Optionally refresh notifications list
          fetchNotifications();
        } else if (data.type === 'COUNT_UPDATE') {
          setUnreadCount(data.count);
        }
      });
    }
    return hasPermission;
  }, [fetchNotifications]);

  const disableRealTime = useCallback(() => {
    setRealTimeEnabled(false);
    notificationService.stopPolling();
  }, []);

  // Fetch notifications on mount (only once)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    fetchNotifications();
    
    // Start real-time service if user is logged in
    const initRealTime = async () => {
      const permission = notificationService.getPermissionStatus();
      if (permission === 'granted') {
        enableRealTime();
      }
    };
    
    initRealTime();
    
    // Cleanup on unmount
    return () => {
      notificationService.stopPolling();
    };
  }, [fetchNotifications, enableRealTime]); // Added dependencies

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
