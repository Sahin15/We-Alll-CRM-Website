import { useState, useEffect } from 'react';
import {
  Card,
  Badge,
  Alert,
  Spinner,
  Row,
  Col,
  Button,
  Collapse
} from 'react-bootstrap';
import {
  FaCalendarAlt,
  FaGift,
  FaSun,
  FaSnowflake,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaCog
} from 'react-icons/fa';
import holidayApi from '../../api/holidayApi';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './HolidaySection.css';

const HolidaySection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllHolidays, setShowAllHolidays] = useState(false);
  const [showAllInExpanded, setShowAllInExpanded] = useState(false);

  // Check if user can manage holidays
  const canManageHolidays = ['admin', 'superadmin', 'hr'].includes(user?.role);

  const holidayTypeIcons = {
    public: <FaGift className="text-success" />,
    religious: <FaSun className="text-warning" />,
    national: <FaCalendarAlt className="text-primary" />,
    company: <FaSnowflake className="text-info" />
  };

  const holidayTypeColors = {
    public: 'success',
    religious: 'warning',
    national: 'primary',
    company: 'info'
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const [holidaysResponse, upcomingResponse] = await Promise.all([
        holidayApi.getHolidays().catch(() => ({ data: [] })), // Fallback to empty array
        holidayApi.getUpcomingHolidays().catch(() => ({ data: [] })) // Fallback to empty array
      ]);
      
      setHolidays(holidaysResponse.data || []);
      setUpcomingHolidays(upcomingResponse.data || []);
    } catch (error) {
      setError('Holidays will be available soon');
      console.error('Error fetching holidays:', error);
      // Set empty arrays as fallback
      setHolidays([]);
      setUpcomingHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateLong = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFullDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getDaysUntil = (dateString) => {
    const today = new Date();
    const holidayDate = new Date(dateString);
    const diffTime = holidayDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 0) return `${diffDays} days`;
    return 'Past';
  };

  const getCurrentYearHolidays = () => {
    const currentYear = new Date().getFullYear();
    return holidays.filter(holiday => {
      const holidayYear = new Date(holiday.date).getFullYear();
      return holidayYear === currentYear;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  if (loading) {
    return (
      <Card className="mb-3">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" />
          <span className="ms-2">Loading holidays...</span>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" className="mb-3">
        <Alert.Heading>
          <FaCalendarAlt className="me-2" />
          Holidays
        </Alert.Heading>
        <p className="mb-0">{error}</p>
      </Alert>
    );
  }

  const currentYearHolidays = getCurrentYearHolidays();

  return (
    <div className="holiday-section-container">
      <Card className="mb-3 shadow-sm me-3">
      <Card.Header className="d-flex justify-content-between align-items-center" 
        style={{ 
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
        <div>
          <h6 className="mb-0" style={{ color: '#212529', fontWeight: '600' }}>
            <FaCalendarAlt className="me-2 text-primary" />
            Company Holidays
          </h6>
          <small style={{ color: '#6c757d', fontSize: '0.85rem' }}>
            {currentYearHolidays.length} holidays this year
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setShowAllHolidays(!showAllHolidays)}
          >
            {showAllHolidays ? <FaChevronUp /> : <FaChevronDown />}
          </Button>
          {canManageHolidays && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(user.role === 'hr' ? '/hr/holidays' : '/admin/holidays')}
            >
              <FaCog className="me-1" />
              Manage
            </Button>
          )}
        </div>
      </Card.Header>

      <Card.Body className="p-3 pe-4">
        {/* Upcoming Holidays */}
        {upcomingHolidays.length > 0 && (
          <div className="mb-3 pe-2">
            <h6 className="text-primary mb-2">
              <FaClock className="me-1" />
              Upcoming Holidays
            </h6>
            <Row className="pe-2">
              {upcomingHolidays.slice(0, 3).map((holiday) => (
                <Col md={4} key={holiday._id} className="mb-2">
                  <div className="p-2 border rounded bg-light me-2">
                    <div className="d-flex align-items-center mb-1">
                      {holidayTypeIcons[holiday.type]}
                      <small className="fw-bold ms-1">{holiday.name}</small>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <small className="text-muted me-2">{formatDate(holiday.date)}</small>
                        <span className="badge bg-light text-dark border small">
                          {formatFullDayName(holiday.date)}
                        </span>
                      </div>
                      <Badge bg="primary" pill className="small">
                        {getDaysUntil(holiday.date)}
                      </Badge>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* All Holidays (Collapsible) */}
        <Collapse in={showAllHolidays}>
          <div>
            <h6 className="text-secondary mb-3">
              All Holidays {new Date().getFullYear()}
            </h6>
            {currentYearHolidays.length === 0 ? (
              <Alert variant="info" className="mb-0">
                <small>No holidays scheduled for this year.</small>
              </Alert>
            ) : (
              <>
                <Row className="g-3">
                  {(showAllInExpanded ? currentYearHolidays : currentYearHolidays.slice(0, 6)).map((holiday) => (
                    <Col md={6} lg={4} key={holiday._id}>
                      <Card className="h-100 holiday-card border-0 shadow-sm">
                        <Card.Body className="p-3">
                          <div className="d-flex align-items-start mb-2">
                            <div className="me-2 mt-1">
                              {holidayTypeIcons[holiday.type]}
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 fw-semibold text-dark">
                                {holiday.name}
                              </h6>
                              <div className="d-flex align-items-center mb-2">
                                <small className="text-muted me-2">
                                  {new Date(holiday.date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </small>
                                <Badge bg="light" text="dark" className="border small">
                                  {formatFullDayName(holiday.date)}
                                </Badge>
                              </div>
                              <div className="d-flex align-items-center justify-content-between">
                                <Badge bg={holidayTypeColors[holiday.type]} className="small">
                                  {holiday.type}
                                </Badge>
                                <Badge 
                                  bg={getDaysUntil(holiday.date) === 'Past' ? 'secondary' : 'primary'} 
                                  pill
                                  className="small"
                                >
                                  {getDaysUntil(holiday.date)}
                                </Badge>
                              </div>
                              {holiday.description && (
                                <div className="mt-2">
                                  <small 
                                    className="text-muted" 
                                    style={{ 
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: '1.3'
                                    }}
                                    title={holiday.description}
                                  >
                                    {holiday.description}
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
                
                {/* Show More/Less Button */}
                {currentYearHolidays.length > 6 && (
                  <div className="text-center mt-3">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setShowAllInExpanded(!showAllInExpanded)}
                    >
                      {showAllInExpanded ? (
                        <>Show Less <FaChevronUp className="ms-1" /></>
                      ) : (
                        <>Show More ({currentYearHolidays.length - 6} more) <FaChevronDown className="ms-1" /></>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Collapse>

        {/* Quick Stats */}
        {!showAllHolidays && currentYearHolidays.length > 0 && (
          <div className="mt-2 pe-3">
            <small className="text-muted">
              Next holiday: <strong>{upcomingHolidays[0]?.name || 'None scheduled'}</strong>
              {upcomingHolidays[0] && (
                <span> in {getDaysUntil(upcomingHolidays[0].date)}</span>
              )}
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
    </div>
  );
};

export default HolidaySection;