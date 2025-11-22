import { useState, useEffect } from 'react';
import { Container, Card, Badge, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';
import api from '../../services/api';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    filterAnnouncementsList();
  }, [searchTerm, filterType, announcements]);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/announcements');
      setAnnouncements(response.data);
      setFilteredAnnouncements(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch announcements');
      setLoading(false);
    }
  };

  const filterAnnouncementsList = () => {
    let filtered = announcements;

    if (searchTerm) {
      filtered = filtered.filter(ann =>
        ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ann.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(ann => ann.type === filterType);
    }

    setFilteredAnnouncements(filtered);
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      'general': 'primary',
      'important': 'danger',
      'event': 'success',
      'policy': 'warning',
      'holiday': 'info'
    };
    return typeMap[type] || 'secondary';
  };

  const formatDate = (date) => {
    const now = new Date();
    const announcementDate = new Date(date);
    const diffTime = Math.abs(now - announcementDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return announcementDate.toLocaleDateString();
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
    <Container className="mt-4">
      <h2 className="mb-4">Announcements</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <InputGroup>
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </div>
          <div className="col-md-6">
            <Form.Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="important">Important</option>
              <option value="event">Event</option>
              <option value="policy">Policy</option>
              <option value="holiday">Holiday</option>
            </Form.Select>
          </div>
        </div>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <Alert variant="info">
          <i className="bi bi-info-circle me-2"></i>
          No announcements found.
        </Alert>
      ) : (
        <>
          <div className="mb-3">
            <small className="text-muted">
              Showing {filteredAnnouncements.length} of {announcements.length} announcements
            </small>
          </div>
          <div className="space-y-3">
            {filteredAnnouncements.map((announcement) => (
              <Card key={announcement._id} className="mb-3 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <h5 className="mb-0">{announcement.title}</h5>
                        <Badge bg={getTypeBadge(announcement.type)}>
                          {announcement.type}
                        </Badge>
                        {announcement.isPinned && (
                          <Badge bg="warning">
                            <i className="bi bi-pin-angle-fill"></i> Pinned
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted mb-2">{announcement.content}</p>
                      <div className="d-flex gap-3 text-muted small">
                        <span>
                          <i className="bi bi-person me-1"></i>
                          {announcement.createdBy?.name || 'Admin'}
                        </span>
                        <span>
                          <i className="bi bi-calendar me-1"></i>
                          {formatDate(announcement.createdAt)}
                        </span>
                        {announcement.department && (
                          <span>
                            <i className="bi bi-building me-1"></i>
                            {announcement.department.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </>
      )}
    </Container>
  );
};

export default Announcements;
