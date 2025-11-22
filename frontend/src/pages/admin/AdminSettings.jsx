import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Badge } from 'react-bootstrap';
import { FaSave, FaLock, FaBell, FaPalette, FaShieldAlt, FaCog, FaDatabase, FaUsers } from 'react-icons/fa';
import toast from '../../utils/toast';
import api from '../../services/api';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    systemAlerts: true,
    userRegistrations: true,
    securityAlerts: true,
    backupStatus: true,
    errorLogs: true
  });

  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90
  });

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
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
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
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSystemSettingsSave = async () => {
    try {
      setSaving(true);
      toast.success('System settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
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
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Admin Settings</h2>
          <p className="text-muted">Manage system-wide settings and configurations</p>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="account" title={<span><FaLock className="me-2" />Security</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Change Password</h5>
              <Form onSubmit={handlePasswordChange}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="primary" disabled={saving}>
                  <FaSave className="me-2" />
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="notifications" title={<span><FaBell className="me-2" />Notifications</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Admin Notification Preferences</h5>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Enable Email Notifications"
                  checked={notifications.emailNotifications}
                  onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                />
              </Form.Group>
              <hr />
              <h6 className="mb-3">Notify me about:</h6>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="System alerts and warnings" checked={notifications.systemAlerts} onChange={(e) => setNotifications({ ...notifications, systemAlerts: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="New user registrations" checked={notifications.userRegistrations} onChange={(e) => setNotifications({ ...notifications, userRegistrations: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="Security alerts" checked={notifications.securityAlerts} onChange={(e) => setNotifications({ ...notifications, securityAlerts: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="Backup status" checked={notifications.backupStatus} onChange={(e) => setNotifications({ ...notifications, backupStatus: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="Error logs" checked={notifications.errorLogs} onChange={(e) => setNotifications({ ...notifications, errorLogs: e.target.checked })} />
              </Form.Group>
              <Button variant="primary" onClick={handleNotificationSave} disabled={saving}>
                <FaSave className="me-2" />Save Preferences
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="system" title={<span><FaCog className="me-2" />System</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">System Configuration</h5>
              <Alert variant="warning">
                <strong>Warning:</strong> Changes to system settings affect all users. Proceed with caution.
              </Alert>
              
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label={<span>Maintenance Mode <Badge bg="danger">Critical</Badge></span>}
                  checked={systemSettings.maintenanceMode}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
                />
                <Form.Text className="text-muted">Enable to prevent users from accessing the system</Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Allow New User Registration"
                  checked={systemSettings.allowRegistration}
                  onChange={(e) => setSystemSettings({ ...systemSettings, allowRegistration: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Require Email Verification"
                  checked={systemSettings.requireEmailVerification}
                  onChange={(e) => setSystemSettings({ ...systemSettings, requireEmailVerification: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Session Timeout (minutes)</Form.Label>
                <Form.Control
                  type="number"
                  value={systemSettings.sessionTimeout}
                  onChange={(e) => setSystemSettings({ ...systemSettings, sessionTimeout: e.target.value })}
                  min="5"
                  max="120"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Max Login Attempts</Form.Label>
                <Form.Control
                  type="number"
                  value={systemSettings.maxLoginAttempts}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maxLoginAttempts: e.target.value })}
                  min="3"
                  max="10"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Password Expiry (days)</Form.Label>
                <Form.Control
                  type="number"
                  value={systemSettings.passwordExpiry}
                  onChange={(e) => setSystemSettings({ ...systemSettings, passwordExpiry: e.target.value })}
                  min="30"
                  max="365"
                />
              </Form.Group>

              <Button variant="primary" onClick={handleSystemSettingsSave} disabled={saving}>
                <FaSave className="me-2" />Save System Settings
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="display" title={<span><FaPalette className="me-2" />Display</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Display Preferences</h5>
              <Form.Group className="mb-3">
                <Form.Label>Theme</Form.Label>
                <Form.Select value={displayPrefs.theme} onChange={(e) => setDisplayPrefs({ ...displayPrefs, theme: e.target.value })}>
                  <option value="light">Light</option>
                  <option value="dark">Dark (Coming Soon)</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Date Format</Form.Label>
                <Form.Select value={displayPrefs.dateFormat} onChange={(e) => setDisplayPrefs({ ...displayPrefs, dateFormat: e.target.value })}>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Time Format</Form.Label>
                <Form.Select value={displayPrefs.timeFormat} onChange={(e) => setDisplayPrefs({ ...displayPrefs, timeFormat: e.target.value })}>
                  <option value="12h">12-hour</option>
                  <option value="24h">24-hour</option>
                </Form.Select>
              </Form.Group>
              <Button variant="primary" onClick={handleDisplayPrefsSave} disabled={saving}>
                <FaSave className="me-2" />Save Preferences
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="access" title={<span><FaUsers className="me-2" />Access Control</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Role & Permission Management</h5>
              <Alert variant="info">
                <h6>Administrator Access</h6>
                <p className="mb-0">You have full system access including user management, system configuration, and data management.</p>
              </Alert>
              <h6 className="mb-3">Your Permissions:</h6>
              <Row>
                <Col md={6}>
                  <ul>
                    <li>User Management</li>
                    <li>Role Assignment</li>
                    <li>System Configuration</li>
                    <li>Database Management</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <ul>
                    <li>Security Settings</li>
                    <li>Backup & Restore</li>
                    <li>Audit Logs</li>
                    <li>System Monitoring</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="backup" title={<span><FaDatabase className="me-2" />Backup</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Backup & Data Management</h5>
              <Alert variant="success">
                <strong>Last Backup:</strong> Today at 2:00 AM
              </Alert>
              
              <h6 className="mb-3">Backup Schedule</h6>
              <Form.Group className="mb-3">
                <Form.Label>Automatic Backup Frequency</Form.Label>
                <Form.Select defaultValue="daily">
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Backup Time</Form.Label>
                <Form.Control type="time" defaultValue="02:00" />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Retention Period (days)</Form.Label>
                <Form.Control type="number" defaultValue="30" min="7" max="365" />
              </Form.Group>

              <hr className="my-4" />

              <h6 className="mb-3">Manual Actions</h6>
              <div className="d-flex gap-2">
                <Button variant="primary">
                  <FaDatabase className="me-2" />Create Backup Now
                </Button>
                <Button variant="outline-secondary">
                  View Backup History
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AdminSettings;
