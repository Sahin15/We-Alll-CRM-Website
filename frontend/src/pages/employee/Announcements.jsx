import { useState, useEffect } from 'react';
import { Container, Card, Badge, Alert, Spinner, Form, InputGroup, Modal, Button, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { FaBullhorn, FaBell, FaEye, FaCalendarAlt, FaUser, FaBuilding, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTrash, FaComments, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { PAGE_ACCESS, checkPageAccess } from '../../constants/pageAccess';
import HolidaySection from '../../components/common/HolidaySection';
import FeedbackForm from '../../components/feedback/FeedbackForm';
import FeedbackList from '../../components/feedback/FeedbackList';
import api from '../../services/api';
import { announcementApi } from '../../api/announcementApi';
import { useSearchParams } from 'react-router-dom';

const Announcements = () => {
  const { user, canAccess } = useAuth();
  const [searchParams] = useSearchParams();
  const [announcements, setAnnouncements] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false); // no blocking spinner
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackRefreshTrigger, setFeedbackRefreshTrigger] = useState(0);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '', content: '', type: 'general', priority: 'normal', department: ''
  });
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);

  const { notifications, loading: notificationsLoading, fetchNotifications, markAsRead: markNotificationAsRead, deleteNotification } = useNotifications();
  const isAdminUser = checkPageAccess(canAccess, PAGE_ACCESS.companyAnnounceManage);

  useEffect(() => { fetchData(); fetchNotifications(); }, []); // eslint-disable-line

  useEffect(() => {
    if (Array.isArray(announcements)) filterItems();
  }, [searchTerm, filterType, activeTab, announcements]); // eslint-disable-line

  // Auto-open notification from bell dropdown click (?notification=ID or ?tab=feedback)
  useEffect(() => {
    const notifId = searchParams.get('notification');
    const tab = searchParams.get('tab');
    if (tab) { setActiveTab(tab); return; }
    if (notifId && Array.isArray(notifications) && notifications.length > 0) {
      const found = notifications.find(n => n._id === notifId);
      if (found) {
        setSelectedItem({ ...found, itemType: 'notification', icon: <FaBell /> });
        setShowDetailModal(true);
      }
    }
  }, [searchParams, notifications]); // eslint-disable-line

  const fetchData = async () => {
    try {
      // No setLoading(true) — show UI immediately, data loads in background
      const response = await api.get('/announcements');
      setAnnouncements(Array.isArray(response.data?.data || response.data) ? (response.data?.data || response.data) : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let allItems = [];
    if (activeTab === 'all' || activeTab === 'announcements') {
      allItems = [...allItems, ...(Array.isArray(announcements) ? announcements.map(i => ({ ...i, itemType: 'announcement', icon: <FaBullhorn /> })) : [])];
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      allItems = allItems.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.content?.toLowerCase().includes(q) ||
        i.body?.toLowerCase().includes(q) ||
        i.message?.toLowerCase().includes(q)
      );
    }
    if (filterType !== 'all') allItems = allItems.filter(i => i.type === filterType);
    allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredItems(allItems);
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementFormData.title || !announcementFormData.content) { toast.error('Please fill in all required fields'); return; }
    setSubmittingAnnouncement(true);
    try {
      await announcementApi.createAnnouncement(announcementFormData);
      toast.success('Announcement created successfully');
      setShowAnnouncementForm(false);
      setAnnouncementFormData({ title: '', content: '', type: 'general', priority: 'normal', department: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create announcement');
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const getTypeBadge = (type) => ({ general:'primary', important:'danger', urgent:'danger', event:'success', policy:'warning', holiday:'info', system:'secondary', reminder:'warning' }[type] || 'secondary');

  const getTypeIcon = (type) => {
    const m = { important:<FaExclamationTriangle className="text-danger"/>, urgent:<FaExclamationTriangle className="text-danger"/>, event:<FaCalendarAlt className="text-success"/>, policy:<FaInfoCircle className="text-warning"/>, holiday:<FaCalendarAlt className="text-info"/>, system:<FaInfoCircle className="text-secondary"/>, reminder:<FaBell className="text-warning"/>, general:<FaInfoCircle className="text-primary"/> };
    return m[type] || <FaInfoCircle className="text-primary"/>;
  };

  const getItemContent = (item) => item?.content || item?.body || item?.message || '';

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
    if (item.itemType === 'notification' && !item.isRead) markAsRead(item._id);
  };

  const markAsRead = async (id) => { try { await markNotificationAsRead(id); filterItems(); } catch {} };

  const handleDeleteNotification = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this notification?')) return;
    try { await deleteNotification(id); filterItems(); } catch { alert('Failed to delete.'); }
  };

  const closeDetailModal = () => { setShowDetailModal(false); setSelectedItem(null); };

  const formatDate = (date) => {
    const d = new Date(date);
    const diff = Math.ceil(Math.abs(new Date() - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const renderContent = (item) => {
    const content = getItemContent(item);
    if (!content) return <span className="text-muted fst-italic">No content available.</span>;
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    return isHtml
      ? <div dangerouslySetInnerHTML={{ __html: content }} />
      : <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.8 }}>{content}</div>;
  };

  const renderCard = (item) => (
    <Card
      key={`${item.itemType}-${item._id}`}
      className={`mb-3 shadow-sm cursor-pointer border-start border-4 ${item.itemType === 'notification' && !item.isRead ? 'border-primary bg-light' : item.type === 'important' || item.type === 'urgent' ? 'border-danger' : 'border-secondary'}`}
      onClick={() => handleItemClick(item)}
    >
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 mb-2">
              {getTypeIcon(item.type)}
              <h6 className="mb-0 fw-semibold">{item.title}</h6>
              <Badge bg={getTypeBadge(item.type)} className="ms-2">{item.type}</Badge>
              {item.isPinned && <Badge bg="warning">Pinned</Badge>}
              {item.itemType === 'notification' && !item.isRead && <Badge bg="primary">New</Badge>}
            </div>
            <p className="text-muted mb-2 line-clamp-2">{getItemContent(item) || 'Click to view details'}</p>
            <div className="d-flex gap-3 text-muted small">
              <span><FaUser className="me-1"/>{item.createdBy?.name || item.sender?.name || 'System'}</span>
              <span><FaCalendarAlt className="me-1"/>{formatDate(item.createdAt)}</span>
              {item.department && <span><FaBuilding className="me-1"/>{item.department.name}</span>}
            </div>
          </div>
          <div className="text-end">
            <div className="d-flex gap-1">
              <Button variant="outline-primary" size="sm" onClick={e => { e.stopPropagation(); handleItemClick(item); }}>
                <FaEye className="me-1"/>View Details
              </Button>
              {item.itemType === 'notification' && (
                <Button variant="outline-danger" size="sm" onClick={e => handleDeleteNotification(item._id, e)} title="Delete">
                  <FaTrash/>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  const emptyCard = (icon, title, sub) => (
    <Card className="text-center py-5">
      <Card.Body>{icon}<h5 className="text-muted">{title}</h5><p className="text-muted">{sub}</p></Card.Body>
    </Card>
  );

  if (loading) return <Container className="mt-4 text-center"><Spinner animation="border"/></Container>;

  return (
    <Container fluid className="py-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h2 className="mb-1"><FaBullhorn className="me-2 text-primary"/>News &amp; Alerts</h2>
          <p className="text-muted mb-0">Stay updated with the latest news, notifications, and share your feedback</p>
        </div>
        <div className="d-flex gap-2">
          {isAdminUser && (
            <Button variant="success" onClick={() => setShowAnnouncementForm(true)} className="d-flex align-items-center gap-2">
              <FaPlus/>Create Announcement
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowFeedbackForm(true)} className="d-flex align-items-center gap-2">
            <FaPlus/>Submit Feedback
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <HolidaySection />

      <>
          {/* Filters */}
          <Card className="mb-2 shadow-sm">
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <InputGroup>
                    <InputGroup.Text><FaBell/></InputGroup.Text>
                    <Form.Control type="text" placeholder="Search announcements..."
                      value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                  </InputGroup>
                </Col>
                <Col md={6}>
                  <Form.Select value={filterType} onChange={e => setFilterType(e.target.value)}>
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

          <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-2">

            <Tab eventKey="all" title={`All (${announcements?.length||0})`}>
              <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
                <small className="text-muted">Showing {filteredItems.filter(i => i.itemType === 'announcement').length} announcements</small>
              </div>
              {filteredItems.filter(i => i.itemType === 'announcement').length === 0
                ? emptyCard(<FaInfoCircle size={48} className="text-muted mb-3"/>, loading ? 'Loading...' : 'No items found', 'Try adjusting your search or filter criteria')
                : <div className="space-y-3">{filteredItems.filter(i => i.itemType === 'announcement').map(renderCard)}</div>
              }
            </Tab>

            <Tab eventKey="announcements" title={`Announcements (${announcements?.length||0})`}>
              <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
                <small className="text-muted">Showing {filteredItems.filter(i=>i.itemType==='announcement').length} announcements</small>
              </div>
              {filteredItems.filter(i=>i.itemType==='announcement').length === 0
                ? emptyCard(<FaBullhorn size={48} className="text-muted mb-3"/>, 'No announcements found', 'Check back later for new announcements')
                : <div className="space-y-3">{filteredItems.filter(i=>i.itemType==='announcement').map(renderCard)}</div>
              }
            </Tab>

            <Tab eventKey="feedback" title={<span className="d-flex align-items-center gap-1"><FaComments/>Feedback</span>}>
              <div className="mt-3">
                {activeTab === 'feedback' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div>
                        <h5 className="mb-1">Share Your Feedback</h5>
                        <p className="text-muted mb-0">Help us improve by sharing your thoughts, reporting issues, or suggesting new features.</p>
                      </div>
                      <Button variant="primary" onClick={() => setShowFeedbackForm(true)} className="d-flex align-items-center gap-2">
                        <FaPlus/>New Feedback
                      </Button>
                    </div>
                    <Alert variant="info" className="mb-4">
                      <Row>
                        <Col md={6}>
                          <strong>What can you share?</strong>
                          <ul className="mb-0 small mt-1">
                            <li>Bug reports and system issues</li>
                            <li>Feature requests and suggestions</li>
                            <li>UI/UX feedback and improvements</li>
                            <li>Performance issues</li>
                          </ul>
                        </Col>
                        <Col md={6}>
                          <strong>How it helps:</strong>
                          <ul className="mb-0 small mt-1">
                            <li>Direct communication with admin team</li>
                            <li>Track status of your feedback</li>
                            <li>Upvote feedback from other users</li>
                            <li>Get updates on resolutions</li>
                          </ul>
                        </Col>
                      </Row>
                    </Alert>
                    <FeedbackList isAdminView={isAdminUser} refreshTrigger={feedbackRefreshTrigger}/>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={closeDetailModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            {selectedItem?.icon}
            <span className="ms-2">{selectedItem?.title}</span>
            <Badge bg={getTypeBadge(selectedItem?.type)} className="ms-2">{selectedItem?.type}</Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <div className="d-flex gap-3 text-muted small mb-3 flex-wrap">
                <span><FaUser className="me-1"/><strong>From:</strong> {selectedItem.createdBy?.name || selectedItem.sender?.name || 'System'}</span>
                <span><FaCalendarAlt className="me-1"/><strong>Date:</strong> {formatDate(selectedItem.createdAt)}</span>
                {selectedItem.department && <span><FaBuilding className="me-1"/><strong>Dept:</strong> {selectedItem.department.name}</span>}
              </div>
              <hr/>
              {renderContent(selectedItem)}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDetailModal}>Close</Button>
          {selectedItem?.itemType === 'notification' && !selectedItem?.isRead && (
            <Button variant="primary" onClick={() => { markAsRead(selectedItem._id); closeDetailModal(); }}>
              <FaCheckCircle className="me-1"/>Mark as Read
            </Button>
          )}
          {selectedItem?.itemType === 'notification' && (
            <Button variant="danger" onClick={() => { handleDeleteNotification(selectedItem._id, { stopPropagation: () => {} }); closeDetailModal(); }}>
              <FaTrash className="me-1"/>Delete
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Feedback Form */}
      <FeedbackForm show={showFeedbackForm} onHide={() => setShowFeedbackForm(false)} onSuccess={() => setFeedbackRefreshTrigger(p => p+1)}/>

      {/* Create Announcement Modal */}
      <Modal show={showAnnouncementForm} onHide={() => setShowAnnouncementForm(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaBullhorn className="me-2 text-success"/>Create New Announcement</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateAnnouncement}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" placeholder="Enter announcement title"
                value={announcementFormData.title}
                onChange={e => setAnnouncementFormData({...announcementFormData, title: e.target.value})} required/>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Content <span className="text-danger">*</span></Form.Label>
              <Form.Control as="textarea" rows={6} placeholder="Enter announcement content..."
                value={announcementFormData.content}
                onChange={e => setAnnouncementFormData({...announcementFormData, content: e.target.value})} required/>
              <Form.Text className="text-muted">Line breaks and spacing will be preserved when displayed.</Form.Text>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Select value={announcementFormData.type} onChange={e => setAnnouncementFormData({...announcementFormData, type: e.target.value})}>
                    <option value="general">General</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                    <option value="event">Event</option>
                    <option value="policy">Policy</option>
                    <option value="holiday">Holiday</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select value={announcementFormData.priority} onChange={e => setAnnouncementFormData({...announcementFormData, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Department (Optional)</Form.Label>
              <Form.Control type="text" placeholder="Leave empty for all departments"
                value={announcementFormData.department}
                onChange={e => setAnnouncementFormData({...announcementFormData, department: e.target.value})}/>
              <Form.Text className="text-muted">Leave empty to send to all employees</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAnnouncementForm(false)} disabled={submittingAnnouncement}>Cancel</Button>
            <Button variant="success" type="submit" disabled={submittingAnnouncement}>
              {submittingAnnouncement ? <><Spinner size="sm" className="me-1"/>Creating...</> : <><FaPlus className="me-1"/>Create Announcement</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .cursor-pointer { cursor:pointer; }
        .space-y-3 > * + * { margin-top:0.75rem; }
      `}</style>
    </Container>
  );
};

export default Announcements;
