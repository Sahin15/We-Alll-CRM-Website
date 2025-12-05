import { useState, useEffect } from 'react';
import { Card, ListGroup, Badge, Button, Spinner } from 'react-bootstrap';
import { FaBullhorn, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const QuickAnnouncements = ({ onAnnouncementClick }) => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/announcements');
      setAnnouncements(response.data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementClick = (announcement) => {
    if (onAnnouncementClick) {
      onAnnouncementClick(announcement);
    } else {
      navigate('/employee/announcements');
    }
  };

  const displayAnnouncements = Array.isArray(announcements) ? announcements : [];

  const getTypeBadge = (type) => {
    switch (type) {
      case 'urgent': return <Badge bg="danger">Urgent</Badge>;
      case 'important': return <Badge bg="warning">Important</Badge>;
      case 'general': return <Badge bg="info">General</Badge>;
      case 'event': return <Badge bg="success">Event</Badge>;
      default: return <Badge bg="secondary">Notice</Badge>;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="dashboard-card border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            <FaBullhorn className="me-2 text-warning" />
            Announcements
          </h5>
          <Button 
            size="sm" 
            variant="outline-primary"
            onClick={() => navigate('/employee/announcements')}
          >
            <FaEye className="me-1" />View All
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" size="sm" />
          </div>
        ) : (
          <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {displayAnnouncements.slice(0, 5).map((announcement) => (
            <ListGroup.Item 
              key={announcement._id || announcement.id} 
              className="px-0 py-3 border-bottom cursor-pointer"
              onClick={() => handleAnnouncementClick(announcement)}
              style={{ 
                transition: 'all 0.2s ease',
                backgroundColor: announcement.isPinned ? 'rgba(255, 193, 7, 0.05)' : 'transparent'
              }}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0">
                  {announcement.isPinned && <span className="me-2">📌</span>}
                  {announcement.title}
                </h6>
                {getTypeBadge(announcement.type)}
              </div>
              <p className="text-muted mb-2 small">
                {announcement.content?.substring(0, 100)}
                {announcement.content?.length > 100 ? '...' : ''}
              </p>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">{formatDate(announcement.createdAt)}</small>
                <Button size="sm" variant="link" className="p-0">
                  <FaEye className="me-1" />View
                </Button>
              </div>
            </ListGroup.Item>
          ))}
          </ListGroup>
        )}
        
        {!loading && displayAnnouncements.length === 0 && (
          <div className="text-center py-4 text-muted">
            <FaBullhorn style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p className="mt-2 mb-0">No announcements</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default QuickAnnouncements;
