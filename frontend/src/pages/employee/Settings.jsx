import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs } from 'react-bootstrap';
import { FaSave, FaLock, FaBell, FaPalette, FaShieldAlt } from 'react-icons/fa';
import toast from '../../utils/toast';
import api from '../../services/api';

// Employee Settings Page
const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskAssigned: true,
    leaveApproved: true,
    meetingScheduled: true,
    documentUploaded: true,
    attendanceReminder: true
  });

  // Display preferences
  const [displayPrefs, setDisplayPrefs] = useState({
    theme: 'light',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      await api.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    try {
      setSaving(true);
      // Save to localStorage
      localStorage.setItem('notificationPreferences', JSON.stringify(notifications));
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleDisplayPrefsSave = async () => {
    try {
      setSaving(true);
      // Save to localStorage for UI preferences
      localStorage.setItem('displayPreferences', JSON.stringify(displayPrefs));
      toast.success('Display preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Settings</h2>
          <p className="text-muted">Manage your account settings and preferences</p>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* Account Security Tab */}
        <Tab eventKey="account" title={<span><FaLock className="me-2" />Security</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Change Password</h5>
              <Form onSubmit={handlePasswordChange}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                  <Form.Text className="text-muted">
                    Password must be at least 6 characters long
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </Form.Group>

                <Button type="submit" variant="primary" disabled={saving}>
                  <FaSave className="me-2" />
                  {saving ? 'Changing Password...' : 'Change Password'}
                </Button>
              </Form>

              <hr className="my-4" />

              <h5 className="mb-3">Security Tips</h5>
              <Alert variant="info">
                <ul className="mb-0">
                  <li>Use a strong password with letters, numbers, and symbols</li>
                  <li>Don't share your password with anyone</li>
                  <li>Change your password regularly</li>
                  <li>Don't use the same password for multiple accounts</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </Tab>

        {/* Notifications Tab */}
        <Tab eventKey="notifications" title={<span><FaBell className="me-2" />Notifications</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Notification Preferences</h5>
              
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="emailNotifications"
                  label="Enable Email Notifications"
                  checked={notifications.emailNotifications}
                  onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                />
                <Form.Text className="text-muted">
                  Receive notifications via email
                </Form.Text>
              </Form.Group>

              <hr className="my-3" />

              <h6 className="mb-3">Notify me when:</h6>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="taskAssigned"
                  label="A task is assigned to me"
                  checked={notifications.taskAssigned}
                  onChange={(e) => setNotifications({ ...notifications, taskAssigned: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="leaveApproved"
                  label="My leave request is approved or rejected"
                  checked={notifications.leaveApproved}
                  onChange={(e) => setNotifications({ ...notifications, leaveApproved: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="meetingScheduled"
                  label="A meeting is scheduled with me"
                  checked={notifications.meetingScheduled}
                  onChange={(e) => setNotifications({ ...notifications, meetingScheduled: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="documentUploaded"
                  label="A document is uploaded for me"
                  checked={notifications.documentUploaded}
                  onChange={(e) => setNotifications({ ...notifications, documentUploaded: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="attendanceReminder"
                  label="Daily attendance reminder"
                  checked={notifications.attendanceReminder}
                  onChange={(e) => setNotifications({ ...notifications, attendanceReminder: e.target.checked })}
                />
              </Form.Group>

              <Button variant="primary" onClick={handleNotificationSave} disabled={saving}>
                <FaSave className="me-2" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        {/* Display Preferences Tab */}
        <Tab eventKey="display" title={<span><FaPalette className="me-2" />Display</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Display Preferences</h5>

              <Form.Group className="mb-3">
                <Form.Label>Theme</Form.Label>
                <Form.Select
                  value={displayPrefs.theme}
                  onChange={(e) => setDisplayPrefs({ ...displayPrefs, theme: e.target.value })}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark (Coming Soon)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose your preferred theme
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Language</Form.Label>
                <Form.Select
                  value={displayPrefs.language}
                  onChange={(e) => setDisplayPrefs({ ...displayPrefs, language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (Coming Soon)</option>
                  <option value="es">Spanish (Coming Soon)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Select your preferred language
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Date Format</Form.Label>
                <Form.Select
                  value={displayPrefs.dateFormat}
                  onChange={(e) => setDisplayPrefs({ ...displayPrefs, dateFormat: e.target.value })}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose how dates are displayed
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Time Format</Form.Label>
                <Form.Select
                  value={displayPrefs.timeFormat}
                  onChange={(e) => setDisplayPrefs({ ...displayPrefs, timeFormat: e.target.value })}
                >
                  <option value="12h">12-hour (2:30 PM)</option>
                  <option value="24h">24-hour (14:30)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose how time is displayed
                </Form.Text>
              </Form.Group>

              <Button variant="primary" onClick={handleDisplayPrefsSave} disabled={saving}>
                <FaSave className="me-2" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        {/* Privacy Tab */}
        <Tab eventKey="privacy" title={<span><FaShieldAlt className="me-2" />Privacy</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Privacy Settings</h5>

              <Form.Group className="mb-3">
                <Form.Label>Profile Visibility</Form.Label>
                <Form.Select defaultValue="team">
                  <option value="everyone">Everyone in company</option>
                  <option value="team">My team only</option>
                  <option value="private">Private</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Control who can see your profile information
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="showEmail"
                  label="Show my email in team directory"
                  defaultChecked
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="showPhone"
                  label="Show my phone number in team directory"
                  defaultChecked
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="showOnlineStatus"
                  label="Show my online status"
                  defaultChecked
                />
              </Form.Group>

              <hr className="my-4" />

              <h5 className="mb-3">Data & Privacy</h5>
              <Alert variant="info">
                <h6>Your Data is Protected</h6>
                <p className="mb-0">
                  We take your privacy seriously. Your personal information is encrypted and stored securely. 
                  Only authorized personnel can access sensitive data like Government IDs and Banking Details.
                </p>
              </Alert>

              <Button variant="primary" disabled={saving}>
                <FaSave className="me-2" />
                Save Privacy Settings
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        {/* About Tab */}
        <Tab eventKey="about" title="About">
          <Card>
            <Card.Body>
              <h5 className="mb-4">About CRM System</h5>
              
              <Row>
                <Col md={6}>
                  <h6>System Information</h6>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Version:</strong></td>
                        <td>1.0.0</td>
                      </tr>
                      <tr>
                        <td><strong>Last Updated:</strong></td>
                        <td>November 2025</td>
                      </tr>
                      <tr>
                        <td><strong>Environment:</strong></td>
                        <td>Production</td>
                      </tr>
                    </tbody>
                  </table>
                </Col>

                <Col md={6}>
                  <h6>Support</h6>
                  <p className="text-muted">
                    Need help? Contact your HR department or system administrator.
                  </p>
                  <Button variant="outline-primary" size="sm">
                    Contact Support
                  </Button>
                </Col>
              </Row>

              <hr className="my-4" />

              <h6>Features</h6>
              <Row>
                <Col md={6}>
                  <ul>
                    <li>Attendance Management</li>
                    <li>Leave Management</li>
                    <li>Task Management</li>
                    <li>Time Tracking</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <ul>
                    <li>Team Collaboration</li>
                    <li>Document Management</li>
                    <li>Profile Management</li>
                    <li>Meeting Scheduling</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Settings;
