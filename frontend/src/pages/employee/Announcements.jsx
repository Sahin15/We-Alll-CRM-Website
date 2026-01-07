import { useState, useEffect } from 'react';
import { Container, Card, Badge, Alert, Spinner, Form, InputGroup, Modal, Button, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { FaBullhorn, FaBell, FaEye, FaCalendarAlt, FaUser, FaBuilding, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTrash } from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import HolidaySection from '../../components/common/HolidaySection';
import api from '../../services/api';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Use NotificationContext for notifications
  const { notifications, loading: notificationsLoading, fetchNotifications, markAsRead: markNotificationAsRead, deleteNotification } = useNotifications();

  useEffect(() => {
    fetchData();
    // Fetch notifications using context
    fetchNotifications();
  }, []);

  useEffect(() => {
    // Only run filter if we have proper arrays
    if (Array.isArray(announcements) && Array.isArray(notifications)) {
      filterItems();
    }
  }, [searchTerm, filterType, activeTab, announcements, notifications]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Only fetch announcements, notifications come from context
      const response = await api.get('/announcements');
      setAnnouncements(Array.isArray(response.data?.data || response.data) ? (response.data?.data || response.data) : []);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch announcements');
      setLoading(false);
    }
  };

  const filterItems = () => {
    let allItems = [];
    
    // Combine announcements and notifications with type indicators
    if (activeTab === 'all' || activeTab === 'announcements') {
      const announcementItems = Array.isArray(announcements) 
        ? announcements.map(item => ({
            ...item,
            itemType: 'announcement',
            icon: <FaBullhorn />
          }))
        : [];
      allItems = [...allItems, ...announcementItems];
    }
    
    if (activeTab === 'all' || activeTab === 'notifications') {
      const notificationItems = Array.isArray(notifications) 
        ? notifications.map(item => ({
            ...item,
            itemType: 'notification',
            icon: <FaBell />
          }))
        : [];
      allItems = [...allItems, ...notificationItems];
    }

    // Apply search filter
    if (searchTerm) {
      allItems = allItems.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      allItems = allItems.filter(item => item.type === filterType);
    }

    // Sort by date (newest first)
    allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredItems(allItems);
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      'general': 'primary',
      'important': 'danger',
      'urgent': 'danger',
      'event': 'success',
      'policy': 'warning',
      'holiday': 'info',
      'system': 'secondary',
      'reminder': 'warning'
    };
    return typeMap[type] || 'secondary';
  };

  const getTypeIcon = (type) => {
    const iconMap = {
      'important': <FaExclamationTriangle className="text-danger" />,
      'urgent': <FaExclamationTriangle className="text-danger" />,
      'event': <FaCalendarAlt className="text-success" />,
      'policy': <FaInfoCircle className="text-warning" />,
      'holiday': <FaCalendarAlt className="text-info" />,
      'system': <FaInfoCircle className="text-secondary" />,
      'reminder': <FaBell className="text-warning" />,
      'general': <FaInfoCircle className="text-primary" />
    };
    return iconMap[type] || <FaInfoCircle className="text-primary" />;
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
    
    // Mark as read if it's a notification
    if (item.itemType === 'notification' && !item.isRead) {
      markAsRead(item._id);
    }
  };

  const markAsRead = async (itemId) => {
    try {
      await markNotificationAsRead(itemId);
      // Refresh the filtered items after marking as read
      filterItems();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation(); // Prevent opening the detail modal
    
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await deleteNotification(notificationId);
        // Refresh the filtered items after deletion
        filterItems();
      } catch (error) {
        console.error('Failed to delete notification:', error);
        alert('Failed to delete notification. Please try again.');
      }
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedItem(null);
  };

  const formatDate = (date) => {
    const now = new Date();
    const announcementDate = new Date(date);
    const diffTime = Math.abs(now - announcementDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Use DD/MM/YYYY format
    const day = announcementDate.getDate().toString().padStart(2, '0');
    const month = (announcementDate.getMonth() + 1).toString().padStart(2, '0');
    const year = announcementDate.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid className="py-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h2 className="mb-1">
            <FaBullhorn className="me-2 text-primary" />
            News & Alerts
          </h2>
          <p className="text-muted mb-0">Stay updated with the latest news and notifications</p>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Holiday Section */}
      <HolidaySection />

      {(loading || notificationsLoading) ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {/* Filters and Search */}
          <Card className="mb-2 shadow-sm">
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaBell />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search notifications and announcements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={6}>
                  <Form.Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="general">General</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                    <option value="event">Event</option>
                    <option value="policy">Policy</option>
                    <option value="holiday">Holiday</option>
                    <option value="system">System</option>
                    <option value="reminder">Reminder</option>
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Tabs */}
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-2"
          >
            <Tab eventKey="all" title={`All (${(announcements?.length || 0) + (notifications?.length || 0)})`}>
              {/* Results Count */}
              <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
                <small className="text-muted">
                  Showing {filteredItems.length} items
                </small>
                {Array.isArray(notifications) && notifications.filter(n => !n.isRead).length > 0 && (
                  <Badge bg="danger" pill>
                    {notifications.filter(n => !n.isRead).length} unread
                  </Badge>
                )}
              </div>

              {/* Items List */}
              {filteredItems.length === 0 ? (
                <Card className="text-center py-5">
                  <Card.Body>
                    <FaInfoCircle size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No items found</h5>
                    <p className="text-muted">Try adjusting your search or filter criteria</p>
                  </Card.Body>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <Card 
                      key={`${item.itemType}-${item._id}`} 
                      className={`mb-3 shadow-sm cursor-pointer border-start border-4 ${
                        item.itemType === 'notification' && !item.isRead 
                          ? 'border-primary bg-light' 
                          : item.type === 'important' || item.type === 'urgent'
                          ? 'border-danger'
                          : 'border-secondary'
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              {getTypeIcon(item.type)}
                              <h6 className="mb-0 fw-semibold">{item.title}</h6>
                              <Badge bg={getTypeBadge(item.type)} className="ms-2">
                                {item.type}
                              </Badge>
                              {item.isPinned && (
                                <Badge bg="warning">
                                  📌 Pinned
                                </Badge>
                              )}
                              {item.itemType === 'notification' && !item.isRead && (
                                <Badge bg="primary">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted mb-2 line-clamp-2">
                              {item.content || item.message || 'Click to view details'}
                            </p>
                            <div className="d-flex gap-3 text-muted small">
                              <span>
                                <FaUser className="me-1" />
                                {item.createdBy?.name || item.sender?.name || 'System'}
                              </span>
                              <span>
                                <FaCalendarAlt className="me-1" />
                                {formatDate(item.createdAt)}
                              </span>
                              {item.department && (
                                <span>
                                  <FaBuilding className="me-1" />
                                  {item.department.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="d-flex gap-1">
                              <Button variant="outline-primary" size="sm">
                                <FaEye className="me-1" />
                                View Details
                              </Button>
                              {item.itemType === 'notification' && (
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={(e) => handleDeleteNotification(item._id, e)}
                                  title="Delete Notification"
                                >
                                  <FaTrash />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Tab>
            
            <Tab eventKey="announcements" title={`Announcements (${announcements?.length || 0})`}>
              {/* Results Count for Announcements */}
              <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
                <small className="text-muted">
                  Showing {filteredItems.filter(item => item.itemType === 'announcement').length} announcements
                </small>
              </div>

              {/* Announcements List */}
              {filteredItems.filter(item => item.itemType === 'announcement').length === 0 ? (
                <Card className="text-center py-5">
                  <Card.Body>
                    <FaBullhorn size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No announcements found</h5>
                    <p className="text-muted">Check back later for new announcements</p>
                  </Card.Body>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredItems.filter(item => item.itemType === 'announcement').map((item) => (
                    <Card 
                      key={`${item.itemType}-${item._id}`} 
                      className={`mb-3 shadow-sm cursor-pointer border-start border-4 ${
                        item.type === 'important' || item.type === 'urgent'
                        ? 'border-danger'
                        : 'border-secondary'
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              {getTypeIcon(item.type)}
                              <h6 className="mb-0 fw-semibold">{item.title}</h6>
                              <Badge bg={getTypeBadge(item.type)} className="ms-2">
                                {item.type}
                              </Badge>
                              {item.isPinned && (
                                <Badge bg="warning">
                                  📌 Pinned
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted mb-2 line-clamp-2">
                              {item.content || item.message || 'Click to view details'}
                            </p>
                            <div className="d-flex gap-3 text-muted small">
                              <span>
                                <FaUser className="me-1" />
                                {item.createdBy?.name || item.sender?.name || 'System'}
                              </span>
                              <span>
                                <FaCalendarAlt className="me-1" />
                                {formatDate(item.createdAt)}
                              </span>
                              {item.department && (
                                <span>
                                  <FaBuilding className="me-1" />
                                  {item.department.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-end">
                            <Button variant="outline-primary" size="sm">
                              <FaEye className="me-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Tab>
            
            <Tab eventKey="notifications" title={`Notifications (${notifications?.length || 0})`}>
              {/* Results Count for Notifications */}
              <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
                <small className="text-muted">
                  Showing {filteredItems.filter(item => item.itemType === 'notification').length} notifications
                </small>
                {Array.isArray(notifications) && notifications.filter(n => !n.isRead).length > 0 && (
                  <Badge bg="danger" pill>
                    {notifications.filter(n => !n.isRead).length} unread
                  </Badge>
                )}
              </div>

              {/* Notifications List */}
              {filteredItems.filter(item => item.itemType === 'notification').length === 0 ? (
                <Card className="text-center py-5">
                  <Card.Body>
                    <FaBell size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No notifications found</h5>
                    <p className="text-muted">You're all caught up!</p>
                  </Card.Body>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredItems.filter(item => item.itemType === 'notification').map((item) => (
                    <Card 
                      key={`${item.itemType}-${item._id}`} 
                      className={`mb-3 shadow-sm cursor-pointer border-start border-4 ${
                        !item.isRead 
                          ? 'border-primary bg-light' 
                          : item.type === 'important' || item.type === 'urgent'
                          ? 'border-danger'
                          : 'border-secondary'
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              {getTypeIcon(item.type)}
                              <h6 className="mb-0 fw-semibold">{item.title}</h6>
                              <Badge bg={getTypeBadge(item.type)} className="ms-2">
                                {item.type}
                              </Badge>
                              {!item.isRead && (
                                <Badge bg="primary">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted mb-2 line-clamp-2">
                              {item.content || item.message || 'Click to view details'}
                            </p>
                            <div className="d-flex gap-3 text-muted small">
                              <span>
                                <FaUser className="me-1" />
                                {item.createdBy?.name || item.sender?.name || 'System'}
                              </span>
                              <span>
                                <FaCalendarAlt className="me-1" />
                                {formatDate(item.createdAt)}
                              </span>
                              {item.department && (
                                <span>
                                  <FaBuilding className="me-1" />
                                  {item.department.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="d-flex gap-1">
                              <Button variant="outline-primary" size="sm">
                                <FaEye className="me-1" />
                                View Details
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={(e) => handleDeleteNotification(item._id, e)}
                                title="Delete Notification"
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Tab>
          </Tabs>
        </>
      )}

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={closeDetailModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            {selectedItem?.icon}
            <span className="ms-2">{selectedItem?.title}</span>
            <Badge bg={getTypeBadge(selectedItem?.type)} className="ms-2">
              {selectedItem?.type}
            </Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <div className="mb-3">
                <div className="d-flex gap-3 text-muted small mb-3">
                  <span>
                    <FaUser className="me-1" />
                    <strong>From:</strong> {selectedItem.createdBy?.name || selectedItem.sender?.name || 'System'}
                  </span>
                  <span>
                    <FaCalendarAlt className="me-1" />
                    <strong>Date:</strong> {formatDate(selectedItem.createdAt)}
                  </span>
                  {selectedItem.department && (
                    <span>
                      <FaBuilding className="me-1" />
                      <strong>Department:</strong> {selectedItem.department.name}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="content">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: selectedItem.content || selectedItem.message || 'No content available' 
                  }} 
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDetailModal}>
            Close
          </Button>
          {selectedItem?.itemType === 'notification' && !selectedItem?.isRead && (
            <Button 
              variant="primary" 
              onClick={() => {
                markAsRead(selectedItem._id);
                closeDetailModal();
              }}
            >
              <FaCheckCircle className="me-1" />
              Mark as Read
            </Button>
          )}
          {selectedItem?.itemType === 'notification' && (
            <Button 
              variant="danger" 
              onClick={() => {
                handleDeleteNotification(selectedItem._id, { stopPropagation: () => {} });
                closeDetailModal();
              }}
            >
              <FaTrash className="me-1" />
              Delete Notification
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .space-y-3 > * + * {
          margin-top: 0.75rem;
        }
      `}</style>
    </Container>
  );
};

export default Announcements;
