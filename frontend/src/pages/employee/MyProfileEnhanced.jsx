import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Tab, Tabs, Alert, Modal } from 'react-bootstrap';
import { FaSave, FaLock, FaTrash, FaEye, FaTimes } from 'react-icons/fa';
import toast from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MyProfileEnhanced = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isCriticalInfoLocked, setIsCriticalInfoLocked] = useState(false);
  const [profile, setProfile] = useState({
    // Basic Information
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    profilePicture: '',
    
    // Job Details
    employeeId: '',
    designation: '',
    department: '',
    role: '',
    joiningDate: '',
    employmentType: '',
    reportingManager: '',
    
    // Address Details
    currentAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    permanentAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    
    // Emergency Contact
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
      address: '',
    },
    
    // Government IDs
    governmentIds: {
      aadhaarNumber: '',
      panNumber: '',
      uanNumber: '',
      esicNumber: '',
    },
    
    // Banking Details
    bankDetails: {
      accountNumber: '',
      accountHolderName: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      upiId: '',
    },
    
    // Documents
    documents: {
      aadhaarDoc: '',
      panDoc: '',
      offerLetter: '',
      agreement: '',
      salarySlips: [],
      experienceCertificates: [],
      other: [],
    },
    
    notes: '',
    status: 'active',
  });

  useEffect(() => {
    fetchProfile();
    checkEditPermission();
  }, []);

  const checkEditPermission = () => {
    // HR, Admin, SuperAdmin can always edit
    if (['hr', 'admin', 'superadmin'].includes(user?.role)) {
      setCanEdit(true);
    } else {
      // Employee can only edit if profile is not complete
      setCanEdit(!isProfileComplete);
    }
  };

  const checkCriticalInfoLock = (userData) => {
    // Check if critical info (bank details or government IDs) has been filled
    const hasBankDetails = !!(
      userData.bankDetails?.accountNumber ||
      userData.bankDetails?.ifscCode
    );
    const hasGovIds = !!(
      userData.governmentIds?.panNumber ||
      userData.governmentIds?.aadhaarNumber
    );
    
    // Lock if employee has filled critical info
    if (user?.role === 'employee' && (hasBankDetails || hasGovIds)) {
      setIsCriticalInfoLocked(true);
    } else if (['hr', 'admin', 'superadmin'].includes(user?.role)) {
      // HR/Admin can always edit
      setIsCriticalInfoLocked(false);
    }
  };

  useEffect(() => {
    checkEditPermission();
  }, [isProfileComplete, user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me');
      const userData = response.data.user;
      
      if (!userData) {
        toast.error('No user data received');
        return;
      }
      
      const profileData = {
        name: userData.name || '',
        phone: userData.phone || '',
        email: userData.email || '',
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : '',
        gender: userData.gender || '',
        bloodGroup: userData.bloodGroup || '',
        profilePicture: userData.profilePicture || '',
        
        employeeId: userData.employeeId || '',
        designation: userData.designation || userData.position || '',
        department: userData.department?.name || '',
        role: userData.role || '',
        joiningDate: userData.joiningDate ? new Date(userData.joiningDate).toISOString().split('T')[0] : '',
        employmentType: userData.employmentType || '',
        reportingManager: userData.reportingManager?.name || userData.manager?.name || '',
        
        currentAddress: userData.currentAddress || { street: '', city: '', state: '', pincode: '', country: 'India' },
        permanentAddress: userData.permanentAddress || { street: '', city: '', state: '', pincode: '', country: 'India' },
        
        emergencyContact: userData.emergencyContact || { name: '', phone: '', relationship: '', address: '' },
        
        governmentIds: userData.governmentIds || { aadhaarNumber: '', panNumber: '', uanNumber: '', esicNumber: '' },
        
        bankDetails: userData.bankDetails || { accountNumber: '', accountHolderName: '', ifscCode: '', bankName: '', branchName: '', upiId: '' },
        
        documents: userData.documents || { aadhaarDoc: '', panDoc: '', offerLetter: '', agreement: '', salarySlips: [], experienceCertificates: [], other: [] },
        
        notes: userData.notes || '',
        status: userData.status || 'active',
      };
      
      setProfile(profileData);
      
      // Check if profile is complete (has basic required fields filled)
      const isComplete = !!(
        userData.phone &&
        userData.dateOfBirth &&
        userData.gender &&
        userData.currentAddress?.city &&
        userData.emergencyContact?.name &&
        userData.emergencyContact?.phone
      );
      
      setIsProfileComplete(isComplete);
      checkCriticalInfoLock(userData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBasicInfoUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/users/profile', {
        name: profile.name,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        bloodGroup: profile.bloodGroup,
      });
      toast.success('Basic information updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddressUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/users/profile', {
        currentAddress: profile.currentAddress,
        permanentAddress: profile.permanentAddress,
      });
      toast.success('Address updated successfully');
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyContactUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/users/profile', {
        emergencyContact: profile.emergencyContact,
      });
      toast.success('Emergency contact updated successfully');
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      toast.error('Failed to update emergency contact');
    } finally {
      setSaving(false);
    }
  };

  const handleGovernmentIdsUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/users/profile', {
        governmentIds: profile.governmentIds,
      });
      toast.success('Government IDs updated successfully');
    } catch (error) {
      console.error('Error updating government IDs:', error);
      toast.error('Failed to update government IDs');
    } finally {
      setSaving(false);
    }
  };

  const handleBankDetailsUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/users/profile', {
        bankDetails: profile.bankDetails,
      });
      toast.success('Bank details updated successfully');
    } catch (error) {
      console.error('Error updating bank details:', error);
      toast.error('Failed to update bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (documentType, file) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, and DOC files are allowed');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const response = await api.post('/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update profile state with new document URL
      setProfile(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: response.data.documentUrl,
        },
      }));

      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentDelete = async (documentType, documentUrl) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete('/upload/document', {
        data: { documentUrl, documentType },
      });

      // Update profile state to remove document
      setProfile(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: '',
        },
      }));

      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setSaving(false);
    }
  };

  const copyPermanentAddress = () => {
    setProfile({
      ...profile,
      permanentAddress: { ...profile.currentAddress },
    });
    toast.info('Permanent address copied from current address');
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/upload/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfile({
        ...profile,
        profilePicture: response.data.imageUrl,
      });

      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!window.confirm('Are you sure you want to delete your profile picture?')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete('/upload/profile-picture');
      
      setProfile({
        ...profile,
        profilePicture: '',
      });

      toast.success('Profile picture deleted successfully');
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      toast.error('Failed to delete profile picture');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <div className="spinner-border text-primary" />
        <p className="mt-3">Loading profile...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>My Profile</h2>
          <p className="text-muted">Manage your personal and professional information</p>
        </Col>
      </Row>

      {/* Edit Permission Notice */}
      {!canEdit && user?.role === 'employee' && (
        <Alert variant="info" className="mb-4">
          <FaLock className="me-2" />
          <strong>Profile Locked:</strong> Your profile has been completed and is now read-only. 
          Please contact HR if you need to make any changes.
        </Alert>
      )}

      {canEdit && user?.role === 'employee' && !isProfileComplete && (
        <Alert variant="warning" className="mb-4">
          <strong>Complete Your Profile:</strong> Please fill in all required information. 
          Once saved, you'll need to contact HR for any future changes.
        </Alert>
      )}

      {isCriticalInfoLocked && user?.role === 'employee' && (
        <Alert variant="info" className="mb-4">
          <FaLock className="me-2" />
          <strong>Critical Information Protected:</strong> Bank details and Government IDs are locked for security. 
          Contact HR if you need to update these details.
        </Alert>
      )}

      {/* Profile Picture Section */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={3} className="text-center">
              <div className="position-relative d-inline-block">
                {profile.profilePicture ? (
                  <>
                    <img
                      src={profile.profilePicture}
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: '150px', height: '150px', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => setShowPhotoModal(true)}
                    />
                    <Button
                      variant="light"
                      size="sm"
                      className="position-absolute top-0 end-0 rounded-circle"
                      style={{ width: '35px', height: '35px' }}
                      onClick={() => setShowPhotoModal(true)}
                      title="View Photo"
                    >
                      <FaEye />
                    </Button>
                  </>
                ) : (
                  <div
                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                    style={{ width: '150px', height: '150px' }}
                  >
                    <span className="text-white" style={{ fontSize: '48px' }}>
                      {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                )}
              </div>
            </Col>
            <Col md={9}>
              <h4>{profile.name}</h4>
              <p className="text-muted mb-2">{profile.email}</p>
              <p className="text-muted mb-3">
                {profile.designation} {profile.department && `• ${profile.department}`}
              </p>
              <div>
                <input
                  type="file"
                  id="profilePictureInput"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  style={{ display: 'none' }}
                  disabled={saving}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => document.getElementById('profilePictureInput').click()}
                  disabled={saving}
                  className="me-2"
                >
                  {saving ? 'Uploading...' : profile.profilePicture ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {profile.profilePicture && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleDeleteProfilePicture}
                    disabled={saving}
                  >
                    <FaTrash className="me-1" />
                    Delete Photo
                  </Button>
                )}
                <div className="mt-2">
                  <small className="text-muted">
                    JPG, PNG or GIF. Max size 5MB
                  </small>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Photo View Modal */}
      <Modal show={showPhotoModal} onHide={() => setShowPhotoModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title>Profile Picture</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4">
          {profile.profilePicture && (
            <img
              src={profile.profilePicture}
              alt="Profile Large"
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={() => setShowPhotoModal(false)}>
            <FaTimes className="me-2" />
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* Basic Information Tab */}
        <Tab eventKey="basic" title="Basic Information">
          <Card>
            <Card.Body>
              <Form onSubmit={handleBasicInfoUpdate}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name *</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        required
                        disabled={!canEdit}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        value={profile.email}
                        disabled
                        readOnly
                      />
                      <Form.Text className="text-muted">Email cannot be changed</Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth</Form.Label>
                      <Form.Control
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender</Form.Label>
                      <Form.Select
                        value={profile.gender}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Blood Group</Form.Label>
                      <Form.Select
                        value={profile.bloodGroup}
                        onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                      >
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
                    </Form.Group>
                  </Col>
                </Row>

                {canEdit && (
                  <Button type="submit" variant="primary" disabled={saving}>
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        {/* Job Details Tab */}
        <Tab eventKey="job" title="Job Details">
          <Card>
            <Card.Body>
              {user?.role === 'employee' && (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  Job details are managed by HR and cannot be modified by employees.
                </Alert>
              )}
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Employee ID</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.employeeId} 
                      disabled={user?.role === 'employee'} 
                      readOnly={user?.role === 'employee'}
                      onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Designation</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.designation} 
                      disabled={user?.role === 'employee'} 
                      readOnly={user?.role === 'employee'}
                      onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Department</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.department} 
                      disabled={user?.role === 'employee'} 
                      readOnly={user?.role === 'employee'}
                      onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Role</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.role} 
                      disabled 
                      readOnly
                    />
                    <Form.Text className="text-muted">Role cannot be changed from profile</Form.Text>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Joining</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={profile.joiningDate} 
                      disabled={user?.role === 'employee'} 
                      readOnly={user?.role === 'employee'}
                      onChange={(e) => setProfile({ ...profile, joiningDate: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Employment Type</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.employmentType} 
                      disabled={user?.role === 'employee'} 
                      readOnly={user?.role === 'employee'}
                      onChange={(e) => setProfile({ ...profile, employmentType: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Reporting Manager</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.reportingManager} 
                      disabled={user?.role === 'employee'} 
                      readOnly={user?.role === 'employee'}
                      onChange={(e) => setProfile({ ...profile, reportingManager: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {['hr', 'admin', 'superadmin'].includes(user?.role) && (
                <div className="mt-3">
                  <Button type="button" variant="primary" onClick={handleBasicInfoUpdate} disabled={saving}>
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save Job Details'}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Address Details Tab */}
        <Tab eventKey="address" title="Address Details">
          <Card>
            <Card.Body>
              <Form onSubmit={handleAddressUpdate}>
                <h5 className="mb-3">Current Address</h5>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Street Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={profile.currentAddress.street}
                        onChange={(e) => setProfile({
                          ...profile,
                          currentAddress: { ...profile.currentAddress, street: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>City</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.currentAddress.city}
                        onChange={(e) => setProfile({
                          ...profile,
                          currentAddress: { ...profile.currentAddress, city: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>State</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.currentAddress.state}
                        onChange={(e) => setProfile({
                          ...profile,
                          currentAddress: { ...profile.currentAddress, state: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pincode</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.currentAddress.pincode}
                        onChange={(e) => setProfile({
                          ...profile,
                          currentAddress: { ...profile.currentAddress, pincode: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.currentAddress.country}
                        onChange={(e) => setProfile({
                          ...profile,
                          currentAddress: { ...profile.currentAddress, country: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr className="my-4" />

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Permanent Address</h5>
                  <Button variant="outline-secondary" size="sm" onClick={copyPermanentAddress}>
                    Same as Current Address
                  </Button>
                </div>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Street Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={profile.permanentAddress.street}
                        onChange={(e) => setProfile({
                          ...profile,
                          permanentAddress: { ...profile.permanentAddress, street: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>City</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.permanentAddress.city}
                        onChange={(e) => setProfile({
                          ...profile,
                          permanentAddress: { ...profile.permanentAddress, city: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>State</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.permanentAddress.state}
                        onChange={(e) => setProfile({
                          ...profile,
                          permanentAddress: { ...profile.permanentAddress, state: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pincode</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.permanentAddress.pincode}
                        onChange={(e) => setProfile({
                          ...profile,
                          permanentAddress: { ...profile.permanentAddress, pincode: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.permanentAddress.country}
                        onChange={(e) => setProfile({
                          ...profile,
                          permanentAddress: { ...profile.permanentAddress, country: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {canEdit && (
                  <Button type="submit" variant="primary" disabled={saving}>
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save Address'}
                  </Button>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        {/* Emergency Contact Tab */}
        <Tab eventKey="emergency" title="Emergency Contact">
          <Card>
            <Card.Body>
              <Form onSubmit={handleEmergencyContactUpdate}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contact Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.emergencyContact.name}
                        onChange={(e) => setProfile({
                          ...profile,
                          emergencyContact: { ...profile.emergencyContact, name: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contact Number</Form.Label>
                      <Form.Control
                        type="tel"
                        value={profile.emergencyContact.phone}
                        onChange={(e) => setProfile({
                          ...profile,
                          emergencyContact: { ...profile.emergencyContact, phone: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Relationship</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.emergencyContact.relationship}
                        onChange={(e) => setProfile({
                          ...profile,
                          emergencyContact: { ...profile.emergencyContact, relationship: e.target.value }
                        })}
                        placeholder="e.g., Spouse, Parent, Sibling"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={profile.emergencyContact.address}
                        onChange={(e) => setProfile({
                          ...profile,
                          emergencyContact: { ...profile.emergencyContact, address: e.target.value }
                        })}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {canEdit && (
                  <Button type="submit" variant="primary" disabled={saving}>
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save Emergency Contact'}
                  </Button>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        {/* Government IDs Tab */}
        <Tab eventKey="government-ids" title="Government IDs">
          <Card>
            <Card.Body>
              <Form onSubmit={handleGovernmentIdsUpdate}>
                <Alert variant="warning" className="mb-4">
                  <i className="bi bi-shield-lock me-2"></i>
                  Your government ID information is encrypted and secure. Only you and authorized HR personnel can view this information.
                </Alert>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Aadhaar Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.governmentIds.aadhaarNumber}
                        onChange={(e) => setProfile({
                          ...profile,
                          governmentIds: { ...profile.governmentIds, aadhaarNumber: e.target.value }
                        })}
                        placeholder="XXXX XXXX XXXX"
                        maxLength="12"
                      />
                      <Form.Text className="text-muted">12-digit Aadhaar number</Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>PAN Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.governmentIds.panNumber}
                        onChange={(e) => setProfile({
                          ...profile,
                          governmentIds: { ...profile.governmentIds, panNumber: e.target.value.toUpperCase() }
                        })}
                        placeholder="ABCDE1234F"
                        maxLength="10"
                        style={{ textTransform: 'uppercase' }}
                      />
                      <Form.Text className="text-muted">10-character PAN number</Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>UAN Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.governmentIds.uanNumber}
                        onChange={(e) => setProfile({
                          ...profile,
                          governmentIds: { ...profile.governmentIds, uanNumber: e.target.value }
                        })}
                        placeholder="Universal Account Number"
                        maxLength="12"
                      />
                      <Form.Text className="text-muted">12-digit UAN for PF</Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>ESIC Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.governmentIds.esicNumber}
                        onChange={(e) => setProfile({
                          ...profile,
                          governmentIds: { ...profile.governmentIds, esicNumber: e.target.value }
                        })}
                        placeholder="Employee State Insurance Number"
                      />
                      <Form.Text className="text-muted">ESIC registration number</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {canEdit && (
                  <Button type="submit" variant="primary" disabled={saving}>
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save Government IDs'}
                  </Button>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        {/* Banking Details Tab */}
        <Tab eventKey="banking" title="Banking Details">
          <Card>
            <Card.Body>
              <Form onSubmit={handleBankDetailsUpdate}>
                <Alert variant="warning" className="mb-4">
                  <i className="bi bi-shield-lock me-2"></i>
                  Your banking information is encrypted and secure. This information is used for salary payments.
                </Alert>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Account Holder Name *</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.bankDetails.accountHolderName}
                        onChange={(e) => setProfile({
                          ...profile,
                          bankDetails: { ...profile.bankDetails, accountHolderName: e.target.value }
                        })}
                        placeholder="As per bank records"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Account Number *</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.bankDetails.accountNumber}
                        onChange={(e) => setProfile({
                          ...profile,
                          bankDetails: { ...profile.bankDetails, accountNumber: e.target.value }
                        })}
                        placeholder="Bank account number"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>IFSC Code *</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.bankDetails.ifscCode}
                        onChange={(e) => setProfile({
                          ...profile,
                          bankDetails: { ...profile.bankDetails, ifscCode: e.target.value.toUpperCase() }
                        })}
                        placeholder="ABCD0123456"
                        maxLength="11"
                        style={{ textTransform: 'uppercase' }}
                      />
                      <Form.Text className="text-muted">11-character IFSC code</Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Bank Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.bankDetails.bankName}
                        onChange={(e) => setProfile({
                          ...profile,
                          bankDetails: { ...profile.bankDetails, bankName: e.target.value }
                        })}
                        placeholder="e.g., State Bank of India"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Branch Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.bankDetails.branchName}
                        onChange={(e) => setProfile({
                          ...profile,
                          bankDetails: { ...profile.bankDetails, branchName: e.target.value }
                        })}
                        placeholder="Branch location"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>UPI ID (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.bankDetails.upiId}
                        onChange={(e) => setProfile({
                          ...profile,
                          bankDetails: { ...profile.bankDetails, upiId: e.target.value }
                        })}
                        placeholder="yourname@upi"
                      />
                      <Form.Text className="text-muted">For quick payments</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {canEdit && (
                  <Button type="submit" variant="primary" disabled={saving}>
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save Banking Details'}
                  </Button>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        {/* Documents Tab */}
        <Tab eventKey="documents" title="Documents">
          <Card>
            <Card.Body>
              <Alert variant="info" className="mb-4">
                <i className="bi bi-info-circle me-2"></i>
                Upload your important documents here. Supported formats: PDF, JPG, PNG, DOC. Max size: 5MB per file.
              </Alert>
              
              <h5 className="mb-3">Identity Documents</h5>
              <Row className="mb-4">
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Body>
                      <h6 className="mb-3">Aadhaar Card</h6>
                      {profile.documents.aadhaarDoc ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <a href={profile.documents.aadhaarDoc} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                              View Document
                            </a>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleDocumentDelete('aadhaarDoc', profile.documents.aadhaarDoc)}
                              disabled={saving}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Form.Group>
                          <Form.Control
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleDocumentUpload('aadhaarDoc', e.target.files[0])}
                            disabled={saving}
                          />
                          <Form.Text className="text-muted">Upload Aadhaar card copy</Form.Text>
                        </Form.Group>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Body>
                      <h6 className="mb-3">PAN Card</h6>
                      {profile.documents.panDoc ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <a href={profile.documents.panDoc} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                              View Document
                            </a>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleDocumentDelete('panDoc', profile.documents.panDoc)}
                              disabled={saving}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Form.Group>
                          <Form.Control
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleDocumentUpload('panDoc', e.target.files[0])}
                            disabled={saving}
                          />
                          <Form.Text className="text-muted">Upload PAN card copy</Form.Text>
                        </Form.Group>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <h5 className="mb-3">Employment Documents</h5>
              <Alert variant="secondary" className="mb-3">
                <i className="bi bi-info-circle me-2"></i>
                These documents are uploaded by HR/Admin. You can view and download them.
              </Alert>
              <Row className="mb-4">
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Body>
                      <h6 className="mb-3">Offer Letter</h6>
                      {profile.documents.offerLetter ? (
                        <div>
                          <a href={profile.documents.offerLetter} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                            <i className="bi bi-download me-2"></i>
                            Download Offer Letter
                          </a>
                          <p className="text-muted mt-2 mb-0 small">Uploaded by HR</p>
                        </div>
                      ) : (
                        <p className="text-muted mb-0">No offer letter uploaded yet. Contact HR if needed.</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Body>
                      <h6 className="mb-3">Employment Agreement</h6>
                      {profile.documents.agreement ? (
                        <div>
                          <a href={profile.documents.agreement} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                            <i className="bi bi-download me-2"></i>
                            Download Agreement
                          </a>
                          <p className="text-muted mt-2 mb-0 small">Uploaded by HR</p>
                        </div>
                      ) : (
                        <p className="text-muted mb-0">No agreement uploaded yet. Contact HR if needed.</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <h5 className="mb-3">Salary Slips</h5>
              <Alert variant="secondary" className="mb-3">
                <i className="bi bi-info-circle me-2"></i>
                Your monthly salary slips are uploaded by Accounts department. Download them here.
              </Alert>
              <Row className="mb-4">
                <Col md={12}>
                  <Card>
                    <Card.Body>
                      {profile.documents.salarySlips && profile.documents.salarySlips.length > 0 ? (
                        <div className="list-group">
                          {profile.documents.salarySlips.map((slip, index) => (
                            <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="mb-1">{slip.month} {slip.year}</h6>
                                <small className="text-muted">Uploaded on {new Date(slip.uploadedAt).toLocaleDateString()}</small>
                              </div>
                              <a href={slip.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                                <i className="bi bi-download me-2"></i>
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted text-center py-4 mb-0">
                          No salary slips available yet. They will appear here once uploaded by Accounts department.
                        </p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {saving && (
                <div className="text-center py-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Uploading...</span>
                  </div>
                  <p className="mt-2 text-muted">Uploading document...</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default MyProfileEnhanced;
