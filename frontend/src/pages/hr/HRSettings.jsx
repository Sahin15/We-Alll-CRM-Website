import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Nav } from 'react-bootstrap';
import { FaSave, FaLock, FaBell, FaPalette, FaShieldAlt, FaCog } from 'react-icons/fa';
import NotificationSettings from '../../components/notifications/NotificationSettings';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import MobileTabBar from '../../components/shared/MobileTabBar';
import FormFieldStack from '../../components/shared/FormFieldStack';

const SETTINGS_TABS = [
  { key: 'account', label: 'Security' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'hr-prefs', label: 'HR Preferences' },
  { key: 'display', label: 'Display' },
  { key: 'privacy', label: 'Privacy' },
];

const HRSettings = () => {
  const { user } = useAuth();
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
      localStorage.setItem('displayPreferences', JSON.stringify(displayPrefs));
      toast.success('Display preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <Card>
            <Card.Body>
              <h5 className="mb-4">Change Password</h5>
              <Form onSubmit={handlePasswordChange}>
                <FormFieldStack md={12} lg={12}>
                  <Form.Group>
                    <Form.Label>Current Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Confirm New Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                    />
                  </Form.Group>
                </FormFieldStack>
                <Button type="submit" variant="primary" className="touch-target mt-3" disabled={saving}>
                  <FaSave className="me-2" />
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        );
      case 'notifications':
        return <NotificationSettings />;
      case 'hr-prefs':
        return (
          <Card>
            <Card.Body>
              <h5 className="mb-4">HR System Preferences</h5>
              <FormFieldStack md={6}>
                <Form.Group>
                  <Form.Check
                    type="switch"
                    label="Auto-approve leaves (up to limit)"
                    checked={hrPreferences.autoApproveLeaves}
                    onChange={(e) => setHrPreferences({ ...hrPreferences, autoApproveLeaves: e.target.checked })}
                  />
                  <Form.Text className="text-muted">Automatically approve leaves within the specified limit</Form.Text>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Leave Auto-Approval Limit (days)</Form.Label>
                  <Form.Control
                    type="number"
                    value={hrPreferences.leaveApprovalLimit}
                    onChange={(e) => setHrPreferences({ ...hrPreferences, leaveApprovalLimit: e.target.value })}
                    min="1"
                    max="10"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Daily Attendance Reminder Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={hrPreferences.attendanceReminderTime}
                    onChange={(e) => setHrPreferences({ ...hrPreferences, attendanceReminderTime: e.target.value })}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Probation Period (days)</Form.Label>
                  <Form.Control
                    type="number"
                    value={hrPreferences.probationPeriodDays}
                    onChange={(e) => setHrPreferences({ ...hrPreferences, probationPeriodDays: e.target.value })}
                    min="30"
                    max="180"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Contract Renewal Notice (days before)</Form.Label>
                  <Form.Control
                    type="number"
                    value={hrPreferences.contractRenewalNotice}
                    onChange={(e) => setHrPreferences({ ...hrPreferences, contractRenewalNotice: e.target.value })}
                    min="7"
                    max="90"
                  />
                </Form.Group>
              </FormFieldStack>
              <Button variant="primary" className="touch-target mt-3" onClick={handleHRPrefsSave} disabled={saving}>
                <FaSave className="me-2" />Save HR Preferences
              </Button>
            </Card.Body>
          </Card>
        );
      case 'display':
        return (
          <Card>
            <Card.Body>
              <h5 className="mb-4">Display Preferences</h5>
              <FormFieldStack md={6}>
                <Form.Group>
                  <Form.Label>Theme</Form.Label>
                  <Form.Select value={displayPrefs.theme} onChange={(e) => setDisplayPrefs({ ...displayPrefs, theme: e.target.value })}>
                    <option value="light">Light</option>
                    <option value="dark">Dark (Coming Soon)</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Date Format</Form.Label>
                  <Form.Select value={displayPrefs.dateFormat} onChange={(e) => setDisplayPrefs({ ...displayPrefs, dateFormat: e.target.value })}>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Time Format</Form.Label>
                  <Form.Select value={displayPrefs.timeFormat} onChange={(e) => setDisplayPrefs({ ...displayPrefs, timeFormat: e.target.value })}>
                    <option value="12h">12-hour</option>
                    <option value="24h">24-hour</option>
                  </Form.Select>
                </Form.Group>
              </FormFieldStack>
              <Button variant="primary" className="touch-target mt-3" onClick={handleDisplayPrefsSave} disabled={saving}>
                <FaSave className="me-2" />Save Preferences
              </Button>
            </Card.Body>
          </Card>
        );
      case 'privacy':
        return (
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
        );
      default:
        return null;
    }
  };

  return (
    <Container className="mt-4">
      <PageHeader
        title={`${user?.name}'s Settings`}
        subtitle="Manage your account settings and preferences"
      />

      <MobileTabBar
        tabs={SETTINGS_TABS}
        activeKey={activeTab}
        onSelect={setActiveTab}
        desktopChildren={
          <Nav variant="tabs" className="mb-4">
            {SETTINGS_TABS.map(({ key, label }) => (
              <Nav.Item key={key}>
                <Nav.Link active={activeTab === key} onClick={() => setActiveTab(key)}>
                  {key === 'account' && <FaLock className="me-2" />}
                  {key === 'notifications' && <FaBell className="me-2" />}
                  {key === 'hr-prefs' && <FaCog className="me-2" />}
                  {key === 'display' && <FaPalette className="me-2" />}
                  {key === 'privacy' && <FaShieldAlt className="me-2" />}
                  {label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        }
      />

      {renderTabContent()}
    </Container>
  );
};

export default HRSettings;
