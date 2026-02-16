import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Badge, Row, Col } from 'react-bootstrap';
import { FaBell, FaBellSlash, FaCheck, FaTimes } from 'react-icons/fa';
import notificationService from '../../services/notificationService';
import toast from '../../utils/toast';

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState({
    email: true,
    push: true,
    sms: false,
    categories: {
      leaves: true,
      salary: true,
      meetings: true,
      announcements: true,
      projects: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    loadPreferences();
    checkPermissionStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getPreferences();
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermissionStatus = () => {
    const status = notificationService.getPermissionStatus();
    setPermissionStatus(status);
    setFcmToken(notificationService.getFCMToken());
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await notificationService.updatePreferences(preferences);
      toast.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        checkPermissionStatus();
        toast.success('Notifications enabled successfully');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    }
  };

  const handleTestNotification = async () => {
    try {
      if (permissionStatus !== 'granted') {
        toast.warning('Please enable notifications first');
        return;
      }

      // Show a test browser notification
      notificationService.showBrowserNotification(
        'Test Notification',
        'This is a test notification from your CRM system',
        '/favicon.ico',
        { tag: 'test' }
      );
      
      toast.success('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Badge bg="success"><FaCheck className="me-1" />Enabled</Badge>;
      case 'denied':
        return <Badge bg="danger"><FaTimes className="me-1" />Blocked</Badge>;
      default:
        return <Badge bg="warning"><FaBellSlash className="me-1" />Not Set</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          Loading notification settings...
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="d-flex align-items-center">
        <FaBell className="me-2 text-primary" />
        <h5 className="mb-0">Notification Settings</h5>
      </Card.Header>
      <Card.Body>
        {/* Permission Status */}
        <Alert variant={permissionStatus === 'granted' ? 'success' : 'warning'} className="mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Browser Notifications: </strong>
              {getPermissionBadge()}
              {permissionStatus === 'granted' && fcmToken && (
                <div className="mt-2">
                  <small className="text-muted">
                    Token: {fcmToken.substring(0, 20)}...
                  </small>
                </div>
              )}
            </div>
            <div>
              {permissionStatus !== 'granted' && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleEnableNotifications}
                >
                  Enable Notifications
                </Button>
              )}
              {permissionStatus === 'granted' && (
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={handleTestNotification}
                >
                  Test Notification
                </Button>
              )}
            </div>
          </div>
        </Alert>

        <Form>
          {/* Delivery Methods */}
          <div className="mb-4">
            <h6 className="mb-3">Delivery Methods</h6>
            <Row>
              <Col md={4}>
                <Form.Check
                  type="checkbox"
                  id="email-notifications"
                  label="📧 Email Notifications"
                  checked={preferences.email}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    email: e.target.checked
                  })}
                />
              </Col>
              <Col md={4}>
                <Form.Check
                  type="checkbox"
                  id="push-notifications"
                  label="📱 Push Notifications"
                  checked={preferences.push}
                  disabled={permissionStatus !== 'granted'}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    push: e.target.checked
                  })}
                />
              </Col>
              <Col md={4}>
                <Form.Check
                  type="checkbox"
                  id="sms-notifications"
                  label="📱 SMS Notifications"
                  checked={preferences.sms}
                  disabled={true} // Not implemented yet
                  onChange={(e) => setPreferences({
                    ...preferences,
                    sms: e.target.checked
                  })}
                />
                <small className="text-muted">Coming soon</small>
              </Col>
            </Row>
          </div>

          {/* Categories */}
          <div className="mb-4">
            <h6 className="mb-3">Notification Categories</h6>
            <Row>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  id="leaves-notifications"
                  label="📋 Leave Requests & Updates"
                  checked={preferences.categories.leaves}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    categories: {
                      ...preferences.categories,
                      leaves: e.target.checked
                    }
                  })}
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  id="salary-notifications"
                  label="💰 Salary & Payroll"
                  checked={preferences.categories.salary}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    categories: {
                      ...preferences.categories,
                      salary: e.target.checked
                    }
                  })}
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  id="meetings-notifications"
                  label="🕐 Meetings & Events"
                  checked={preferences.categories.meetings}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    categories: {
                      ...preferences.categories,
                      meetings: e.target.checked
                    }
                  })}
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  id="announcements-notifications"
                  label="📢 Announcements"
                  checked={preferences.categories.announcements}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    categories: {
                      ...preferences.categories,
                      announcements: e.target.checked
                    }
                  })}
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  id="projects-notifications"
                  label="📁 Projects & Tasks"
                  checked={preferences.categories.projects}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    categories: {
                      ...preferences.categories,
                      projects: e.target.checked
                    }
                  })}
                />
              </Col>
            </Row>
          </div>

          {/* Save Button */}
          <div className="d-flex justify-content-end">
            <Button 
              variant="primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </Form>

        {/* Help Text */}
        <Alert variant="info" className="mt-4">
          <small>
            <strong>Note:</strong> Push notifications require browser permission. 
            If blocked, you can re-enable them in your browser settings under 
            Site Settings → Notifications.
          </small>
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default NotificationSettings;