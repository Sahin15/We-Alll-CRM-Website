import { useState, useEffect } from 'react';
import { Dropdown, Badge, Button, ListGroup, Spinner } from 'react-bootstrap';
import { FaBell, FaCheck, FaTrash, FaEye, FaCheckDouble, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import './NotificationBell.css';

const NotificationBell = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications
  } = useNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getNotificationIcon = (type) => {
    const iconMap = {
      'work_item_assigned': '📋',
      'work_item_due_soon': '⏰',
      'work_item_overdue': '🚨',
      'work_item_completed': '✅',
      'work_item_review_requested': '👀',
      'work_item_status_changed': '🔄',
      'work_item_commented': '💬',
      'client_won': '🎉',
      'new_project': '🚀',
      'payment_received': '💰',
      'leave_approved': '✅',
      'leave_rejected': '❌',
      'system': '⚙️',
      'general': '📢'
    };
    return iconMap[type] || '📢';
  };

  const getPriorityColor = (priority) => {
    const colorMap = {
      'urgent': '#EF4444',
      'high': '#F59E0B',
      'medium': '#3B82F6',
      'low': '#6B7280'
    };
    return colorMap[priority] || '#6B7280';
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    
    // Close dropdown on mobile after clicking a notification
    if (isMobile) {
      setShowDropdown(false);
    }
    
    // Navigate to link if provided
    if (notification.link) {
      try {
        navigate(notification.link);
        return;
      } catch (error) {
        console.warn('Navigation failed for link:', notification.link);
      }
    }
    
    // Fallback: Navigate based on notification type and data
    if (notification.type === 'work_item_assigned' || 
        notification.type === 'work_item_due_soon' || 
        notification.type === 'work_item_overdue' ||
        notification.type === 'work_item_review' ||
        notification.type === 'work_item_status_change' ||
        notification.type === 'work_item_completed') {
      if (notification.data?.workItemId) {
        navigate(`/my-work`); // Redirect to work list for now
      }
    } else if (notification.type === 'slot_assigned' || 
               notification.type === 'slot_deadline_approaching' ||
               notification.type === 'slot_overdue' ||
               notification.type === 'slot_comment_added') {
      navigate(`/my-work`); // Redirect to work list for now
    } else if (notification.type === 'client_won' || notification.type === 'client_onboarding') {
      if (notification.data?.clientId) {
        navigate(`/clients`); // Redirect to clients list for now
      }
    } else if (notification.type === 'announcement' || notification.type === 'urgent') {
      navigate('/employee/announcements');
    } else if (notification.data?.projectId) {
      navigate(`/projects/${notification.data.projectId}`);
    } else if (notification.data?.leaveId) {
      navigate(`/employee/leaves`);
    } else {
      // Default fallback - go to dashboard
      navigate('/dashboard');
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <>
      <Dropdown 
        show={showDropdown} 
        onToggle={setShowDropdown}
        className="notification-bell-dropdown"
      >
        <Dropdown.Toggle
          variant="link"
          className="notification-bell-toggle p-2 position-relative"
          id="notification-dropdown"
        >
          <FaBell size={20} className="text-white" />
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

        <Dropdown.Menu className="notification-dropdown-menu shadow-lg" align="end">
        <div className="notification-header p-3 border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold">Notifications</h6>
            <div className="d-flex gap-2 align-items-center">
              <Button
                variant="link"
                size="sm"
                className="p-0 text-decoration-none text-white"
                onClick={fetchNotifications}
                disabled={loading}
                title="Refresh"
              >
                {loading ? <Spinner size="sm" /> : '🔄'}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-decoration-none text-white"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <FaCheckDouble />
                </Button>
              )}
              {isMobile && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-decoration-none text-white ms-2"
                  onClick={() => setShowDropdown(false)}
                  title="Close"
                >
                  <FaTimes size={16} />
                </Button>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <small className="text-muted">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </small>
          )}
        </div>

        <div className="notification-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {recentNotifications.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaBell size={32} className="mb-2 opacity-50" />
              <p className="mb-0">No notifications yet</p>
            </div>
          ) : (
            <ListGroup variant="flush">
              {recentNotifications.map((notification) => (
                <ListGroup.Item
                  key={notification._id}
                  className={`notification-item border-0 ${!notification.isRead ? 'unread' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-start">
                    <div className="notification-icon me-3 mt-1">
                      <span style={{ fontSize: '1.2rem' }}>
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    
                    <div 
                      className="flex-grow-1"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <h6 className="notification-title mb-0 fw-semibold">
                          {notification.title}
                        </h6>
                        <div 
                          className="priority-indicator"
                          style={{ 
                            backgroundColor: getPriorityColor(notification.priority),
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            flexShrink: 0
                          }}
                        />
                      </div>
                      
                      <p className="notification-message mb-1 text-muted small">
                        {notification.message}
                      </p>
                      
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </small>
                        
                        <div className="notification-actions d-flex gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-1 text-decoration-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              title="Mark as read"
                            >
                              <FaCheck size={12} />
                            </Button>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            className="p-1 text-decoration-none text-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            title="Delete"
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
        </div>

        {notifications.length > 5 && (
          <div className="notification-footer p-2 border-top text-center">
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none"
              onClick={() => {
                navigate('/employee/announcements');
                if (isMobile) setShowDropdown(false);
              }}
            >
              <FaEye className="me-1" />
              View All Notifications
            </Button>
          </div>
        )}
        </Dropdown.Menu>
      </Dropdown>

      {/* Mobile backdrop */}
      {isMobile && showDropdown && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.3)', 
            zIndex: 9998 
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </>
  );
};

export default NotificationBell;