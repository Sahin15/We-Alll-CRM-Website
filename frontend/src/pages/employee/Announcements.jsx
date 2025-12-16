import { useState, useEffect } from 'react';
import { Container, Card, Badge, Alert, Spinner, Form, InputGroup, Modal, Button, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { FaBullhorn, FaBell, FaEye, FaCalendarAlt, FaUser, FaBuilding, FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import api from '../../services/api';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchData();
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
      // Fetch both announcements and notifications
      const [announcementsRes, notificationsRes] = await Promise.all([
        api.get('/announcements'),
        api.get('/notifications') // Assuming this endpoint exists
      ]);
      
      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);
      setNotifications(Array.isArray(notificationsRes.data) ? notificationsRes.data : []);
      setLoading(false);
    } catch (err) {
      // If notifications endpoint doesn't exist, just fetch announcements
      try {
        const response = await api.get('/announcements');
        setAnnouncements(Array.isArray(response.data) ? response.data : []);
        setNotifications([]); // Empty notifications for now
        setLoading(false);
      } catch (announcementErr) {
        setError(announcementErr.response?.data?.message || 'Failed to fetch data');
        setLoading(false);
      }
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
      await api.put(`/notifications/${itemId}/read`);
      // Update local state
      setNotifications(prev => 
        Array.isArray(prev) ? prev.map(notif => 
          notif._id === itemId ? { ...notif, isRead: true } : notif
        ) : []
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
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
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <FaBullhorn className="me-2 text-primary" />
            News & Alerts
          </h2>
          <p className="text-muted mb-0">Stay updated with the latest news and notifications</p>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {/* Filters and Search */}
          <Card className="mb-4 shadow-sm">
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
            className="mb-4"
          >
            <Tab eventKey="all" title={`All (${(announcements?.length || 0) + (notifications?.length || 0)})`} />
            <Tab eventKey="announcements" title={`Announcements (${announcements?.length || 0})`} />
            <Tab eventKey="notifications" title={`Notifications (${notifications?.length || 0})`} />
          </Tabs>

          {/* Results Count */}
          <div className="d-flex justify-content-between align-items-center mb-3">
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
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <Card.Body>
                    <div className="d-flex align-items-start">
                      <div className="me-3 mt-1">
                        {item.icon}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start mb-2">
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
                            <Button variant="outline-primary" size="sm">
                              <FaEye className="me-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
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
                    <h6>Content:</h6>
                    <div className="p-3 bg-light rounded">
                      {selectedItem.content || selectedItem.message || 'No additional details available.'}
                    </div>
                  </div>

                  {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                    <div className="mt-3">
                      <h6>Attachments:</h6>
                      <div className="list-group">
                        {selectedItem.attachments.map((attachment, index) => (
                          <a 
                            key={index}
                            href={attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="list-group-item list-group-item-action"
                          >
                            📎 {attachment.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
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
            </Modal.Footer>
          </Modal>
        </>
      )}

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
