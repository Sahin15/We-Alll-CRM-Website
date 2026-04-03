import React, { useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, ListGroup, Dropdown, Spinner } from 'react-bootstrap';
import { FaBell, FaTrash, FaCheckCircle, FaCircle } from 'react-icons/fa';
import { formatDate, formatTime } from '../../utils/helpers';
import './NotificationCenter.css';

const NotificationCenter = ({ notifications, unreadCount, onMarkAsRead, onDelete, onMarkAllAsRead, onDeleteAll, loading }) => {
  const [filter, setFilter] = useState('all'); // all, unread, read

  const getNotificationIcon = (type) => {
    const icons = {
      // Work
      work_assigned: '📋', work_reassigned: '🔄', work_reassigned_from: '🔄',
      work_reassigned_project: '🔄', work_updated: '✏️', work_updated_project: '✏️',
      work_status_changed: '🔄', work_completed: '✅', review_requested: '👀',
      task_assigned: '📋',
      // Leave
      leave_approval: '✅', leave_rejection: '❌', leave_request: '📋',
      // Meeting
      meeting_scheduled: '📅', meeting_updated: '📅', meeting_cancelled: '🚫',
      meeting_reminder_15min: '⏰', meeting_reminder_1hour: '📅',
      // Expense
      expense_approval: '💰', expense_rejection: '❌',
      expense_submitted: '🧾', expense_reimbursed: '💸',
      // Invoice
      invoice_generated: '🧾', invoice_sent: '📤', invoice_paid: '✅', invoice_overdue: '⚠️',
      // Client / Project
      client_created: '🤝', client_status_changed: '🔄',
      project_created: '🚀', project_status_changed: '🔄',
      project_deadline_7days: '📅', project_deadline_3days: '⏰',
      // WFH
      wfh_request_submitted: '🏠', wfh_request_approved: '✅', wfh_request_rejected: '❌',
      // Payment / Plan
      payment_processed: '💳', payment_due: '💰', payment_overdue: '⚠️',
      plan_renewal_reminder: '📅', plan_expiring: '⚠️', plan_expired: '🚫',
      // Attendance
      attendance_alert: '⏰', attendance_auto_clockout: '⚠️',
      // Other
      work_log_reminder: '📝', announcement: '📢', general: '📬',
    };
    return icons[type] || '📬';
  };

  const getNotificationColor = (type) => {
    const colors = {
      work_assigned: 'primary', work_reassigned: 'secondary', work_status_changed: 'info',
      work_completed: 'success', review_requested: 'warning', task_assigned: 'primary',
      leave_approval: 'success', leave_rejection: 'danger', leave_request: 'info',
      meeting_scheduled: 'info', meeting_updated: 'info', meeting_cancelled: 'danger',
      meeting_reminder_15min: 'warning', meeting_reminder_1hour: 'info',
      expense_approval: 'success', expense_rejection: 'danger',
      expense_submitted: 'info', expense_reimbursed: 'success',
      invoice_generated: 'info', invoice_sent: 'primary',
      invoice_paid: 'success', invoice_overdue: 'danger',
      client_created: 'success', client_status_changed: 'warning',
      project_created: 'success', project_status_changed: 'info',
      project_deadline_7days: 'warning', project_deadline_3days: 'danger',
      wfh_request_submitted: 'info', wfh_request_approved: 'success', wfh_request_rejected: 'danger',
      payment_processed: 'success', payment_due: 'warning', payment_overdue: 'danger',
      plan_renewal_reminder: 'warning', plan_expiring: 'warning', plan_expired: 'danger',
      attendance_alert: 'warning', attendance_auto_clockout: 'warning',
      work_log_reminder: 'info', announcement: 'warning', general: 'secondary',
    };
    return colors[type] || 'secondary';
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <FaBell className="me-2 text-primary" />
                Notifications
              </h2>
              {unreadCount > 0 && (
                <Badge bg="danger" className="ms-2">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={onMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={onDeleteAll}
                disabled={notifications.length === 0}
              >
                Clear all
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filter Tabs */}
      <Row className="mb-3">
        <Col>
          <div className="btn-group" role="group">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === 'read' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setFilter('read')}
            >
              Read ({notifications.filter(n => n.isRead).length})
            </Button>
          </div>
        </Col>
      </Row>

      {/* Notifications List */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" className="text-primary" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-5">
                  <FaBell className="text-muted fs-1 mb-3" />
                  <p className="text-muted">
                    {filter === 'all' && 'No notifications yet'}
                    {filter === 'unread' && 'No unread notifications'}
                    {filter === 'read' && 'No read notifications'}
                  </p>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {filteredNotifications.map((notification, index) => (
                    <div
                      key={notification._id || index}
                      className={`notification-item p-3 border-bottom ${
                        !notification.isRead ? 'bg-light' : ''
                      }`}
                    >
                      <div className="d-flex gap-3">
                        {/* Icon */}
                        <div className="notification-icon fs-4">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <div>
                              <h6 className="mb-1 fw-semibold">
                                {notification.title}
                                {!notification.isRead && (
                                  <FaCircle className="ms-2 text-primary" style={{ fontSize: '0.5rem' }} />
                                )}
                              </h6>
                              <p className="mb-2 text-muted small">
                                {notification.body}
                              </p>
                            </div>
                            <Badge bg={getNotificationColor(notification.type)} className="ms-2">
                              {notification.type.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              {formatDate(notification.createdAt)} {formatTime(notification.createdAt)}
                            </small>

                            <div className="d-flex gap-2">
                              {!notification.isRead && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="text-primary p-0"
                                  onClick={() => onMarkAsRead(notification._id)}
                                  title="Mark as read"
                                >
                                  <FaCheckCircle />
                                </Button>
                              )}
                              <Button
                                variant="link"
                                size="sm"
                                className="text-danger p-0"
                                onClick={() => onDelete(notification._id)}
                                title="Delete"
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default NotificationCenter;
