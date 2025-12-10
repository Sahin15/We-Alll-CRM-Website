import { useState, useEffect } from 'react';
import { Dropdown, Badge, ListGroup, Button } from 'react-bootstrap';
import { FaBell, FaCheck, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import notificationApi from '../../api/notificationApi';
import { formatDate } from '../../utils/helpers';
import './NotificationBell.css';

/**
 * NotificationBell Component
 * Displays notification bell with dropdown list
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationApi.getNotifications();
      setNotifications(response.data || response.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter((n) => !n.read)
        .map((n) => n._id);
      
      if (unreadIds.length === 0) {
        toast.info('No unread notifications');
        return;
      }

      await notificationApi.bulkMarkAsRead(unreadIds);
      toast.success('All notifications marked as read');
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      loadNotifications();
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification._id, { stopPropagation: () => {} });
    }

    // Navigate to related item
    if (notification.workItem) {
      navigate('/employee/my-work');
    } else if (notification.project) {
      navigate(`/projects/${notification.project._id}`);
    }

    setShow(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      work_item_assigned: '📋',
      work_item_due_soon: '⏰',
      work_item_overdue: '⚠️',
      work_item_review_requested: '👀',
      work_item_status_changed: '🔄',
      work_item_completed: '✅',
      work_item_commented: '💬'
    };
    return icons[type] || '🔔';
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by type
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const type = notification.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(notification);
    return acc;
  }, {});

  return (
    <Dropdown show={show} onToggle={setShow} align="end">
      <Dropdown.Toggle
        variant="link"
        className="notification-bell-toggle position-relative"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <FaBell size={20} />
        {unreadCount > 0 && (
          <Badge
            bg="danger"
            pill
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: '0.7rem' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-dropdown" style={{ width: '400px', maxHeight: '500px', overflowY: 'auto' }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="p-0"
            >
              <FaCheck className="me-1" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <FaBell size={30} className="mb-2 opacity-50" />
            <p className="mb-0">No notifications</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {notifications.slice(0, 10).map((notification) => (
              <ListGroup.Item
                key={notification._id}
                action
                onClick={() => handleNotificationClick(notification)}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                style={{
                  backgroundColor: !notification.read ? '#f8f9fa' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <div className="d-flex">
                  <div className="me-2" style={{ fontSize: '1.5rem' }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <strong className="d-block mb-1" style={{ fontSize: '0.9rem' }}>
                        {notification.title}
                      </strong>
                      {!notification.read && (
                        <Badge bg="primary" pill style={{ fontSize: '0.6rem' }}>
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
                      {notification.message}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {formatDate(notification.createdAt)}
                      </small>
                      <div>
                        {!notification.read && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 me-2"
                            onClick={(e) => handleMarkAsRead(notification._id, e)}
                          >
                            <FaCheck size={12} />
                          </Button>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-danger"
                          onClick={(e) => handleDelete(notification._id, e)}
                        >
                          <FaTrash size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        {notifications.length > 10 && (
          <div className="text-center py-2 border-top">
            <Button variant="link" size="sm">
              View all notifications
            </Button>
          </div>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;
