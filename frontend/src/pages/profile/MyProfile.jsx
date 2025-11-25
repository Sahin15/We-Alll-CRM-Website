import { useState, useEffect } from "react";
import { Container, Card, Row, Col, Badge, Button, Form, Modal, ListGroup } from "react-bootstrap";
import { 
  FaUserShield, FaEnvelope, FaPhone, FaCalendar, FaEdit, FaKey, 
  FaCrown, FaShieldAlt, FaChartLine, FaUsers, FaProjectDiagram,
  FaClock, FaCheckCircle, FaSave
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import ProfilePictureUpload from "../../components/profile/ProfilePictureUpload";
import api from "../../services/api";
import toast from "../../utils/toast";
import "../../styles/pages-mobile.css";
import "../../styles/modal-mobile.css";

const MyProfile = () => {
  const { user, refreshUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    systemUptime: '99.9%'
  });
  
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      });
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        api.get('/users'),
        api.get('/projects')
      ]);
      
      setStats({
        totalUsers: usersRes.data?.length || 0,
        totalProjects: projectsRes.data?.length || 0,
        activeProjects: projectsRes.data?.filter(p => p.status === 'active' || p.status === 'in-progress').length || 0,
        systemUptime: '99.9%'
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleProfilePictureUpdate = async () => {
    await refreshUser();
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/users/profile', editForm);
      toast.success('Profile updated successfully');
      setShowEditModal(false);
      await refreshUser();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      await api.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role, funBadge) => {
    const badges = {
      superadmin: { bg: 'danger', icon: <FaCrown />, text: 'Super Administrator' },
      admin: { bg: 'primary', icon: <FaShieldAlt />, text: 'Administrator' },
      hr: { bg: 'info', icon: <FaUsers />, text: 'HR Manager' },
      hod: { bg: 'success', icon: <FaUserShield />, text: 'Head of Department' }
    };
    
    // For employees, use their fun badge
    if (role === 'employee') {
      const funBadgeIcons = {
        'Team Member': { bg: 'primary', icon: <FaUserShield /> },
        'Contributor': { bg: 'success', icon: <FaCheckCircle /> },
        'Team Player': { bg: 'info', icon: <FaUsers /> },
        'Rockstar': { bg: 'warning', icon: <FaCrown /> },
        'Rising Star': { bg: 'danger', icon: <FaChartLine /> },
        'Go-Getter': { bg: 'dark', icon: <FaProjectDiagram /> }
      };
      
      const badgeInfo = funBadgeIcons[funBadge] || funBadgeIcons['Team Member'];
      return { ...badgeInfo, text: funBadge || 'Team Member' };
    }
    
    return badges[role] || { bg: 'secondary', icon: <FaUserShield />, text: role };
  };

  const roleBadge = getRoleBadge(user?.role, user?.funBadge);

  return (
    <Container fluid className="py-4">
      {/* Header Banner */}
      <Card className="border-0 shadow-sm mb-4 profile-header-banner" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col xs={12} md={8} className="mb-3 mb-md-0">
              <div className="d-flex align-items-center">
                {roleBadge.icon && <span className="me-3" style={{ fontSize: '2.5rem' }}>{roleBadge.icon}</span>}
                <div>
                  <h2 className="mb-1 text-white">{roleBadge.text}</h2>
                  <p className="mb-0 opacity-75">System Access & Management Portal</p>
                </div>
              </div>
            </Col>
            <Col xs={12} md={4} className="text-md-end">
              <Badge bg="light" text="dark" className="px-3 py-2">
                <FaCheckCircle className="me-2" />
                Active Session
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row>
        {/* Left Column - Profile Card */}
        <Col xs={12} lg={4} className="mb-4 mb-lg-0">
          <Card className="border-0 shadow-sm mb-4 profile-info-card">
            <Card.Body className="text-center p-4">
              <div className="position-relative d-inline-block mb-3 profile-picture-section">
                <ProfilePictureUpload
                  currentImage={user?.profilePicture}
                  onUploadSuccess={handleProfilePictureUpdate}
                />
                <Badge 
                  bg={roleBadge.bg} 
                  className="position-absolute bottom-0 end-0"
                  style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                >
                  {roleBadge.icon}
                </Badge>
              </div>
              
              <h4 className="mb-1">{user?.name}</h4>
              <p className="text-muted mb-3">{user?.email}</p>
              
              <Badge bg={roleBadge.bg} className="px-3 py-2 mb-3" style={{ fontSize: '0.9rem' }}>
                {roleBadge.icon} {roleBadge.text}
              </Badge>

              <div className="d-grid gap-2 mt-4 profile-actions">
                <Button variant="primary" onClick={() => setShowEditModal(true)}>
                  <FaEdit className="me-2" />
                  Edit Profile
                </Button>
                <Button variant="outline-secondary" onClick={() => setShowPasswordModal(true)}>
                  <FaKey className="me-2" />
                  Change Password
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h6 className="mb-0">
                <FaChartLine className="me-2 text-primary" />
                System Overview
              </h6>
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item className="d-flex justify-content-between align-items-center">
                <span><FaUsers className="me-2 text-primary" />Total Users</span>
                <Badge bg="primary" pill>{stats.totalUsers}</Badge>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between align-items-center">
                <span><FaProjectDiagram className="me-2 text-success" />Total Projects</span>
                <Badge bg="success" pill>{stats.totalProjects}</Badge>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between align-items-center">
                <span><FaCheckCircle className="me-2 text-info" />Active Projects</span>
                <Badge bg="info" pill>{stats.activeProjects}</Badge>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between align-items-center">
                <span><FaClock className="me-2 text-warning" />System Uptime</span>
                <Badge bg="warning" text="dark" pill>{stats.systemUptime}</Badge>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>

        {/* Right Column - Details */}
        <Col lg={8}>
          {/* Personal Information */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <FaUserShield className="me-2 text-primary" />
                Personal Information
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Row>
                <Col md={6} className="mb-4">
                  <div className="d-flex align-items-start">
                    <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                      <FaUserShield className="text-primary fs-5" />
                    </div>
                    <div>
                      <small className="text-muted d-block mb-1">Full Name</small>
                      <strong>{user?.name || 'N/A'}</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6} className="mb-4">
                  <div className="d-flex align-items-start">
                    <div className="bg-info bg-opacity-10 p-3 rounded me-3">
                      <FaEnvelope className="text-info fs-5" />
                    </div>
                    <div>
                      <small className="text-muted d-block mb-1">Email Address</small>
                      <strong>{user?.email || 'N/A'}</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6} className="mb-4">
                  <div className="d-flex align-items-start">
                    <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                      <FaPhone className="text-success fs-5" />
                    </div>
                    <div>
                      <small className="text-muted d-block mb-1">Phone Number</small>
                      <strong>{user?.phone || 'Not provided'}</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6} className="mb-4">
                  <div className="d-flex align-items-start">
                    <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                      <FaCalendar className="text-warning fs-5" />
                    </div>
                    <div>
                      <small className="text-muted d-block mb-1">Member Since</small>
                      <strong>
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric'
                        }) : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Access & Permissions */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <FaShieldAlt className="me-2 text-success" />
                Access & Permissions
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="alert alert-success border-0 mb-3">
                <FaCheckCircle className="me-2" />
                <strong>Full System Access Granted</strong>
              </div>
              
              <h6 className="mb-3">Your Privileges Include:</h6>
              <Row>
                <Col md={6}>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <FaCheckCircle className="text-success me-2" />
                      User Management
                    </li>
                    <li className="mb-2">
                      <FaCheckCircle className="text-success me-2" />
                      Project Oversight
                    </li>
                    <li className="mb-2">
                      <FaCheckCircle className="text-success me-2" />
                      Financial Reports
                    </li>
                    <li className="mb-2">
                      <FaCheckCircle className="text-success me-2" />
                      System Configuration
                    </li>
                  </ul>
                </Col>
                <Col md={6}>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <FaCheckCircle className="text-success me-2" />
                      Department Management
                    </li>
                    <li className="mb-2">
                      <FaCheckCircle className="text-success me-2" />
                      Attendance & Leave Approval
                    </li>
                    <li className="mb-2">
                      <FaCheckCircle className="text-success me-2" />
                      Client Management
                    </li>
                    <li className="mb-2">
                      <FaCheckCircle className="text-success me-2" />
                      Analytics & Insights
                    </li>
                  </ul>
                </Col>
              </Row>

              {user?.role === 'superadmin' && (
                <div className="alert alert-danger border-0 mt-3 mb-0">
                  <FaCrown className="me-2" />
                  <strong>SuperAdmin Status:</strong> You have unrestricted access to all system features and cannot be deleted or demoted.
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Edit Profile Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered className="edit-profile-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEdit className="me-2" />
            Edit Profile
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditProfile}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                disabled
                className="bg-light"
              />
              <Form.Text className="text-muted">Email cannot be changed</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+91 1234567890"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex flex-column flex-sm-row gap-2 w-100">
              <Button variant="secondary" onClick={() => setShowEditModal(false)} className="w-mobile-100">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving} className="w-mobile-100">
                {saving ? 'Saving...' : <><FaSave className="me-2" />Save Changes</>}
              </Button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered className="change-password-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaKey className="me-2" />
            Change Password
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleChangePassword}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
              <Form.Text className="text-muted">Minimum 6 characters</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex flex-column flex-sm-row gap-2 w-100">
              <Button variant="secondary" onClick={() => setShowPasswordModal(false)} className="w-mobile-100">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving} className="w-mobile-100">
                {saving ? 'Changing...' : <><FaKey className="me-2" />Change Password</>}
              </Button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default MyProfile;
