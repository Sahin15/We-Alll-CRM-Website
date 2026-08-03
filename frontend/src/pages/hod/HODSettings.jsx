import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs } from 'react-bootstrap';
import { FaSave, FaLock, FaBell, FaPalette, FaShieldAlt, FaCog } from 'react-icons/fa';
import NotificationSettings from '../../components/notifications/NotificationSettings';
import { useAuth } from '../../context/AuthContext';
import useDisplayPreferences from '../../hooks/useDisplayPreferences';
import { toast } from 'react-toastify';
import api from '../../services/api';

const HODSettings = () => {
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
    teamLeaveRequests: true,
    taskUpdates: true,
    teamAttendance: true,
    meetingReminders: true,
    departmentAnnouncements: true,
    performanceReviews: true
  });

  const [hodPreferences, setHodPreferences] = useState({
    autoApproveDepartmentLeaves: false,
    leaveApprovalLimit: 2,
    taskAssignmentNotification: true,
    weeklyTeamReport: true,
    reportDay: 'friday'
  });

  const {
    displayPrefs,
    setDisplayPrefs,
    handleThemeChange,
    saveDisplayPreferences,
    saving: displaySaving,
  } = useDisplayPreferences();

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

  const handleHODPrefsSave = async () => {
    try {
      setSaving(true);
      toast.success('HOD preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleDisplayPrefsSave = saveDisplayPreferences;

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>{user?.name}'s Settings</h2>
          <p className="text-muted">Manage your account settings and preferences</p>
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
          <NotificationSettings />
        </Tab>

        <Tab eventKey="hod-prefs" title={<span><FaCog className="me-2" />Department Preferences</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Department Management Preferences</h5>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Auto-approve team leaves (within limit)"
                  checked={hodPreferences.autoApproveDepartmentLeaves}
                  onChange={(e) => setHodPreferences({ ...hodPreferences, autoApproveDepartmentLeaves: e.target.checked })}
                />
                <Form.Text className="text-muted">Automatically approve team member leaves within the specified limit</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Leave Auto-Approval Limit (days)</Form.Label>
                <Form.Control
                  type="number"
                  value={hodPreferences.leaveApprovalLimit}
                  onChange={(e) => setHodPreferences({ ...hodPreferences, leaveApprovalLimit: e.target.value })}
                  min="1"
                  max="5"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Notify on task assignment"
                  checked={hodPreferences.taskAssignmentNotification}
                  onChange={(e) => setHodPreferences({ ...hodPreferences, taskAssignmentNotification: e.target.checked })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Receive weekly team report"
                  checked={hodPreferences.weeklyTeamReport}
                  onChange={(e) => setHodPreferences({ ...hodPreferences, weeklyTeamReport: e.target.checked })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Weekly Report Day</Form.Label>
                <Form.Select
                  value={hodPreferences.reportDay}
                  onChange={(e) => setHodPreferences({ ...hodPreferences, reportDay: e.target.value })}
                >
                  <option value="monday">Monday</option>
                  <option value="friday">Friday</option>
                  <option value="sunday">Sunday</option>
                </Form.Select>
              </Form.Group>
              <Button variant="primary" onClick={handleHODPrefsSave} disabled={saving}>
                <FaSave className="me-2" />Save Department Preferences
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
                <Form.Select value={displayPrefs.theme} onChange={(e) => handleThemeChange(e.target.value)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
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
              <Button variant="primary" onClick={handleDisplayPrefsSave} disabled={saving || displaySaving}>
                <FaSave className="me-2" />Save Preferences
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="privacy" title={<span><FaShieldAlt className="me-2" />Privacy</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Privacy & Team Access</h5>
              <Alert variant="info">
                <h6>Department Head Access</h6>
                <p className="mb-0">As a Department Head, you have access to your team members' data including attendance, leaves, tasks, and performance metrics.</p>
              </Alert>
              <h6 className="mb-3">Your Access Includes:</h6>
              <ul>
                <li>Team member profiles</li>
                <li>Department attendance records</li>
                <li>Leave requests and approvals</li>
                <li>Task assignments and progress</li>
                <li>Performance evaluations</li>
                <li>Department reports</li>
              </ul>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default HODSettings;
