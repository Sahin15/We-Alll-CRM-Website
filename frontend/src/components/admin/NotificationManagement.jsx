import { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Alert, 
  Badge, 
  Spinner,
  Row,
  Col,
  InputGroup,
  Dropdown
} from 'react-bootstrap';
import { 
  FaBell, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaSearch,
  FaFilter,
  FaBullhorn,
  FaUsers,
  FaCalendarAlt
} from 'react-icons/fa';
import api from '../../services/api';

const NotificationManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    recipientType: 'single',
    recipients: [],
    type: 'general',
    title: '',
    message: '',
    priority: 'medium',
    expiresAt: '',
    channels: {
      inApp: true,
      email: false,
      sms: false
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notificationsRes, usersRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/users')
      ]);
      
      setNotifications(notificationsRes.data.notifications || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    try {
      setError('');
      
      const notificationData = {
        ...formData,
        recipients: formData.recipientType === 'all' 
          ? users.map(u => u._id) 
          : formData.recipients
      };

      // Create notifications for each recipient
      const promises = notificationData.recipients.map(recipientId => 
        api.post('/notifications', {
          recipient: recipientId,
          recipientType: 'user',
          type: formData.type,
          title: formData.title,
          message: formData.message,
          priority: formData.priority,
          channels: formData.channels,
          expiresAt: formData.expiresAt || undefined
        })
      );

      await Promise.all(promises);
      
      setMessage(`Notification sent to ${notificationData.recipients.length} users successfully!`);
      setShowCreateModal(false);
      resetForm();
      fetchData();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create notification');
    }
  };

  const resetForm = () => {
    setFormData({
      recipientType: 'single',
      recipients: [],
      type: 'general',
      title: '',
      message: '',
      priority: 'medium',
      expiresAt: '',
      channels: {
        inApp: true,
        email: false,
        sms: false
      }
    });
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      await api.delete(`/notifications/${notificationId}`);
      setMessage('Notification deleted successfully');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete notification');
    }
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      'general': 'primary',
      'work_item_assigned': 'info',
      'work_item_due_soon': 'warning',
      'work_item_overdue': 'danger',
      'client_won': 'success',
      'new_project': 'info',
      'payment_received': 'success',
      'leave_approved': 'success',
      'leave_rejected': 'danger',
      'system': 'secondary'
    };
    return typeMap[type] || 'secondary';
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      'low': 'secondary',
      'medium': 'primary',
      'high': 'warning',
      'urgent': 'danger'
    };
    return priorityMap[priority] || 'secondary';
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  const notificationTypes = [
    { value: 'general', label: 'General Announcement' },
    { value: 'system', label: 'System Update' },
    { value: 'client_won', label: 'Client Won' },
    { value: 'new_project', label: 'New Project' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'leave_approved', label: 'Leave Approved' },
    { value: 'leave_rejected', label: 'Leave Rejected' }
  ];

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3 mb-0">Loading notifications...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <FaBell className="me-2 text-primary" />
            Notification Management
          </h2>
          <p className="text-muted mb-0">Create and manage system notifications</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowCreateModal(true)}
          className="d-flex align-items-center"
        >
          <FaPlus className="me-2" />
          Create Notification
        </Button>
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                {notificationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Notifications Table */}
      <Card>
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Recipients</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No notifications found
                    </td>
                  </tr>
                ) : (
                  filteredNotifications.map((notification) => (
                    <tr key={notification._id}>
                      <td>
                        <div>
                          <div className="fw-semibold">{notification.title}</div>
                          <small className="text-muted">
                            {notification.message?.substring(0, 50)}...
                          </small>
                        </div>
                      </td>
                      <td>
                        <Badge bg={getTypeBadge(notification.type)}>
                          {notification.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getPriorityBadge(notification.priority)}>
                          {notification.priority}
                        </Badge>
                      </td>
                      <td>
                        <FaUsers className="me-1" />
                        1 user
                      </td>
                      <td>
                        <small>
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setSelectedNotification(notification);
                              setShowViewModal(true);
                            }}
                          >
                            <FaEye />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification._id)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Create Notification Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBullhorn className="me-2" />
            Create New Notification
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateNotification}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Recipient Type</Form.Label>
                  <Form.Select
                    value={formData.recipientType}
                    onChange={(e) => setFormData({...formData, recipientType: e.target.value})}
                  >
                    <option value="single">Specific Users</option>
                    <option value="all">All Users</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Notification Type</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    {notificationTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              {formData.recipientType === 'single' && (
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>Select Recipients</Form.Label>
                    <Form.Select
                      multiple
                      value={formData.recipients}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setFormData({...formData, recipients: selected});
                      }}
                      style={{ minHeight: '120px' }}
                    >
                      {users.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.email}) - {user.role}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Hold Ctrl/Cmd to select multiple users
                    </Form.Text>
                  </Form.Group>
                </Col>
              )}
              
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Title</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Message</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Expires At (Optional)</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                  />
                </Form.Group>
              </Col>
              
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Delivery Channels</Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Check
                      type="checkbox"
                      label="In-App"
                      checked={formData.channels.inApp}
                      onChange={(e) => setFormData({
                        ...formData, 
                        channels: {...formData.channels, inApp: e.target.checked}
                      })}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Email"
                      checked={formData.channels.email}
                      onChange={(e) => setFormData({
                        ...formData, 
                        channels: {...formData.channels, email: e.target.checked}
                      })}
                    />
                    <Form.Check
                      type="checkbox"
                      label="SMS"
                      checked={formData.channels.sms}
                      onChange={(e) => setFormData({
                        ...formData, 
                        channels: {...formData.channels, sms: e.target.checked}
                      })}
                      disabled
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Notification
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Notification Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Notification Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedNotification && (
            <div>
              <div className="mb-3">
                <strong>Title:</strong> {selectedNotification.title}
              </div>
              <div className="mb-3">
                <strong>Message:</strong> {selectedNotification.message}
              </div>
              <div className="mb-3">
                <strong>Type:</strong>{' '}
                <Badge bg={getTypeBadge(selectedNotification.type)}>
                  {selectedNotification.type}
                </Badge>
              </div>
              <div className="mb-3">
                <strong>Priority:</strong>{' '}
                <Badge bg={getPriorityBadge(selectedNotification.priority)}>
                  {selectedNotification.priority}
                </Badge>
              </div>
              <div className="mb-3">
                <strong>Created:</strong> {new Date(selectedNotification.createdAt).toLocaleString()}
              </div>
              <div className="mb-3">
                <strong>Read:</strong> {selectedNotification.isRead ? 'Yes' : 'No'}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default NotificationManagement;