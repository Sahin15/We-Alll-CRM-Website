import { useState, useEffect } from 'react';
import { Dropdown, Badge, Button, ListGroup, Spinner, Modal, Card } from 'react-bootstrap';
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
  const [showAllModal, setShowAllModal] = useState(false);
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
      // Work items
      'work_assigned': '📋',
      'work_reassigned': '🔄',
      'work_reassigned_from': '🔄',
      'work_reassigned_project': '🔄',
      'work_updated': '✏️',
      'work_updated_project': '✏️',
      'work_status_changed': '🔄',
      'work_completed': '✅',
      'review_requested': '👀',
      'task_assigned': '📋',
      // Legacy work_item_ types (backward compat)
      'work_item_assigned': '📋',
      'work_item_due_soon': '⏰',
      'work_item_overdue': '🚨',
      'work_item_completed': '✅',
      'work_item_review_requested': '👀',
      'work_item_status_changed': '🔄',
      'work_item_commented': '💬',
      // Leave
      'leave_approval': '✅',
      'leave_rejection': '❌',
      'leave_request': '📋',
      // Meeting
      'meeting_scheduled': '📅',
      'meeting_updated': '📅',
      'meeting_cancelled': '🚫',
      'meeting_reminder_15min': '⏰',
      'meeting_reminder_1hour': '📅',
      // Expense
      'expense_approval': '💰',
      'expense_rejection': '❌',
      'expense_submitted': '🧾',
      'expense_reimbursed': '💸',
      // Invoice
      'invoice_generated': '🧾',
      'invoice_sent': '📤',
      'invoice_paid': '✅',
      'invoice_overdue': '⚠️',
      // Client / Project
      'client_created': '🤝',
      'client_status_changed': '🔄',
      'project_created': '🚀',
      'project_status_changed': '🔄',
      'project_deadline_7days': '📅',
      'project_deadline_3days': '⏰',
      // WFH
      'wfh_request_submitted': '🏠',
      'wfh_request_approved': '✅',
      'wfh_request_rejected': '❌',
      // Payment / Plan
      'payment_processed': '💳',
      'payment_due': '💰',
      'payment_overdue': '⚠️',
      'plan_renewal_reminder': '📅',
      'plan_expiring': '⚠️',
      'plan_expired': '🚫',
      // Attendance
      'attendance_alert': '⏰',
      'attendance_auto_clockout': '⚠️',
      // Other
      'work_log_reminder': '📝',
      'announcement': '📢',
      'general': '📬',
      'feedback_submitted': '💬',
    };
    return iconMap[type] || '📬';
  };

  const getPriorityColor = (priority) => {
    const colorMap = {
      'high': '#EF4444',
      'normal': '#3B82F6',
      'low': '#6B7280',
      // legacy values
      'urgent': '#EF4444',
      'medium': '#3B82F6',
    };
    return colorMap[priority] || '#6B7280';
  };

  // Some old notifications were saved with a corrupted icon prefix (encoding issue),
  // e.g. "≡ƒôï New Leave Request". Strip leading non-alphanumeric garbage.
  const sanitizeNotificationTitle = (title) => {
    if (typeof title !== 'string') return '';
    return title.replace(/^[^a-zA-Z0-9]+/, '');
  };

  const handleNotificationClick = async (notification) => {
    // Close UI immediately
    setShowDropdown(false);
    setShowAllModal(false);

    // Mark as read + delete in background (for bell dropdown clicks — one-click dismiss)
    if (!notification.isRead) markAsRead(notification._id);
    deleteNotification(notification._id);

    // Determine destination
    let destination = null;
    const adminOnlyRoutes = ['/expenses/manage', '/expenses/management'];
    if (notification.actionUrl && !adminOnlyRoutes.includes(notification.actionUrl)) {
      destination = notification.actionUrl;
    } else if (notification.link) {
      destination = notification.link;
    } else {
      const type = notification.type;
      if (['work_item_assigned','work_item_due_soon','work_item_overdue','work_item_review','work_item_status_change','work_item_completed','work_assigned','work_reassigned','task_assigned'].includes(type)) {
        destination = '/my-work';
      } else if (['slot_assigned','slot_deadline_approaching','slot_overdue','slot_comment_added'].includes(type)) {
        destination = '/my-work';
      } else if (['expense_submitted','expense_approval','expense_rejection','expense_reimbursed'].includes(type)) {
        destination = '/expenses/my-expenses';
      } else if (['leave_request','leave_approval','leave_rejection'].includes(type)) {
        destination = '/leaves/my-leaves';
      } else if (['meeting_scheduled','meeting_updated','meeting_cancelled','meeting_reminder_15min','meeting_reminder_1hour'].includes(type)) {
        destination = '/meetings';
      } else if (['wfh_request_submitted','wfh_request_approved','wfh_request_rejected'].includes(type)) {
        destination = '/leaves/my-leaves';
      } else if (['attendance_alert','attendance_auto_clockout'].includes(type)) {
        destination = '/attendance/my-attendance';
      } else if (['announcement','urgent'].includes(type)) {
        destination = '/employee/announcements';
      } else if (type === 'feedback_submitted') {
        destination = '/employee/announcements?tab=feedback';
      } else if (notification.data?.projectId) {
        destination = `/projects/${notification.data.projectId}`;
      } else {
        destination = '/employee/announcements';
      }
    }
    if (destination) navigate(destination);
  };

  // View only — navigate without deleting (used in "All Notifications" modal View button)
  const handleViewNotification = (notification) => {
    setShowAllModal(false);
    if (!notification.isRead) markAsRead(notification._id);

    const adminOnlyRoutes = ['/expenses/manage', '/expenses/management'];
    let destination = null;
    if (notification.actionUrl && !adminOnlyRoutes.includes(notification.actionUrl)) {
      destination = notification.actionUrl;
    } else if (notification.link) {
      destination = notification.link;
    } else {
      const type = notification.type;
      if (['work_item_assigned','work_item_due_soon','work_item_overdue','work_item_review','work_item_status_change','work_item_completed','work_assigned','work_reassigned','task_assigned'].includes(type)) {
        destination = '/my-work';
      } else if (['expense_submitted','expense_approval','expense_rejection','expense_reimbursed'].includes(type)) {
        destination = '/expenses/my-expenses';
      } else if (['leave_request','leave_approval','leave_rejection'].includes(type)) {
        destination = '/leaves/my-leaves';
      } else if (['meeting_scheduled','meeting_updated','meeting_cancelled','meeting_reminder_15min','meeting_reminder_1hour'].includes(type)) {
        destination = '/meetings';
      } else if (['wfh_request_submitted','wfh_request_approved','wfh_request_rejected'].includes(type)) {
        destination = '/leaves/my-leaves';
      } else if (['attendance_alert','attendance_auto_clockout'].includes(type)) {
        destination = '/attendance/my-attendance';
      } else if (['announcement','urgent'].includes(type)) {
        destination = '/employee/announcements';
      } else if (type === 'feedback_submitted') {
        destination = '/employee/announcements?tab=feedback';
      } else if (notification.data?.projectId) {
        destination = `/projects/${notification.data.projectId}`;
      } else {
        destination = '/employee/announcements';
      }
    }
    if (destination) navigate(destination);
  };

  // Only show unread notifications in the bell dropdown
  const unreadNotifications = notifications.filter(n => !n.isRead);
  const recentNotifications = unreadNotifications.slice(0, 10);

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

        <Dropdown.Menu
          className="notification-dropdown-menu shadow-lg"
          align="end"
          popperConfig={{ strategy: "fixed" }}
        >
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
              <p className="mb-0">{unreadCount === 0 ? 'No unread notifications' : 'All caught up!'}</p>
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
                          {sanitizeNotificationTitle(notification.title)}
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
                        {notification.body}
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
                setShowDropdown(false);
                setShowAllModal(true);
              }}
            >
              <FaEye className="me-1" />
              View All ({notifications.length})
            </Button>
          </div>
        )}
        </Dropdown.Menu>
      </Dropdown>

      {/* Mobile backdrop */}
      {isMobile && showDropdown && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', zIndex: 9998 }}
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* All Notifications Modal */}
      <Modal show={showAllModal} onHide={() => setShowAllModal(false)} size="lg" centered scrollable>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaBell />
            All Notifications
            {unreadCount > 0 && <Badge bg="danger" pill>{unreadCount} unread</Badge>}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaBell size={48} className="mb-3 opacity-25" />
              <p className="mb-0">No notifications</p>
            </div>
          ) : (
            <ListGroup variant="flush">
              {notifications.map((notification) => (
                <ListGroup.Item
                  key={notification._id}
                  className={`border-bottom ${!notification.isRead ? 'bg-light' : ''}`}
                >
                  <div className="d-flex align-items-start gap-3 py-1">
                    <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-grow-1 min-width-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-1 fw-semibold text-truncate pe-2">{notification.title}</h6>
                        <small className="text-muted flex-shrink-0">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </small>
                      </div>
                      <p className="mb-2 text-muted small">{notification.body}</p>
                      <div className="d-flex align-items-center gap-2">
                        {!notification.isRead && <Badge bg="primary" pill style={{ fontSize: '0.65rem' }}>New</Badge>}
                        {/* View button — navigates to the relevant page */}
                        <Button
                          size="sm"
                          variant="outline-primary"
                          style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                          onClick={() => handleViewNotification(notification)}
                        >
                          <FaEye className="me-1" />View
                        </Button>
                        {/* Remove button — deletes permanently */}
                        <Button
                          size="sm"
                          variant="outline-danger"
                          style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                        >
                          <FaTrash className="me-1" />Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <small className="text-muted">
            <strong>View</strong> — navigate to the page &nbsp;|&nbsp; <strong>Remove</strong> — delete permanently
          </small>
          <div className="d-flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline-primary" size="sm" onClick={markAllAsRead}>
                <FaCheckDouble className="me-1" />Mark All Read
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowAllModal(false)}>Close</Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NotificationBell;
