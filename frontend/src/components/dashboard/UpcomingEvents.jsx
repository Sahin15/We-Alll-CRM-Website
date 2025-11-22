import { Card, ListGroup, Badge, Button } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const UpcomingEvents = ({ events = [], onEventClick }) => {
  const navigate = useNavigate();

  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick(event);
    } else {
      console.log('Event clicked:', event);
    }
  };

  const displayEvents = Array.isArray(events) ? events : [];

  const getEventTypeBadge = (type) => {
    switch (type) {
      case 'meeting': return <Badge bg="primary">Meeting</Badge>;
      case 'holiday': return <Badge bg="danger">Holiday</Badge>;
      case 'training': return <Badge bg="info">Training</Badge>;
      case 'event': return <Badge bg="success">Event</Badge>;
      default: return <Badge bg="secondary">{type}</Badge>;
    }
  };

  const formatDate = (date) => {
    const eventDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (eventDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return eventDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: eventDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getDaysUntil = (date) => {
    const today = new Date();
    const eventDate = new Date(date);
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return formatDate(date);
  };

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            <FaCalendarAlt className="me-2 text-primary" />
            Upcoming Events
          </h5>
          <Button 
            size="sm" 
            variant="outline-primary"
            onClick={() => {
              // Calendar page doesn't exist yet
              console.log('Navigate to calendar');
            }}
          >
            View Calendar
          </Button>
        </div>
        <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {displayEvents.slice(0, 6).map((event) => (
            <ListGroup.Item 
              key={event.id} 
              className="px-0 py-3 border-bottom cursor-pointer"
              onClick={() => handleEventClick(event)}
              style={{ transition: 'all 0.2s ease' }}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0">{event.title}</h6>
                {getEventTypeBadge(event.type)}
              </div>
              <div className="d-flex flex-column gap-1 mb-2">
                <small className="text-muted">
                  <FaCalendarAlt className="me-2" />
                  {getDaysUntil(event.date)}
                </small>
                <small className="text-muted">
                  <FaClock className="me-2" />
                  {event.time || (event.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBD')}
                </small>
                <small className="text-muted">
                  <FaMapMarkerAlt className="me-2" />
                  {event.location}
                </small>
                {(event.attendees > 0 || event.participants?.length > 0) && (
                  <small className="text-muted">
                    <FaUsers className="me-2" />
                    {event.attendees || event.participants?.length || 0} attendees
                  </small>
                )}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
        {displayEvents.length === 0 && (
          <div className="text-center py-4 text-muted">
            <FaCalendarAlt style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p className="mt-2 mb-0">No upcoming events</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default UpcomingEvents;
