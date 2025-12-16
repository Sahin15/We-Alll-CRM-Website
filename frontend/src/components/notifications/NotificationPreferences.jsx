import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { FaBell, FaEnvelope, FaSms, FaSave, FaCheck } from 'react-icons/fa';
import api from '../../services/api';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    workItems: {
      inApp: true,
      email: false,
      sms: false
    },
    leaves: {
      inApp: true,
      email: true,
      sms: false
    },
    projects: {
      inApp: true,
      email: false,
      sms: false
    },
    payments: {
      inApp: true,
      email: true,
      sms: false
    },
    general: {
      inApp: true,
      email: false,
      sms: false
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/preferences');
      if (response.data.preferences) {
        setPreferences(response.data.preferences);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      // Use default preferences if none exist
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (category, channel, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      await api.put('/notifications/preferences', { preferences });
      
      setMessage('Notification preferences saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save preferences');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const notificationCategories = [
    {
      key: 'workItems',
      title: 'Work Items & Tasks',
      description: 'Assignments, due dates, status changes, and comments',
      icon: '📋',
      color: '#3B82F6'
    },
    {
      key: 'leaves',
      title: 'Leave Management',
      description: 'Leave approvals, rejections, and requests',
      icon: '📅',
      color: '#10B981'
    },
    {
      key: 'projects',
      title: 'Projects',
      description: 'New projects, milestones, and updates',
      icon: '🚀',
      color: '#8B5CF6'
    },
    {
      key: 'payments',
      title: 'Payments & Billing',
      description: 'Payment confirmations and billing updates',
      icon: '💰',
      color: '#F59E0B'
    },
    {
      key: 'general',
      title: 'General & Announcements',
      description: 'Company news, announcements, and system updates',
      icon: '📢',
      color: '#EF4444'
    }
  ];

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3 mb-0">Loading notification preferences...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-gradient-primary text-white">
        <div className="d-flex align-items-center">
          <FaBell className="me-2" />
          <h5 className="mb-0">Notification Preferences</h5>
        </div>
        <small className="opacity-75">
          Choose how you want to receive different types of notifications
        </small>
      </Card.Header>
      
      <Card.Body>
        {message && (
          <Alert variant="success" className="d-flex align-items-center">
            <FaCheck className="me-2" />
            {message}
          </Alert>
        )}
        
        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}

        <div className="mb-4">
          <Row className="g-0 text-center">
            <Col xs={4}>
              <div className="p-2">
                <FaBell className="text-primary mb-1" size={20} />
                <div className="small fw-semibold">In-App</div>
              </div>
            </Col>
            <Col xs={4}>
              <div className="p-2">
                <FaEnvelope className="text-success mb-1" size={20} />
                <div className="small fw-semibold">Email</div>
              </div>
            </Col>
            <Col xs={4}>
              <div className="p-2">
                <FaSms className="text-warning mb-1" size={20} />
                <div className="small fw-semibold">SMS</div>
              </div>
            </Col>
          </Row>
        </div>

        <div className="space-y-4">
          {notificationCategories.map((category) => (
            <Card key={category.key} className="border-0 bg-light">
              <Card.Body className="p-4">
                <div className="d-flex align-items-start mb-3">
                  <div 
                    className="rounded-circle p-2 me-3"
                    style={{ 
                      backgroundColor: category.color + '20',
                      color: category.color,
                      fontSize: '1.2rem'
                    }}
                  >
                    {category.icon}
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1 fw-semibold">{category.title}</h6>
                    <p className="text-muted small mb-0">{category.description}</p>
                  </div>
                </div>
                
                <Row className="g-3">
                  <Col xs={4}>
                    <Form.Check
                      type="switch"
                      id={`${category.key}-inApp`}
                      label="In-App"
                      checked={preferences[category.key]?.inApp || false}
                      onChange={(e) => handlePreferenceChange(category.key, 'inApp', e.target.checked)}
                      className="d-flex align-items-center justify-content-center"
                    />
                  </Col>
                  <Col xs={4}>
                    <Form.Check
                      type="switch"
                      id={`${category.key}-email`}
                      label="Email"
                      checked={preferences[category.key]?.email || false}
                      onChange={(e) => handlePreferenceChange(category.key, 'email', e.target.checked)}
                      className="d-flex align-items-center justify-content-center"
                    />
                  </Col>
                  <Col xs={4}>
                    <Form.Check
                      type="switch"
                      id={`${category.key}-sms`}
                      label="SMS"
                      checked={preferences[category.key]?.sms || false}
                      onChange={(e) => handlePreferenceChange(category.key, 'sms', e.target.checked)}
                      className="d-flex align-items-center justify-content-center"
                      disabled // SMS not implemented yet
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))}
        </div>

        <div className="mt-4 pt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">
                <Badge bg="info" className="me-2">Note</Badge>
                SMS notifications are coming soon. Email notifications require email configuration.
              </small>
            </div>
            <Button 
              variant="primary" 
              onClick={handleSave}
              disabled={saving}
              className="d-flex align-items-center"
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>
      </Card.Body>

      <style>{`
        .space-y-4 > * + * {
          margin-top: 1rem;
        }
        
        .bg-gradient-primary {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
        }
        
        .form-check-input:checked {
          background-color: #4F46E5;
          border-color: #4F46E5;
        }
        
        .form-check-input:focus {
          border-color: #4F46E5;
          box-shadow: 0 0 0 0.25rem rgba(79, 70, 229, 0.25);
        }
      `}</style>
    </Card>
  );
};

export default NotificationPreferences;