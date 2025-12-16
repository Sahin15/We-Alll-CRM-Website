import { useState } from 'react';
import { Card, Form, Button, Alert, Badge, Row, Col } from 'react-bootstrap';
import { 
  FaBell, 
  FaDesktop, 
  FaEnvelope, 
  FaSms, 
  FaCheck, 
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import notificationService from '../../services/notificationService';

const NotificationSettings = () => {
  const { realTimeEnabled, enableRealTime, disableRealTime } = useNotifications();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleToggleRealTime = async () => {
    try {
      setError('');
      setMessage('');

      if (realTimeEnabled) {
        disableRealTime();
        setMessage('Real-time notifications disabled');
      } else {
        const enabled = await enableRealTime();
        if (enabled) {
          setMessage('Real-time notifications enabled! You\'ll receive instant updates.');
          // Send test notification
          setTimeout(() => {
            notificationService.sendTestNotification();
          }, 1000);
        } else {
          setError('Browser notifications are blocked. Please enable them in your browser settings.');
        }
      }

      setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
    } catch (err) {
      setError('Failed to update notification settings');
    }
  };

  const getPermissionStatus = () => {
    const status = notificationService.getPermissionStatus();
    switch (status) {
      case 'granted':
        return { text: 'Allowed', variant: 'success', icon: <FaCheck /> };
      case 'denied':
        return { text: 'Blocked', variant: 'danger', icon: <FaTimes /> };
      case 'default':
        return { text: 'Not Set', variant: 'warning', icon: <FaExclamationTriangle /> };
      case 'unsupported':
        return { text: 'Unsupported', variant: 'secondary', icon: <FaTimes /> };
      default:
        return { text: 'Unknown', variant: 'secondary', icon: <FaExclamationTriangle /> };
    }
  };

  const permissionStatus = getPermissionStatus();

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-gradient-primary text-white">
        <div className="d-flex align-items-center">
          <FaBell className="me-2" />
          <h5 className="mb-0">Notification Settings</h5>
        </div>
        <small className="opacity-75">
          Configure how you receive notifications
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
          <Alert variant="danger" className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}

        {/* Browser Notifications */}
        <Card className="mb-4 border-0 bg-light">
          <Card.Body>
            <div className="d-flex align-items-start">
              <div 
                className="rounded-circle p-3 me-3"
                style={{ 
                  backgroundColor: '#4F46E5' + '20',
                  color: '#4F46E5'
                }}
              >
                <FaDesktop size={24} />
              </div>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="mb-1 fw-semibold">Browser Notifications</h6>
                    <p className="text-muted small mb-0">
                      Get instant desktop notifications for important updates
                    </p>
                  </div>
                  <Badge 
                    bg={permissionStatus.variant}
                    className="d-flex align-items-center"
                  >
                    {permissionStatus.icon}
                    <span className="ms-1">{permissionStatus.text}</span>
                  </Badge>
                </div>
                
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <Form.Check
                      type="switch"
                      id="real-time-notifications"
                      label={realTimeEnabled ? "Enabled" : "Disabled"}
                      checked={realTimeEnabled}
                      onChange={handleToggleRealTime}
                      disabled={permissionStatus.text === 'Unsupported'}
                    />
                  </div>
                  
                  {!realTimeEnabled && permissionStatus.text !== 'Blocked' && (
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={handleToggleRealTime}
                      disabled={permissionStatus.text === 'Unsupported'}
                    >
                      Enable Notifications
                    </Button>
                  )}
                </div>

                {permissionStatus.text === 'Blocked' && (
                  <Alert variant="warning" className="mt-3 mb-0">
                    <small>
                      <strong>Notifications are blocked.</strong> To enable them:
                      <br />
                      1. Click the lock icon in your browser's address bar
                      <br />
                      2. Set notifications to "Allow"
                      <br />
                      3. Refresh the page and try again
                    </small>
                  </Alert>
                )}

                {permissionStatus.text === 'Unsupported' && (
                  <Alert variant="info" className="mt-3 mb-0">
                    <small>
                      Your browser doesn't support desktop notifications. 
                      You'll still receive in-app notifications.
                    </small>
                  </Alert>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Notification Channels */}
        <div className="mb-4">
          <h6 className="mb-3 fw-semibold">Notification Channels</h6>
          
          <Row className="g-3">
            <Col md={4}>
              <Card className="h-100 border-0 bg-light">
                <Card.Body className="text-center">
                  <div 
                    className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      backgroundColor: '#4F46E5' + '20',
                      color: '#4F46E5'
                    }}
                  >
                    <FaBell size={20} />
                  </div>
                  <h6 className="mb-1">In-App</h6>
                  <p className="text-muted small mb-2">
                    Notifications within the application
                  </p>
                  <Badge bg="success">Always Active</Badge>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="h-100 border-0 bg-light">
                <Card.Body className="text-center">
                  <div 
                    className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      backgroundColor: '#10B981' + '20',
                      color: '#10B981'
                    }}
                  >
                    <FaEnvelope size={20} />
                  </div>
                  <h6 className="mb-1">Email</h6>
                  <p className="text-muted small mb-2">
                    Email notifications for important updates
                  </p>
                  <Badge bg="warning">Coming Soon</Badge>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="h-100 border-0 bg-light">
                <Card.Body className="text-center">
                  <div 
                    className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      backgroundColor: '#F59E0B' + '20',
                      color: '#F59E0B'
                    }}
                  >
                    <FaSms size={20} />
                  </div>
                  <h6 className="mb-1">SMS</h6>
                  <p className="text-muted small mb-2">
                    Text messages for urgent notifications
                  </p>
                  <Badge bg="secondary">Planned</Badge>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Tips */}
        <Card className="border-0 bg-primary bg-opacity-10">
          <Card.Body>
            <h6 className="mb-2 text-primary">
              <FaBell className="me-2" />
              Tips for Better Notifications
            </h6>
            <ul className="mb-0 small text-muted">
              <li>Enable browser notifications to never miss important updates</li>
              <li>Check your notification preferences in the sidebar menu</li>
              <li>You can always view all notifications in the News & Alerts section</li>
              <li>Notifications are automatically marked as read when you view them</li>
            </ul>
          </Card.Body>
        </Card>
      </Card.Body>

      <style>{`
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

export default NotificationSettings;