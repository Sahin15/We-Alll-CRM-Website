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
    const dateObj = new Date(date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <Card className="dashboard-card border-0 shadow-sm h-100">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-3" style={{ gap: '8px' }}>
          <h5 className="mb-0 d-flex align-items-center" style={{ whiteSpace: 'nowrap', fontSize: '1rem' }}>
            <FaBullhorn className="me-2 text-warning" style={{ flexShrink: 0 }} />
            Announcements
          </h5>
          <Button 
            size="sm" 
            variant="outline-primary"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
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
          <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
            {displayAnnouncements.slice(0, 5).map((announcement) => (
              <ListGroup.Item 
                key={announcement._id || announcement.id} 
                className="py-2 border-bottom cursor-pointer"
                onClick={() => handleAnnouncementClick(announcement)}
                style={{ 
                  transition: 'all 0.2s ease',
                  backgroundColor: announcement.isPinned ? 'rgba(255, 193, 7, 0.05)' : 'transparent',
                  paddingLeft: '2px',
                  paddingRight: '2px',
                }}
              >
                {/* Badge row */}
                <div className="mb-1">
                  {getTypeBadge(announcement.type)}
                </div>
                {/* Title */}
                <div className="mb-1" style={{ 
                  fontSize: '0.88rem', 
                  fontWeight: 600, 
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}>
                  {announcement.isPinned && <span className="me-1">📌</span>}
                  {announcement.title}
                </div>
                {/* Content preview */}
                <p className="text-muted small" style={{ 
                  wordBreak: 'break-word', 
                  overflowWrap: 'anywhere',
                  lineHeight: '1.4',
                  margin: 0,
                  marginBottom: '6px'
                }}>
                  {announcement.content?.substring(0, 80)}
                  {announcement.content?.length > 80 ? '...' : ''}
                </p>
                {/* Date + View row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small className="text-muted">{formatDate(announcement.createdAt)}</small>
                  <Button 
                    size="sm" 
                    variant="link" 
                    className="p-0"
                    style={{ flexShrink: 0, fontSize: '0.8rem' }}
                    onClick={(e) => { e.stopPropagation(); handleAnnouncementClick(announcement); }}
                  >
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
