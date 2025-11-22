import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs } from 'react-bootstrap';
import { FaSave, FaLock, FaBell, FaPalette, FaShieldAlt, FaCog } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';

const HRSettings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    leaveRequests: true,
    attendanceAlerts: true,
    newEmployeeJoined: true,
    documentExpiry: true,
    policyUpdates: true,
    taskDeadlines: true
  });

  const [hrPreferences, setHrPreferences] = useState({
    autoApproveLeaves: false,
    leaveApprovalLimit: 3,
    attendanceReminderTime: '09:00',
    probationPeriodDays: 90,
    contractRenewalNotice: 30
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

  const handleHRPrefsSave = async () => {
    try {
      setSaving(true);
      toast.success('HR preferences saved');
    } catch (error) {
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
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>HR Settings</h2>
          <p className="text-muted">Manage your HR account settings and system preferences</p>
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
              <h5 className="mb-4">Notification Preferences</h5>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Enable Email Notifications"
                  checked={notifications.emailNotifications}
                  onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                />
              </Form.Group>
              <hr />
              <h6 className="mb-3">Notify me when:</h6>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="New leave request submitted" checked={notifications.leaveRequests} onChange={(e) => setNotifications({ ...notifications, leaveRequests: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="Attendance alerts (late/absent)" checked={notifications.attendanceAlerts} onChange={(e) => setNotifications({ ...notifications, attendanceAlerts: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="New employee joined" checked={notifications.newEmployeeJoined} onChange={(e) => setNotifications({ ...notifications, newEmployeeJoined: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="Document expiry alerts" checked={notifications.documentExpiry} onChange={(e) => setNotifications({ ...notifications, documentExpiry: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="Policy updates" checked={notifications.policyUpdates} onChange={(e) => setNotifications({ ...notifications, policyUpdates: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="switch" label="Task deadlines approaching" checked={notifications.taskDeadlines} onChange={(e) => setNotifications({ ...notifications, taskDeadlines: e.target.checked })} />
              </Form.Group>
              <Button variant="primary" onClick={handleNotificationSave} disabled={saving}>
                <FaSave className="me-2" />Save Preferences
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="hr-prefs" title={<span><FaCog className="me-2" />HR Preferences</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">HR System Preferences</h5>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Auto-approve leaves (up to limit)"
                  checked={hrPreferences.autoApproveLeaves}
                  onChange={(e) => setHrPreferences({ ...hrPreferences, autoApproveLeaves: e.target.checked })}
                />
                <Form.Text className="text-muted">Automatically approve leaves within the specified limit</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Leave Auto-Approval Limit (days)</Form.Label>
                <Form.Control
                  type="number"
                  value={hrPreferences.leaveApprovalLimit}
                  onChange={(e) => setHrPreferences({ ...hrPreferences, leaveApprovalLimit: e.target.value })}
                  min="1"
                  max="10"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Daily Attendance Reminder Time</Form.Label>
                <Form.Control
                  type="time"
                  value={hrPreferences.attendanceReminderTime}
                  onChange={(e) => setHrPreferences({ ...hrPreferences, attendanceReminderTime: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Probation Period (days)</Form.Label>
                <Form.Control
                  type="number"
                  value={hrPreferences.probationPeriodDays}
                  onChange={(e) => setHrPreferences({ ...hrPreferences, probationPeriodDays: e.target.value })}
                  min="30"
                  max="180"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Contract Renewal Notice (days before)</Form.Label>
                <Form.Control
                  type="number"
                  value={hrPreferences.contractRenewalNotice}
                  onChange={(e) => setHrPreferences({ ...hrPreferences, contractRenewalNotice: e.target.value })}
                  min="7"
                  max="90"
                />
              </Form.Group>
              <Button variant="primary" onClick={handleHRPrefsSave} disabled={saving}>
                <FaSave className="me-2" />Save HR Preferences
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

        <Tab eventKey="privacy" title={<span><FaShieldAlt className="me-2" />Privacy</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Privacy & Data Access</h5>
              <Alert variant="info">
                <h6>HR Data Access</h6>
                <p className="mb-0">As an HR manager, you have access to sensitive employee data. Please ensure you handle all information responsibly and in compliance with company policies.</p>
              </Alert>
              <h6 className="mb-3">Your Access Includes:</h6>
              <ul>
                <li>Employee personal information</li>
                <li>Attendance and leave records</li>
                <li>Performance reviews</li>
                <li>Salary and compensation data</li>
                <li>Document management</li>
              </ul>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default HRSettings;
