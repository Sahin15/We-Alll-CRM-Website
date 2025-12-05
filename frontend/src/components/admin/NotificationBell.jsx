import { useState, useRef, useEffect } from "react";
import { FaBell, FaTimes } from "react-icons/fa";
import { Dropdown } from "react-bootstrap";
import { useNotifications } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import "./NotificationBell.css";

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigate to relevant page based on notification type or link
    // First check if notification has a direct link
    if (notification.link) {
      navigate(notification.link);
      setShow(false);
      return;
    }

    // Then check notification type
    if (notification.type === 'announcement' || notification.type === 'urgent') {
      navigate('/employee/announcements');
      setShow(false);
      return;
    }

    // Navigate based on notification data
    if (notification.data) {
      // Admin/Billing notifications
      if (notification.data.invoiceId) {
        navigate(`/admin/invoices/${notification.data.invoiceId}`);
      } else if (notification.data.paymentId) {
        navigate(`/admin/payments/${notification.data.paymentId}`);
      } else if (notification.data.subscriptionId) {
        navigate(`/admin/subscriptions/${notification.data.subscriptionId}`);
      }
      // Leave notifications
      else if (notification.data.leaveId) {
        navigate(`/leaves/requests`);
      }
      // Task notifications
      else if (notification.data.taskId) {
        navigate(`/tasks`);
      }
      // Attendance notifications
      else if (notification.data.attendanceId) {
        navigate(`/attendance/tracking`);
      }
      // Employee notifications
      else if (notification.data.employeeId) {
        navigate(`/users/${notification.data.employeeId}`);
      }
      // Project notifications
      else if (notification.data.projectId) {
        navigate(`/projects/${notification.data.projectId}`);
      }
      // Announcement notifications
      else if (notification.data.announcementId) {
        navigate(`/employee/announcements`);
      }
    }

    setShow(false);
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      // Announcements (different types)
      announcement: "📢",
      urgent: "⚠️",
      important: "❗",
      general: "ℹ️",
      event: "📅",
      holiday: "🎉",
      policy: "📋",
      
      // Billing/Payment
      payment_due: "💰",
      payment_submitted: "📝",
      payment_verified: "✅",
      payment_rejected: "❌",
      subscription_activated: "🎉",
      subscription_expired: "⏰",
      invoice_generated: "📄",
      subscription_cancelled: "🚫",
      plan_updated: "📋",
      service_added: "➕",
      
      // Leave Management
      leave_requested: "📅",
      leave_approved: "✅",
      leave_rejected: "❌",
      leave_cancelled: "🚫",
      
      // Task Management
      task_assigned: "📋",
      task_completed: "✅",
      task_overdue: "⏰",
      task_updated: "📝",
      task_reminder: "🔔",
      
      // Attendance
      attendance_late: "⏰",
      attendance_absent: "❌",
      attendance_reminder: "🔔",
      attendance_approved: "✅",
      
      // Employee/HR
      employee_joined: "👋",
      employee_left: "👋",
      document_uploaded: "📄",
      document_approved: "✅",
      document_rejected: "❌",
      
      // Projects
      project_assigned: "🎯",
      project_completed: "🎉",
      project_deadline: "⏰",
      project_updated: "📝",
      
      // Meetings
      meeting_scheduled: "📅",
      meeting_reminder: "🔔",
      meeting_cancelled: "🚫",
      
      // General
      reminder: "🔔",
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };
    return icons[type] || "ℹ️";
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setShow(!show)}
        aria-label="Notifications"
      >
        <FaBell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {show && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h6 className="mb-0">Notifications</h6>
            {unreadCount > 0 && (
              <button
                className="btn btn-link btn-sm text-primary p-0"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <FaBell size={32} className="mb-2 opacity-50" />
                <p className="mb-0">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTime(notification.createdAt)}</div>
                  </div>
                  <button
                    className="notification-delete"
                    onClick={(e) => handleDelete(e, notification._id)}
                    aria-label="Delete notification"
                  >
                    <FaTimes size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="notification-footer">
              <button
                className="btn btn-link btn-sm w-100"
                onClick={() => {
                  navigate("/admin/notifications");
                  setShow(false);
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
