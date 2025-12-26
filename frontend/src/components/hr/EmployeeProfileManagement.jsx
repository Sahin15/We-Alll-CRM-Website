import { useState, useEffect } from "react";
import { 
  Container, Card, Row, Col, Badge, Button, Form, Modal, 
  Tabs, Tab, Alert, Table, Spinner 
} from "react-bootstrap";
import { 
  FaUserShield, FaEdit, FaKey, 
  FaCrown, FaShieldAlt, FaChartLine, FaUsers, FaProjectDiagram,
  FaCheckCircle, FaSave, FaMapMarkerAlt,
  FaIdCard, FaBriefcase, FaUser, FaHome,
  FaFileUpload, FaDownload, FaEye, FaTrash, FaPlus, FaFileAlt,
  FaUniversity, FaArrowLeft
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import ProfilePictureUpload from "../profile/ProfilePictureUpload";
import ProfilePictureDisplay from "../profile/ProfilePictureDisplay";
import api from "../../services/api";
import toast from "../../utils/toast";
import "../../styles/pages-mobile.css";
import "../../styles/modal-mobile.css";

const EmployeeProfileManagement = () => {
  const { user: currentUser } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentForm, setDocumentForm] = useState({
    file: null,
    description: '',
    category: ''
  });
  const [editMode, setEditMode] = useState({
    personal: false,
    contact: false,
    bank: false,
    job: false
  });
  const [sameAsCurrentAddress, setSameAsCurrentAddress] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Check if current user has permission to edit
  const canEdit = ['admin', 'superadmin', 'hr'].includes(currentUser?.role);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  // Reset sameAsCurrentAddress when edit mode changes
  useEffect(() => {
    if (!editMode.contact) {
      setSameAsCurrentAddress(false);
    }
  }, [editMode.contact]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load user profile');
      navigate('/hr-dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/users/${userId}/documents`);
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };



  const handleProfilePictureUpdate = async () => {
    await fetchUserProfile();
  };

  const handleEditToggle = (section) => {
    if (editMode[section]) {
      handleSectionUpdate(section);
    } else {
      setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
    }
  };

  const handleSectionUpdate = async (section) => {
    try {
      setSaving(true);
      let updateData = {};
      
      if (section === 'personal') {
        updateData = {
          name: document.getElementById('personal-name')?.value || user?.name,
          phone: document.getElementById('personal-phone')?.value || user?.phone,
          dateOfBirth: document.getElementById('personal-dob')?.value || user?.dateOfBirth,
          gender: document.getElementById('personal-gender')?.value || user?.gender,
          bloodGroup: document.getElementById('personal-bloodGroup')?.value || user?.bloodGroup,
          fatherName: document.getElementById('personal-fatherName')?.value || user?.fatherName,
          motherName: document.getElementById('personal-motherName')?.value || user?.motherName,
          maritalStatus: document.getElementById('personal-maritalStatus')?.value || user?.maritalStatus,
          nationality: document.getElementById('personal-nationality')?.value || user?.nationality,
        };
      } else if (section === 'contact') {
        updateData = {
          emergencyContact: {
            ...user?.emergencyContact,
            phone: document.getElementById('contact-emergency')?.value || user?.emergencyContact?.phone
          },
          alternatePhone: document.getElementById('contact-alternatePhone')?.value || user?.alternatePhone,
          currentAddress: {
            street: document.getElementById('current-street')?.value || '',
            city: document.getElementById('current-city')?.value || '',
            state: document.getElementById('current-state')?.value || '',
            pincode: document.getElementById('current-pincode')?.value || '',
            country: document.getElementById('current-country')?.value || 'India',
          },
          permanentAddress: sameAsCurrentAddress ? {
            street: document.getElementById('current-street')?.value || '',
            city: document.getElementById('current-city')?.value || '',
            state: document.getElementById('current-state')?.value || '',
            pincode: document.getElementById('current-pincode')?.value || '',
            country: document.getElementById('current-country')?.value || 'India',
          } : {
            street: document.getElementById('permanent-street')?.value || '',
            city: document.getElementById('permanent-city')?.value || '',
            state: document.getElementById('permanent-state')?.value || '',
            pincode: document.getElementById('permanent-pincode')?.value || '',
            country: document.getElementById('permanent-country')?.value || 'India',
          },
        };
      } else if (section === 'job') {
        updateData = {
          designation: document.getElementById('job-designation')?.value || user?.designation,
          employeeId: document.getElementById('job-employeeId')?.value || user?.employeeId,
          joiningDate: document.getElementById('job-joiningDate')?.value || user?.joiningDate,
          employmentType: document.getElementById('job-employmentType')?.value || user?.employmentType,
          funBadge: document.getElementById('job-funBadge')?.value || user?.funBadge,
        };
      } else if (section === 'bank') {
        updateData = {
          bankDetails: {
            bankName: document.getElementById('bank-name')?.value || user?.bankDetails?.bankName,
            accountNumber: document.getElementById('bank-account')?.value || user?.bankDetails?.accountNumber,
            ifscCode: document.getElementById('bank-ifsc')?.value || user?.bankDetails?.ifscCode,
            accountHolderName: document.getElementById('bank-holder')?.value || user?.bankDetails?.accountHolderName,
            branchName: document.getElementById('bank-branch')?.value || user?.bankDetails?.branchName,
            upiId: document.getElementById('bank-upi')?.value || user?.bankDetails?.upiId,
          },
          governmentIds: {
            ...user?.governmentIds,
            panNumber: document.getElementById('bank-pan')?.value || user?.governmentIds?.panNumber,
            aadhaarNumber: document.getElementById('bank-aadhaar')?.value || user?.governmentIds?.aadhaarNumber,
            uanNumber: document.getElementById('bank-uan')?.value || user?.governmentIds?.uanNumber,
            esicNumber: document.getElementById('bank-esic')?.value || user?.governmentIds?.esicNumber,
          }
        };
      }


      await api.put(`/users/${userId}/profile`, updateData);
      toast.success('Profile updated successfully');
      setEditMode(prev => ({ ...prev, [section]: false }));
      await fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }

      await api.put(`/users/${userId}/reset-password`, {
        newPassword: passwordForm.newPassword
      });
      
      toast.success('Password reset successfully');
      setShowPasswordModal(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDocumentUpload = async () => {
    try {
      if (!documentForm.file || !documentForm.category) {
        toast.error('Please select a file and category');
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('document', documentForm.file);
      formData.append('category', documentForm.category);
      formData.append('description', documentForm.description);

      await api.post(`/users/${userId}/official-documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Document uploaded successfully');
      setShowDocumentModal(false);
      setDocumentForm({ file: null, description: '', category: '' });
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/users/documents/${documentId}`);
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getRoleBadge = (role, funBadge) => {
    const badges = {
      superadmin: { bg: 'danger', icon: <FaCrown />, text: 'Super Administrator' },
      admin: { bg: 'primary', icon: <FaShieldAlt />, text: 'Administrator' },
      hr: { bg: 'info', icon: <FaUsers />, text: 'HR Manager' },
      hod: { bg: 'success', icon: <FaUserShield />, text: 'Head of Department' }
    };
    
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

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading employee profile...</p>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          Employee not found or you don't have permission to view this profile.
        </Alert>
      </Container>
    );
  }

  const badge = getRoleBadge(user.role, user.funBadge);

  // Helper functions for document management
  const getDocumentBadgeColor = (category) => {
    const colors = {
      'personal': 'primary',
      'hr': 'success', 
      'payroll': 'warning',
      'other': 'info',
      'aadhaar': 'primary',
      'pan': 'primary',
      'offer_letter': 'success',
      'salary_slip': 'warning',
      'experience_certificate': 'info'
    };
    return colors[category] || 'secondary';
  };

  const formatDocumentType = (category) => {
    const types = {
      'aadhaar': 'Aadhaar Card',
      'pan': 'PAN Card',
      'passport': 'Passport',
      'driving_license': 'Driving License',
      'education': 'Educational Certificate',
      'bank_details': 'Bank Account Proof',
      'offer_letter': 'Offer Letter',
      'joining_letter': 'Joining Letter',
      'employment_contract': 'Employment Contract',
      'nda': 'Non-Disclosure Agreement',
      'policy_acknowledgment': 'Policy Acknowledgment',
      'salary_slip': 'Salary Slip',
      'increment_letter': 'Increment Letter',
      'bonus_letter': 'Bonus Letter',
      'appraisal_letter': 'Appraisal Letter',
      'promotion_letter': 'Promotion Letter',
      'resignation_letter': 'Resignation Letter',
      'experience_certificate': 'Experience Certificate',
      'relieving_letter': 'Relieving Letter',
      'medical_certificate': 'Medical Certificate',
      'other': 'Other Document'
    };
    return types[category] || category?.replace('_', ' ').toUpperCase() || 'Unknown';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const downloadDocument = (doc) => {
    const url = doc.fileUrl || doc.url || doc.documentUrl;
    if (url) {
      const link = document.createElement('a');
      link.href = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      link.download = doc.originalName;
      link.click();
    } else {
      toast.error('Document URL not found');
    }
  };

  const renderDocumentCategory = (category, documentTypes) => {
    const categoryDocs = documents.filter(doc => 
      documentTypes.some(type => type.key === doc.category)
    );

    return (
      <div>
        {documentTypes.map((docType) => {
          const typeDocs = documents.filter(doc => doc.category === docType.key);
          return (
            <div key={docType.key} className="mb-3 p-2 border rounded">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center">
                  {docType.icon}
                  <span className="ms-2 fw-semibold">{docType.label}</span>
                  {typeDocs.length > 0 && (
                    <Badge bg="success" className="ms-2">{typeDocs.length}</Badge>
                  )}
                </div>
                {canEdit && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      setDocumentForm({ ...documentForm, category: docType.key });
                      setShowDocumentModal(true);
                    }}
                  >
                    <FaPlus />
                  </Button>
                )}
              </div>
              
              {typeDocs.length > 0 ? (
                <div className="small">
                  {typeDocs.map((doc, index) => (
                    <div key={doc._id} className="d-flex justify-content-between align-items-center py-2 px-2 mb-1 bg-light rounded border">
                      <div className="flex-grow-1 me-2">
                        <div className="fw-semibold text-truncate">{doc.originalName}</div>
                        <small className="text-muted">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB') : 'Unknown date'}
                        </small>
                      </div>
                      <div className="d-flex gap-1 flex-shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          className="px-2 py-1"
                          onClick={() => {
                            const url = doc.fileUrl || doc.url || doc.documentUrl;
                            if (url) {
                              // Create full URL for document viewing
                              const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                              window.open(fullUrl, '_blank');
                            } else {
                              console.error('Document data:', doc);
                              toast.error('Document URL not found');
                            }
                          }}
                          title="View Document"
                        >
                          <FaEye />
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="px-2 py-1"
                          onClick={() => downloadDocument(doc)}
                          title="Download Document"
                        >
                          <FaDownload />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="px-2 py-1"
                            onClick={() => handleDocumentDelete(doc._id)}
                            title="Delete Document"
                          >
                            <FaTrash />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <small className="text-muted">No documents uploaded</small>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Container fluid className="mt-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="me-3"
              >
                <FaArrowLeft className="me-2" />
                Back
              </Button>
              <div>
                <h2 className="mb-1">Employee Profile Management</h2>
                <p className="text-muted mb-0">
                  Managing profile for: <strong>{user.name}</strong>
                </p>
              </div>
            </div>
            {canEdit && (
              <Badge bg="success" className="px-3 py-2">
                <FaEdit className="me-2" />
                Edit Access
              </Badge>
            )}
          </div>
        </Col>
      </Row>

      {/* Profile Header Section */}
      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="bg-gradient" style={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '0.5rem'
        }}>
          <Row className="align-items-center">
            {/* Profile Picture */}
            <Col xs={12} sm={6} md={3} lg={2} className="text-center mb-3 mb-sm-0">
              <div className="position-relative d-inline-block">
                <ProfilePictureDisplay
                  profilePicture={user?.profilePicture}
                  userName={user?.name}
                  size={120}
                  showViewButton={true}
                />
              </div>
            </Col>
            
            {/* Profile Info */}
            <Col xs={12} sm={6} md={6} lg={7} className="text-center text-sm-start mb-3 mb-md-0">
              <h3 className="mb-2 fw-bold text-dark">{user?.name}</h3>
              <p className="text-muted mb-2 fs-6">{user?.email}</p>
              <div className="d-flex justify-content-center justify-content-sm-start align-items-center flex-wrap gap-2">
                <Badge bg={badge.bg} className="px-3 py-2 rounded-pill" style={{ fontSize: '0.85rem' }}>
                  {badge.icon}
                  <span className="ms-2">{badge.text}</span>
                </Badge>
                {user?.employeeId && (
                  <Badge bg="secondary" className="px-2 py-1 rounded-pill" style={{ fontSize: '0.75rem' }}>
                    ID: {user.employeeId}
                  </Badge>
                )}
              </div>
            </Col>
            
            {/* Action Buttons */}
            <Col xs={12} md={3} lg={3} className="text-center text-md-end">
              {canEdit && (
                <div className="d-grid d-md-block">
                  <Button 
                    variant="primary" 
                    onClick={() => setShowPasswordModal(true)}
                    className="shadow-sm"
                    style={{ borderRadius: '25px' }}
                  >
                    <FaKey className="me-2" />
                    Reset Password
                  </Button>
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Profile Details Tabs */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
          <h5 className="mb-0 text-dark fw-semibold">
            <FaUserShield className="me-2 text-primary" />
            Employee Profile Details
          </h5>
        </Card.Header>
        <Card.Body className="pt-3">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
            style={{
              borderBottom: '2px solid #e9ecef'
            }}
          >
                  {/* Personal Details Tab */}
                  <Tab eventKey="personal" title={<><FaUser className="me-2" />Personal Details</>}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">Personal Information</h5>
                      {canEdit && (
                        <Button
                          variant={editMode.personal ? "success" : "outline-primary"}
                          size="sm"
                          onClick={() => handleEditToggle('personal')}
                          disabled={saving}
                        >
                          {saving ? (
                            <Spinner size="sm" className="me-2" />
                          ) : editMode.personal ? (
                            <FaSave className="me-2" />
                          ) : (
                            <FaEdit className="me-2" />
                          )}
                          {editMode.personal ? 'Save Changes' : 'Edit'}
                        </Button>
                      )}
                    </div>

                    <Row>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Full Name *</Form.Label>
                          {editMode.personal ? (
                            <Form.Control
                              type="text"
                              defaultValue={user?.name || ''}
                              placeholder="Enter full name"
                              id="personal-name"
                              required
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.name || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Email Address</Form.Label>
                          <div className="form-control-plaintext border rounded p-2 bg-light">
                            {user?.email || '—'}
                          </div>
                          <Form.Text className="text-muted">Email cannot be changed</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Phone Number *</Form.Label>
                          {editMode.personal ? (
                            <Form.Control
                              type="tel"
                              defaultValue={user?.phone || ''}
                              placeholder="+91 1234567890"
                              id="personal-phone"
                              required
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.phone || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Date of Birth</Form.Label>
                          {editMode.personal ? (
                            <Form.Control
                              type="date"
                              defaultValue={user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : ''}
                              id="personal-dob"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB') : '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Gender</Form.Label>
                          {editMode.personal ? (
                            <Form.Select defaultValue={user?.gender || ''} id="personal-gender">
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </Form.Select>
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Blood Group</Form.Label>
                          {editMode.personal ? (
                            <Form.Select defaultValue={user?.bloodGroup || ''} id="personal-bloodGroup">
                              <option value="">Select Blood Group</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </Form.Select>
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.bloodGroup || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Father's Name</Form.Label>
                          {editMode.personal ? (
                            <Form.Control
                              type="text"
                              defaultValue={user?.fatherName || ''}
                              placeholder="Enter father's name"
                              id="personal-fatherName"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.fatherName || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Mother's Name</Form.Label>
                          {editMode.personal ? (
                            <Form.Control
                              type="text"
                              defaultValue={user?.motherName || ''}
                              placeholder="Enter mother's name"
                              id="personal-motherName"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.motherName || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Marital Status</Form.Label>
                          {editMode.personal ? (
                            <Form.Select defaultValue={user?.maritalStatus || ''} id="personal-maritalStatus">
                              <option value="">Select Status</option>
                              <option value="single">Single</option>
                              <option value="married">Married</option>
                              <option value="divorced">Divorced</option>
                              <option value="widowed">Widowed</option>
                            </Form.Select>
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.maritalStatus ? user.maritalStatus.charAt(0).toUpperCase() + user.maritalStatus.slice(1) : '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Nationality</Form.Label>
                          {editMode.personal ? (
                            <Form.Control
                              type="text"
                              defaultValue={user?.nationality || 'Indian'}
                              placeholder="Enter nationality"
                              id="personal-nationality"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.nationality || 'Indian'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                  </Tab>

                  {/* Contact & Address Tab */}
                  <Tab eventKey="contact" title={<><FaHome className="me-2" />Contact & Address</>}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">Contact Information & Address</h5>
                      {canEdit && (
                        <Button
                          variant={editMode.contact ? "success" : "outline-primary"}
                          size="sm"
                          onClick={() => handleEditToggle('contact')}
                          disabled={saving}
                        >
                          {saving ? (
                            <Spinner size="sm" className="me-2" />
                          ) : editMode.contact ? (
                            <FaSave className="me-2" />
                          ) : (
                            <FaEdit className="me-2" />
                          )}
                          {editMode.contact ? 'Save Changes' : 'Edit'}
                        </Button>
                      )}
                    </div>

                    <Row>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Alternate Phone</Form.Label>
                          {editMode.contact ? (
                            <Form.Control
                              type="tel"
                              defaultValue={user?.alternatePhone || ''}
                              placeholder="+91 1234567890"
                              id="contact-alternatePhone"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.alternatePhone || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Emergency Contact</Form.Label>
                          {editMode.contact ? (
                            <Form.Control
                              type="tel"
                              defaultValue={user?.emergencyContact?.phone || ''}
                              placeholder="+91 1234567890"
                              id="contact-emergency"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.emergencyContact?.phone || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>

                      {/* Current Address Section */}
                      <Col xs={12} className="mb-4">
                        <div className="border rounded p-3 bg-light">
                          <h6 className="text-primary mb-3">
                            <FaHome className="me-2" />
                            Current Address
                          </h6>
                          <Row>
                            <Col xs={12} className="mb-3">
                              <Form.Group>
                                <Form.Label>Street Address</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    as="textarea"
                                    rows={2}
                                    defaultValue={user?.currentAddress?.street || ''}
                                    placeholder="Enter street address"
                                    id="current-street"
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.currentAddress?.street || '—'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                              <Form.Group>
                                <Form.Label>City</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    type="text"
                                    defaultValue={user?.currentAddress?.city || ''}
                                    placeholder="Enter city"
                                    id="current-city"
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.currentAddress?.city || '—'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                              <Form.Group>
                                <Form.Label>State</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    type="text"
                                    defaultValue={user?.currentAddress?.state || ''}
                                    placeholder="Enter state"
                                    id="current-state"
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.currentAddress?.state || '—'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                              <Form.Group>
                                <Form.Label>Pincode</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    type="text"
                                    defaultValue={user?.currentAddress?.pincode || ''}
                                    placeholder="Enter pincode"
                                    id="current-pincode"
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.currentAddress?.pincode || '—'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                              <Form.Group>
                                <Form.Label>Country</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    type="text"
                                    defaultValue={user?.currentAddress?.country || 'India'}
                                    placeholder="Enter country"
                                    id="current-country"
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.currentAddress?.country || 'India'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                          </Row>
                        </div>
                      </Col>

                      {/* Permanent Address Section */}
                      <Col xs={12} className="mb-4">
                        <div className="border rounded p-3 bg-light">
                          <h6 className="text-primary mb-3">
                            <FaMapMarkerAlt className="me-2" />
                            Permanent Address
                          </h6>
                          
                          {editMode.contact && (
                            <div className="mb-3">
                              <Form.Check
                                type="checkbox"
                                id="same-as-current"
                                label="Same as Current Address"
                                checked={sameAsCurrentAddress}
                                onChange={(e) => {
                                  setSameAsCurrentAddress(e.target.checked);
                                  if (e.target.checked) {
                                    // Copy current address values to permanent address fields
                                    const currentStreet = document.getElementById('current-street')?.value || '';
                                    const currentCity = document.getElementById('current-city')?.value || '';
                                    const currentState = document.getElementById('current-state')?.value || '';
                                    const currentPincode = document.getElementById('current-pincode')?.value || '';
                                    const currentCountry = document.getElementById('current-country')?.value || '';
                                    
                                    document.getElementById('permanent-street').value = currentStreet;
                                    document.getElementById('permanent-city').value = currentCity;
                                    document.getElementById('permanent-state').value = currentState;
                                    document.getElementById('permanent-pincode').value = currentPincode;
                                    document.getElementById('permanent-country').value = currentCountry;
                                  } else {
                                    // Clear permanent address fields when unchecked
                                    document.getElementById('permanent-street').value = user?.permanentAddress?.street || '';
                                    document.getElementById('permanent-city').value = user?.permanentAddress?.city || '';
                                    document.getElementById('permanent-state').value = user?.permanentAddress?.state || '';
                                    document.getElementById('permanent-pincode').value = user?.permanentAddress?.pincode || '';
                                    document.getElementById('permanent-country').value = user?.permanentAddress?.country || 'India';
                                  }
                                }}
                              />
                            </div>
                          )}
                          
                          <Row>
                            <Col xs={12} className="mb-3">
                              <Form.Group>
                                <Form.Label>Street Address</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    as="textarea"
                                    rows={2}
                                    defaultValue={user?.permanentAddress?.street || ''}
                                    placeholder="Enter street address"
                                    id="permanent-street"
                                    disabled={sameAsCurrentAddress}
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.permanentAddress?.street || '—'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                              <Form.Group>
                                <Form.Label>City</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    type="text"
                                    defaultValue={user?.permanentAddress?.city || ''}
                                    placeholder="Enter city"
                                    id="permanent-city"
                                    disabled={sameAsCurrentAddress}
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.permanentAddress?.city || '—'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                              <Form.Group>
                                <Form.Label>State</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    type="text"
                                    defaultValue={user?.permanentAddress?.state || ''}
                                    placeholder="Enter state"
                                    id="permanent-state"
                                    disabled={sameAsCurrentAddress}
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.permanentAddress?.state || '—'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                              <Form.Group>
                                <Form.Label>Pincode</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    type="text"
                                    defaultValue={user?.permanentAddress?.pincode || ''}
                                    placeholder="Enter pincode"
                                    id="permanent-pincode"
                                    disabled={sameAsCurrentAddress}
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.permanentAddress?.pincode || '—'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                              <Form.Group>
                                <Form.Label>Country</Form.Label>
                                {editMode.contact ? (
                                  <Form.Control
                                    type="text"
                                    defaultValue={user?.permanentAddress?.country || 'India'}
                                    placeholder="Enter country"
                                    id="permanent-country"
                                    disabled={sameAsCurrentAddress}
                                  />
                                ) : (
                                  <div className="form-control-plaintext border rounded p-2 bg-light">
                                    {user?.permanentAddress?.country || 'India'}
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                          </Row>
                        </div>
                      </Col>
                    </Row>
                  </Tab>

                  {/* Job Details Tab */}
                  <Tab eventKey="job" title={<><FaBriefcase className="me-2" />Job Details</>}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">Employment Information</h5>
                      {canEdit && (
                        <Button
                          variant={editMode.job ? "success" : "outline-primary"}
                          size="sm"
                          onClick={() => handleEditToggle('job')}
                          disabled={saving}
                        >
                          {saving ? (
                            <Spinner size="sm" className="me-2" />
                          ) : editMode.job ? (
                            <FaSave className="me-2" />
                          ) : (
                            <FaEdit className="me-2" />
                          )}
                          {editMode.job ? 'Save Changes' : 'Edit'}
                        </Button>
                      )}
                    </div>

                    <Row>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Employee ID</Form.Label>
                          {editMode.job ? (
                            <Form.Control
                              type="text"
                              defaultValue={user?.employeeId || ''}
                              placeholder="Enter employee ID"
                              id="job-employeeId"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.employeeId || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Designation</Form.Label>
                          {editMode.job ? (
                            <Form.Control
                              type="text"
                              defaultValue={user?.designation || ''}
                              placeholder="Enter designation"
                              id="job-designation"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.designation || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Joining Date</Form.Label>
                          {editMode.job ? (
                            <Form.Control
                              type="date"
                              defaultValue={user?.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : ''}
                              id="job-joiningDate"
                            />
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString('en-GB') : '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Employment Type</Form.Label>
                          {editMode.job ? (
                            <Form.Select defaultValue={user?.employmentType || ''} id="job-employmentType">
                              <option value="">Select Type</option>
                              <option value="full-time">Full Time</option>
                              <option value="part-time">Part Time</option>
                              <option value="intern">Intern</option>
                              <option value="freelancer">Freelancer</option>
                              <option value="contract">Contract</option>
                            </Form.Select>
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.employmentType ? user.employmentType.charAt(0).toUpperCase() + user.employmentType.slice(1).replace('-', ' ') : '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Department</Form.Label>
                          <div className="form-control-plaintext border rounded p-2 bg-light">
                            {user?.department?.name || 'Not assigned'}
                          </div>
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Reporting Manager</Form.Label>
                          <div className="form-control-plaintext border rounded p-2 bg-light">
                            {user?.reportingManager?.name || 'Not assigned'}
                          </div>
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Fun Badge</Form.Label>
                          {editMode.job ? (
                            <Form.Select defaultValue={user?.funBadge || ''} id="job-funBadge">
                              <option value="">Select Fun Badge</option>
                              <option value="Team Member">Team Member</option>
                              <option value="Team Player">Team Player</option>
                              <option value="Problem Solver">Problem Solver</option>
                              <option value="Creative Thinker">Creative Thinker</option>
                              <option value="Innovation Champion">Innovation Champion</option>
                              <option value="Mentor">Mentor</option>
                              <option value="Rising Star">Rising Star</option>
                              <option value="Go-Getter">Go-Getter</option>
                              <option value="Tech Guru">Tech Guru</option>
                              <option value="Communication Expert">Communication Expert</option>
                              <option value="Leadership Potential">Leadership Potential</option>
                              <option value="Quality Champion">Quality Champion</option>
                            </Form.Select>
                          ) : (
                            <div className="form-control-plaintext border rounded p-2 bg-light">
                              {user?.funBadge || '—'}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Role</Form.Label>
                          <div className="form-control-plaintext border rounded p-2 bg-light">
                            <Badge bg={getRoleBadge(user?.role).bg} className="px-2 py-1">
                              {getRoleBadge(user?.role).icon}
                              <span className="ms-2">{getRoleBadge(user?.role).text}</span>
                            </Badge>
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Tab>

                  {/* Bank Details Tab */}
                  <Tab eventKey="bank" title={<><FaUniversity className="me-2" />Bank Details</>}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">Banking & Government ID Information</h5>
                      {canEdit && (
                        <Button
                          variant={editMode.bank ? "success" : "outline-primary"}
                          size="sm"
                          onClick={() => handleEditToggle('bank')}
                          disabled={saving}
                        >
                          {saving ? (
                            <Spinner size="sm" className="me-2" />
                          ) : editMode.bank ? (
                            <FaSave className="me-2" />
                          ) : (
                            <FaEdit className="me-2" />
                          )}
                          {editMode.bank ? 'Save Changes' : 'Edit'}
                        </Button>
                      )}
                    </div>

                    <Row>
                      <Col xs={12} className="mb-4">
                        <h6 className="text-primary mb-3">
                          <FaUniversity className="me-2" />
                          Bank Details
                        </h6>
                        <Row>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>Bank Name</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.bankDetails?.bankName || ''}
                                  placeholder="Enter bank name"
                                  id="bank-name"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.bankDetails?.bankName || '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>Account Holder Name</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.bankDetails?.accountHolderName || ''}
                                  placeholder="Enter account holder name"
                                  id="bank-holder"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.bankDetails?.accountHolderName || '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>Account Number</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.bankDetails?.accountNumber || ''}
                                  placeholder="Enter account number"
                                  id="bank-account"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.bankDetails?.accountNumber ? '****' + user.bankDetails.accountNumber.slice(-4) : '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>IFSC Code</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.bankDetails?.ifscCode || ''}
                                  placeholder="Enter IFSC code"
                                  id="bank-ifsc"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.bankDetails?.ifscCode || '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>Branch Name</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.bankDetails?.branchName || ''}
                                  placeholder="Enter branch name"
                                  id="bank-branch"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.bankDetails?.branchName || '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>UPI ID</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.bankDetails?.upiId || ''}
                                  placeholder="Enter UPI ID"
                                  id="bank-upi"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.bankDetails?.upiId || '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                        </Row>
                      </Col>

                      <Col xs={12} className="mb-4">
                        <h6 className="text-primary mb-3">
                          <FaIdCard className="me-2" />
                          Government IDs
                        </h6>
                        <Row>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>PAN Number</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.governmentIds?.panNumber || ''}
                                  placeholder="Enter PAN number"
                                  id="bank-pan"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.governmentIds?.panNumber || '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>Aadhaar Number</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.governmentIds?.aadhaarNumber || ''}
                                  placeholder="Enter Aadhaar number"
                                  id="bank-aadhaar"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.governmentIds?.aadhaarNumber ? '****-****-' + user.governmentIds.aadhaarNumber.slice(-4) : '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>UAN Number</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.governmentIds?.uanNumber || ''}
                                  placeholder="Enter UAN number"
                                  id="bank-uan"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.governmentIds?.uanNumber || '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label>ESIC Number</Form.Label>
                              {editMode.bank ? (
                                <Form.Control
                                  type="text"
                                  defaultValue={user?.governmentIds?.esicNumber || ''}
                                  placeholder="Enter ESIC number"
                                  id="bank-esic"
                                />
                              ) : (
                                <div className="form-control-plaintext border rounded p-2 bg-light">
                                  {user?.governmentIds?.esicNumber || '—'}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Tab>

                  {/* Documents Tab */}
                  <Tab eventKey="documents" title={<><FaFileAlt className="me-2" />Documents</>}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">Document Management</h5>
                      {canEdit && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowDocumentModal(true)}
                        >
                          <FaPlus className="me-2" />
                          Upload Document
                        </Button>
                      )}
                    </div>

                    {/* Document Categories */}
                    <Row className="mb-4">
                      <Col xs={12}>
                        <Alert variant="info">
                          <FaFileAlt className="me-2" />
                          Manage all employee documents including personal documents, HR documents, and official records.
                        </Alert>
                      </Col>
                    </Row>

                    <Row>
                      {/* Personal Documents */}
                      <Col md={6} className="mb-4">
                        <Card className="h-100">
                          <Card.Header className="bg-primary text-white">
                            <h6 className="mb-0">
                              <FaIdCard className="me-2" />
                              Personal Documents
                            </h6>
                          </Card.Header>
                          <Card.Body>
                            {renderDocumentCategory('personal', [
                              { key: 'aadhaar', label: 'Aadhaar Card', icon: <FaIdCard /> },
                              { key: 'pan', label: 'PAN Card', icon: <FaIdCard /> },
                              { key: 'passport', label: 'Passport', icon: <FaIdCard /> },
                              { key: 'driving_license', label: 'Driving License', icon: <FaIdCard /> },
                              { key: 'education', label: 'Educational Certificates', icon: <FaIdCard /> },
                              { key: 'bank_details', label: 'Bank Account Proof', icon: <FaUniversity /> }
                            ])}
                          </Card.Body>
                        </Card>
                      </Col>

                      {/* HR Documents */}
                      <Col md={6} className="mb-4">
                        <Card className="h-100">
                          <Card.Header className="bg-success text-white">
                            <h6 className="mb-0">
                              <FaBriefcase className="me-2" />
                              HR Documents
                            </h6>
                          </Card.Header>
                          <Card.Body>
                            {renderDocumentCategory('hr', [
                              { key: 'offer_letter', label: 'Offer Letter', icon: <FaFileAlt /> },
                              { key: 'joining_letter', label: 'Joining Letter', icon: <FaFileAlt /> },
                              { key: 'employment_contract', label: 'Employment Contract', icon: <FaFileAlt /> },
                              { key: 'nda', label: 'Non-Disclosure Agreement', icon: <FaFileAlt /> },
                              { key: 'policy_acknowledgment', label: 'Policy Acknowledgment', icon: <FaFileAlt /> }
                            ])}
                          </Card.Body>
                        </Card>
                      </Col>

                      {/* Payroll Documents */}
                      <Col md={6} className="mb-4">
                        <Card className="h-100">
                          <Card.Header className="bg-warning text-dark">
                            <h6 className="mb-0">
                              <FaFileAlt className="me-2" />
                              Payroll Documents
                            </h6>
                          </Card.Header>
                          <Card.Body>
                            {renderDocumentCategory('payroll', [
                              { key: 'salary_slip', label: 'Salary Slips', icon: <FaFileAlt /> },
                              { key: 'increment_letter', label: 'Increment Letters', icon: <FaFileAlt /> },
                              { key: 'bonus_letter', label: 'Bonus Letters', icon: <FaFileAlt /> },
                              { key: 'appraisal_letter', label: 'Appraisal Letters', icon: <FaFileAlt /> },
                              { key: 'promotion_letter', label: 'Promotion Letters', icon: <FaFileAlt /> }
                            ])}
                          </Card.Body>
                        </Card>
                      </Col>

                      {/* Other Documents */}
                      <Col md={6} className="mb-4">
                        <Card className="h-100">
                          <Card.Header className="bg-info text-white">
                            <h6 className="mb-0">
                              <FaFileAlt className="me-2" />
                              Other Documents
                            </h6>
                          </Card.Header>
                          <Card.Body>
                            {renderDocumentCategory('other', [
                              { key: 'resignation_letter', label: 'Resignation Letter', icon: <FaFileAlt /> },
                              { key: 'experience_certificate', label: 'Experience Certificate', icon: <FaFileAlt /> },
                              { key: 'relieving_letter', label: 'Relieving Letter', icon: <FaFileAlt /> },
                              { key: 'medical_certificate', label: 'Medical Certificates', icon: <FaFileAlt /> },
                              { key: 'other', label: 'Miscellaneous', icon: <FaFileAlt /> }
                            ])}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* All Documents Table */}
                    <Row>
                      <Col xs={12}>
                        <Card>
                          <Card.Header>
                            <h6 className="mb-0">All Documents ({documents.length})</h6>
                          </Card.Header>
                          <Card.Body>
                            {documents.length > 0 ? (
                              <Table responsive>
                                <thead>
                                  <tr>
                                    <th>Document Type</th>
                                    <th>File Name</th>
                                    <th>Upload Date</th>
                                    <th>Size</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {documents.map((doc) => (
                                    <tr key={doc._id}>
                                      <td>
                                        <Badge bg={getDocumentBadgeColor(doc.category)}>
                                          {formatDocumentType(doc.category)}
                                        </Badge>
                                      </td>
                                      <td>{doc.originalName}</td>
                                      <td>{new Date(doc.uploadedAt).toLocaleDateString('en-GB')}</td>
                                      <td>{formatFileSize(doc.fileSize)}</td>
                                      <td>
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          className="me-2"
                                          onClick={() => {
                                            const url = doc.fileUrl || doc.url || doc.documentUrl;
                                            if (url) {
                                              // Create full URL for document viewing
                                              const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                                              window.open(fullUrl, '_blank');
                                            } else {
                                              console.error('Document data:', doc);
                                              toast.error('Document URL not found');
                                            }
                                          }}
                                          title="View Document"
                                        >
                                          <FaEye />
                                        </Button>
                                        <Button
                                          variant="outline-success"
                                          size="sm"
                                          className="me-2"
                                          onClick={() => downloadDocument(doc)}
                                          title="Download Document"
                                        >
                                          <FaDownload />
                                        </Button>
                                        {canEdit && (
                                          <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleDocumentDelete(doc._id)}
                                          >
                                            <FaTrash />
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            ) : (
                              <div className="text-center py-4">
                                <FaFileAlt size={48} className="text-muted mb-3" />
                                <p className="text-muted">No documents uploaded yet</p>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Document Upload Modal */}
      <Modal show={showDocumentModal} onHide={() => setShowDocumentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload Official Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Document Category</Form.Label>
              <Form.Select
                value={documentForm.category}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Select Category</option>
                <optgroup label="Personal Documents">
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                  <option value="education">Educational Certificate</option>
                  <option value="bank_details">Bank Account Proof</option>
                </optgroup>
                <optgroup label="HR Documents">
                  <option value="offer_letter">Offer Letter</option>
                  <option value="joining_letter">Joining Letter</option>
                  <option value="employment_contract">Employment Contract</option>
                  <option value="nda">Non-Disclosure Agreement</option>
                  <option value="policy_acknowledgment">Policy Acknowledgment</option>
                </optgroup>
                <optgroup label="Payroll Documents">
                  <option value="salary_slip">Salary Slip</option>
                  <option value="increment_letter">Increment Letter</option>
                  <option value="bonus_letter">Bonus Letter</option>
                  <option value="appraisal_letter">Appraisal Letter</option>
                  <option value="promotion_letter">Promotion Letter</option>
                </optgroup>
                <optgroup label="Other Documents">
                  <option value="resignation_letter">Resignation Letter</option>
                  <option value="experience_certificate">Experience Certificate</option>
                  <option value="relieving_letter">Relieving Letter</option>
                  <option value="medical_certificate">Medical Certificate</option>
                  <option value="other">Miscellaneous</option>
                </optgroup>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Document File</Form.Label>
              <Form.Control
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setDocumentForm(prev => ({ ...prev, file: e.target.files[0] }))}
              />
              <Form.Text className="text-muted">
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter document description"
                value={documentForm.description}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDocumentModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleDocumentUpload}
            disabled={uploading || !documentForm.file || !documentForm.category}
          >
            {uploading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              <>
                <FaFileUpload className="me-2" />
                Upload Document
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Password Reset Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reset Employee Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter new password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handlePasswordReset}>
            Reset Password
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmployeeProfileManagement;