import { useState, useEffect } from "react";
import { Container, Card, Row, Col, Badge, Button, Form, Modal, ListGroup, Tabs, Tab, Alert, Table } from "react-bootstrap";
import { 
  FaUserShield, FaEnvelope, FaPhone, FaCalendar, FaEdit, FaKey, 
  FaCrown, FaShieldAlt, FaChartLine, FaUsers, FaProjectDiagram,
  FaClock, FaCheckCircle, FaSave, FaBuilding, FaMapMarkerAlt,
  FaIdCard, FaBriefcase, FaGraduationCap, FaAward, FaUser, FaHome,
  FaFileUpload, FaDownload, FaEye, FaEyeSlash, FaTrash, FaPlus, FaFileAlt,
  FaUniversity, FaCreditCard, FaMoneyBillWave, FaFileContract, FaVolumeUp, FaTimes
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { PAGE_ACCESS, checkPageAccess } from "../../constants/pageAccess";
import ProfilePictureUpload from "../../components/profile/ProfilePictureUpload";
import NotificationSettings from "../../components/notifications/NotificationSettings";
import api from "../../services/api";
import toast from "../../utils/toast";
import "../../styles/pages-mobile.css";
import "../../styles/modal-mobile.css";
import "../../styles/profile-tabs.css";

const MyProfile = () => {
  const { user, refreshUser, canAccess } = useAuth();
  const [activeTab, setActiveTab] = useState(
    ['admin', 'superadmin'].includes(user?.role) ? 'personal' : 'personal'
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [officialDocuments, setOfficialDocuments] = useState([]);
  const [officialDocumentsLoaded, setOfficialDocumentsLoaded] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [bankDetailsUpdated, setBankDetailsUpdated] = useState(false);
  const [editMode, setEditMode] = useState({
    personal: false,
    contact: false,
    bank: false
  });
  const [sameAsCurrentAddress, setSameAsCurrentAddress] = useState(false);
  
  // Project statistics
  const [projectStats, setProjectStats] = useState({
    totalProjects: 0,
    leadingProjects: 0,
    assignedProjects: 0
  });

  // Salary structure
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [showSalary, setShowSalary] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [documentForm, setDocumentForm] = useState({
    file: null,
    description: '',
    category: ''
  });
  const [reuploadDocumentId, setReuploadDocumentId] = useState(null);

  // Document categories based on user role
  const getDocumentCategories = () => {
    const isHROrAdmin = checkPageAccess(canAccess, PAGE_ACCESS.profileHrView);
    
    const employeeCategories = [
      { value: 'aadhaar', label: 'Aadhaar Card', icon: <FaIdCard />, oneTime: true },
      { value: 'pan', label: 'PAN Card', icon: <FaIdCard />, oneTime: true },
      { value: 'bank', label: 'Bank Details', icon: <FaUniversity />, oneTime: true },
      { value: 'passport', label: 'Passport', icon: <FaIdCard />, oneTime: false },
      { value: 'driving_license', label: 'Driving License', icon: <FaIdCard />, oneTime: false },
      { value: 'education', label: 'Educational Certificates', icon: <FaGraduationCap />, oneTime: false }
    ];

    const hrCategories = [
      { value: 'salary_slip', label: 'Salary Slip', icon: <FaMoneyBillWave />, oneTime: false },
      { value: 'joining_letter', label: 'Joining Letter', icon: <FaFileContract />, oneTime: true },
      { value: 'offer_letter', label: 'Offer Letter', icon: <FaFileContract />, oneTime: true },
      { value: 'appraisal', label: 'Appraisal Letter', icon: <FaAward />, oneTime: false },
      { value: 'increment', label: 'Increment Letter', icon: <FaMoneyBillWave />, oneTime: false },
      { value: 'promotion', label: 'Promotion Letter', icon: <FaAward />, oneTime: false }
    ];

    return isHROrAdmin ? [...employeeCategories, ...hrCategories] : employeeCategories;
  };

  useEffect(() => {
    if (user) {
      const loadInitialData = async () => {
        setLoading(true);
        try {
          await fetchProjectStats();
          // Fetch active salary structure for this user
          try {
            const res = await api.get(`/salary-structures/employee/${user._id}/active`);
            setSalaryStructure(res.data);
          } catch {
            setSalaryStructure(null);
          }
        } catch (error) {
          console.error('[INIT] Error loading data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadInitialData();
      setBankDetailsUpdated(user?.bankDetails?.updatedByEmployee || false);
    }
  }, [user]);

  // Load documents when documents tab is opened
  useEffect(() => {
    if (activeTab === 'documents' && !documentsLoaded) {
      fetchDocuments();
      setDocumentsLoaded(true);
    }
  }, [activeTab, documentsLoaded]);

  // Load official documents when downloads tab is opened
  useEffect(() => {
    if (activeTab === 'downloads' && !officialDocumentsLoaded) {
      fetchOfficialDocuments();
      setOfficialDocumentsLoaded(true);
    }
  }, [activeTab, officialDocumentsLoaded]);

  // Reset sameAsCurrentAddress when edit mode changes
  useEffect(() => {
    if (!editMode.contact) {
      setSameAsCurrentAddress(false);
    }
  }, [editMode.contact]);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/users/documents');
      const docs = Array.isArray(response.data) ? response.data : [];
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const fetchOfficialDocuments = async () => {
    try {
      const response = await api.get('/users/official-documents');
      const docs = Array.isArray(response.data) ? response.data : [];
      setOfficialDocuments(docs);
    } catch (error) {
      console.error('Error fetching official documents:', error);
      toast.error('Failed to load official documents');
    }
  };

  const fetchProjectStats = async () => {
    try {
      const response = await api.get('/projects');
      const projects = response.data || [];
      
      // Count projects where user is project head
      const leadingProjects = projects.filter(p => 
        p.projectHead?._id === user?._id || p.projectHead === user?._id
      ).length;
      
      // Count projects where user is assigned (team member)
      const assignedProjects = projects.filter(p => 
        p.assignedUsers?.some(u => (u._id || u) === user?._id)
      ).length;
      
      setProjectStats({
        totalProjects: projects.length,
        leadingProjects,
        assignedProjects
      });
    } catch (error) {
      console.error('Error fetching project stats:', error);
      // Don't show error toast, just keep default values
    }
  };

  const handleProfilePictureUpdate = async () => {
    await refreshUser();
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const formData = new FormData(e.target);
      const updateData = {
        name: formData.get('name'),
        phone: formData.get('phone')
      };
      
      await api.put('/users/profile', updateData);
      toast.success('Profile updated successfully');
      setShowEditModal(false);
      await refreshUser();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!documentForm.file || !documentForm.category) {
      toast.error('Please select a file and category');
      return;
    }

    try {
      setUploading(true);
      
      // If reupload, delete the old document first
      if (reuploadDocumentId) {
        try {
          await api.delete(`/users/documents/${reuploadDocumentId}`);
        } catch (error) {
          console.error('Error deleting old document:', error);
          // Continue with upload even if delete fails
        }
      }
      
      const formData = new FormData();
      formData.append('document', documentForm.file);
      formData.append('category', documentForm.category);
      formData.append('description', documentForm.description);

      const response = await api.post('/users/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(reuploadDocumentId ? 'Document reuploaded successfully' : 'Document uploaded successfully');
      setShowDocumentModal(false);
      setDocumentForm({ file: null, description: '', category: '' });
      setReuploadDocumentId(null);
      
      // Refresh documents list
      await fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    const doc = documents.find(d => d._id === documentId);
    setDocumentToDelete(doc);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/users/documents/${documentToDelete._id}`);
      toast.success('Document deleted successfully');
      setShowDeleteConfirmModal(false);
      setDocumentToDelete(null);
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(error.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const handleDocumentDownload = async (documentId, filename) => {
    try {
      // Safety check: Find the document in our current documents list
      const currentUserId = (user?.id || user?._id)?.toString();
      const doc = documents.find(d => d._id === documentId);
      
      if (doc) {
        const documentUserId = doc.userId?.toString();
        if (documentUserId !== currentUserId) {
          toast.error('Access denied: This document does not belong to you.');
          return;
        }
      }
      
      if (doc?.path?.startsWith('https://')) {
        const link = window.document.createElement('a');
        link.href = doc.path;
        link.setAttribute('download', filename);
        link.setAttribute('target', '_blank');
        link.rel = 'noopener noreferrer';
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Document downloaded successfully');
        return;
      }

      const response = await api.get(`/users/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      
      let errorMessage = 'Failed to download document';
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You can only download your own documents or contact HR/Admin for assistance.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Document file not found on server. The file may have been lost during a system migration. Please re-upload this document or contact HR/Admin for assistance.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage, { duration: 6000 });
    }
  };

  const handleDocumentView = async (doc) => {
    try {
      // Safety check: Ensure document belongs to current user
      const currentUserId = (user?.id || user?._id)?.toString();
      const documentUserId = doc.userId?.toString();
      
      if (documentUserId !== currentUserId) {
        toast.error('Access denied: This document does not belong to you.');
        return;
      }

      if (doc.path?.startsWith('https://')) {
        setViewingDocument({
          ...doc,
          url: doc.path,
        });
        setShowDocumentViewer(true);
        return;
      }
      
      const response = await api.get(`/users/documents/${doc._id}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: doc.mimetype || response.data.type });
      const url = window.URL.createObjectURL(blob);
      
      setViewingDocument({
        ...doc,
        url: url
      });
      setShowDocumentViewer(true);
    } catch (error) {
      console.error('Error viewing document:', error);
      
      let errorMessage = 'Failed to load document';
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You can only view your own documents or contact HR/Admin for assistance.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Document not found or has been removed.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const closeDocumentViewer = () => {
    if (viewingDocument?.url) {
      window.URL.revokeObjectURL(viewingDocument.url);
    }
    setViewingDocument(null);
    setShowDocumentViewer(false);
  };

  const toggleEditMode = (section) => {
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
          personalEmail: document.getElementById('personal-personalEmail')?.value || user?.personalEmail,
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
            panNumber: document.getElementById('bank-pan')?.value || user?.governmentIds?.panNumber,
            aadhaarNumber: document.getElementById('bank-aadhaar')?.value || user?.governmentIds?.aadhaarNumber,
            uanNumber: document.getElementById('bank-uan')?.value || user?.governmentIds?.uanNumber,
            esicNumber: document.getElementById('bank-esic')?.value || user?.governmentIds?.esicNumber,
          }
        };
      }


      await api.put('/users/profile', updateData);
      toast.success('Profile updated successfully');
      setEditMode(prev => ({ ...prev, [section]: false }));
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
      console.error('Change password error:', error);
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
  const isHROrAdmin = checkPageAccess(canAccess, PAGE_ACCESS.profileHrView);
  const isAdmin = checkPageAccess(canAccess, PAGE_ACCESS.platformAdmin);
  const isEmployee = checkPageAccess(canAccess, PAGE_ACCESS.profileStaffView);

  const openDocumentModal = (category = '', documentId = null) => {
    setDocumentType(category);
    setDocumentForm({ file: null, description: '', category });
    setReuploadDocumentId(documentId);
    setShowDocumentModal(true);
  };

  const getDocumentsByCategory = (category) => {
    return documents.filter(doc => doc.category === category);
  };

  const canUploadDocument = (category) => {
    const categoryInfo = getDocumentCategories().find(cat => cat.value === category);
    if (!categoryInfo) return false;
    
    if (categoryInfo.oneTime) {
      const existingDocs = getDocumentsByCategory(category);
      // HR/Admin can always upload/replace, employees can only upload if none exists
      return existingDocs.length === 0 || isHROrAdmin;
    }
    return true;
  };

  // Official document categories for downloads
  const getOfficialDocumentCategories = () => {
    return [
      { 
        value: 'salary_slip', 
        label: 'Salary Slips', 
        icon: <FaMoneyBillWave />, 
        description: 'Monthly salary slips and payroll documents',
        color: 'success'
      },
      { 
        value: 'leave_approval', 
        label: 'Leave Approvals', 
        icon: <FaCheckCircle />, 
        description: 'Approved leave applications and certificates',
        color: 'info'
      },
      { 
        value: 'offer_letter', 
        label: 'Offer Letter', 
        icon: <FaFileContract />, 
        description: 'Job offer letter and employment terms',
        color: 'primary'
      },
      { 
        value: 'joining_letter', 
        label: 'Joining Letter', 
        icon: <FaFileContract />, 
        description: 'Official joining confirmation letter',
        color: 'primary'
      },
      { 
        value: 'promotion_letter', 
        label: 'Promotion Letters', 
        icon: <FaAward />, 
        description: 'Promotion announcements and new role confirmations',
        color: 'warning'
      },
      { 
        value: 'increment_letter', 
        label: 'Increment Letters', 
        icon: <FaMoneyBillWave />, 
        description: 'Salary increment notifications and revisions',
        color: 'success'
      },
      { 
        value: 'appraisal', 
        label: 'Appraisal Reports', 
        icon: <FaChartLine />, 
        description: 'Performance appraisal reports and feedback',
        color: 'info'
      },
      { 
        value: 'acknowledgement', 
        label: 'Acknowledgements', 
        icon: <FaFileAlt />, 
        description: 'Various acknowledgement letters and certificates',
        color: 'secondary'
      },
      { 
        value: 'experience_letter', 
        label: 'Experience Letter', 
        icon: <FaBriefcase />, 
        description: 'Work experience and service certificates',
        color: 'dark'
      },
      { 
        value: 'relieving_letter', 
        label: 'Relieving Letter', 
        icon: <FaFileContract />, 
        description: 'Relieving and clearance certificates',
        color: 'danger'
      }
    ];
  };

  const getOfficialDocumentsByCategory = (category) => {
    return officialDocuments.filter(doc => doc.category === category);
  };

  const handleOfficialDocumentDownload = async (documentId, filename) => {
    try {
      const response = await api.get(`/users/official-documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading official document:', error);
      
      let errorMessage = 'Failed to download document';
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. You can only download your own documents or contact HR/Admin for assistance.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Document file not found on server. The file may have been lost during a system migration. Please contact HR/Admin for assistance.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage, { duration: 6000 });
    }
  };

  const handleOfficialDocumentView = async (document) => {
    try {
      const response = await api.get(`/users/official-documents/${document._id}/download`, {
        responseType: 'blob'
      });
      
      // Create blob with proper MIME type
      const blob = new Blob([response.data], { type: document.mimetype || response.data.type });
      const url = window.URL.createObjectURL(blob);
      setViewingDocument({
        ...document,
        url: url
      });
      setShowDocumentViewer(true);
    } catch (error) {
      console.error('Error viewing official document:', error);
      
      let errorMessage = 'Failed to load document';
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. You can only view your own documents or contact HR/Admin for assistance.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Document file not found on server. The file may have been lost during a system migration. Please contact HR/Admin for assistance.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage, { duration: 6000 });
    }
  };

  return (
    <Container fluid className="py-4">
      {isAdmin ? (
        /* Admin/SuperAdmin Profile Layout - Exact match to your image */
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Row className="g-0">
              {/* Left Column - Profile Card */}
              <Col xs={12} lg={4} className="border-end">
                <div className="p-4 text-center">
                  <div className="mb-3">
                    <ProfilePictureUpload
                      currentImage={user?.profilePicture}
                      onUploadSuccess={handleProfilePictureUpdate}
                    />
                  </div>
                  
                  <h4 className="mb-1">{user?.name}</h4>
                  <p className="text-muted mb-3">{user?.email}</p>
                  
                  <Badge bg="danger" className="px-3 py-2 mb-3" style={{ fontSize: '0.9rem' }}>
                    <FaCrown className="me-2" />
                    Super Administrator
                  </Badge>

                  <div className="d-grid gap-2 mt-4">
                    <Button variant="primary" onClick={() => setShowEditModal(true)}>
                      <FaEdit className="me-2" />
                      Edit Profile
                    </Button>
                    <Button variant="outline-secondary" onClick={() => setShowPasswordModal(true)}>
                      <FaKey className="me-2" />
                      Change Password
                    </Button>
                  </div>
                </div>

                {/* System Overview Stats */}
                <div className="border-top p-4">
                  <h6 className="mb-3">
                    <FaChartLine className="me-2 text-primary" />
                    System Overview
                  </h6>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                      <span className="text-primary">
                        <FaUsers className="me-2" />
                        Total Users
                      </span>
                      <Badge bg="primary" pill>25</Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                      <span className="text-success">
                        <FaProjectDiagram className="me-2" />
                        Total Projects
                      </span>
                      <Badge bg="success" pill>{projectStats.totalProjects}</Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                      <span className="text-info">
                        <FaCheckCircle className="me-2" />
                        Leading Projects
                      </span>
                      <Badge bg="info" pill>{projectStats.leadingProjects}</Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                      <span className="text-primary">
                        <FaUsers className="me-2" />
                        Assigned Projects
                      </span>
                      <Badge bg="primary" pill>{projectStats.assignedProjects}</Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                      <span className="text-warning">
                        <FaClock className="me-2" />
                        System Uptime
                      </span>
                      <Badge bg="warning" text="dark" pill>99.9%</Badge>
                    </ListGroup.Item>
                  </ListGroup>
                </div>
              </Col>

              {/* Right Column - Information Cards */}
              <Col xs={12} lg={8}>
                <div className="p-4">
                  {/* Personal Information Card */}
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-white border-bottom d-flex align-items-center">
                      <FaUser className="me-2 text-primary" />
                      <h6 className="mb-0">Personal Information</h6>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <Row>
                        <Col md={6} className="mb-3">
                          <div className="d-flex align-items-start">
                            <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                              <FaUser className="text-primary" />
                            </div>
                            <div>
                              <small className="text-muted d-block mb-1">Full Name</small>
                              <strong>{user?.name || 'Amit Santra'}</strong>
                            </div>
                          </div>
                        </Col>
                        <Col md={6} className="mb-3">
                          <div className="d-flex align-items-start">
                            <div className="bg-info bg-opacity-10 p-2 rounded me-3">
                              <FaEnvelope className="text-info" />
                            </div>
                            <div>
                              <small className="text-muted d-block mb-1">Email Address</small>
                              <strong>{user?.email || 'amit@wealll.com'}</strong>
                            </div>
                          </div>
                        </Col>
                        <Col md={6} className="mb-3">
                          <div className="d-flex align-items-start">
                            <div className="bg-success bg-opacity-10 p-2 rounded me-3">
                              <FaPhone className="text-success" />
                            </div>
                            <div>
                              <small className="text-muted d-block mb-1">Phone Number</small>
                              <strong>{user?.phone || '—'}</strong>
                            </div>
                          </div>
                        </Col>
                        <Col md={6} className="mb-3">
                          <div className="d-flex align-items-start">
                            <div className="bg-warning bg-opacity-10 p-2 rounded me-3">
                              <FaCalendar className="text-warning" />
                            </div>
                            <div>
                              <small className="text-muted d-block mb-1">Member Since</small>
                              <strong>N/A</strong>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* Access & Permissions Card */}
                  <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-bottom d-flex align-items-center">
                      <FaShieldAlt className="me-2 text-success" />
                      <h6 className="mb-0">Access & Permissions</h6>
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
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      ) : (
        /* Employee/HoD/HR Profile Layout - With Header Banner and Tabs */
        <>
          {/* Header Banner */}
          <Card className="border-0 shadow-lg mb-4 profile-header-banner" style={{ 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f8f9fa 100%)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '200px',
            border: '1px solid #dee2e6'
          }}>
            {/* Background Pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%236c757d" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.6
            }} />
            
            {/* Decorative Elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(108,117,125,0.08) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(13,110,253,0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            
            <Card.Body className="p-4 position-relative" style={{ zIndex: 2 }}>
              <Row className="align-items-center">
                <Col xs={12} lg={8} className="mb-3 mb-lg-0">
                  <div className="d-flex align-items-center flex-column flex-md-row text-center text-md-start">
                    <div className="mb-3 mb-md-0 me-md-4">
                      <div className="profile-picture-container-header">
                        <ProfilePictureUpload
                          currentImage={user?.profilePicture}
                          onUploadSuccess={handleProfilePictureUpdate}
                        />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <div className="mb-2">
                        <h1 className="mb-3 fw-bold" style={{ 
                          fontSize: '2.2rem', 
                          color: '#2c3e50',
                          letterSpacing: '0.5px',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          {user?.name || 'User Profile'}
                        </h1>
                        <p className="mb-3" style={{ 
                          fontSize: '1.1rem',
                          color: '#495057',
                          fontWeight: '500'
                        }}>
                          <FaEnvelope className="me-2 text-primary" />
                          {user?.email}
                        </p>
                        <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-3 flex-wrap">
                          <Badge 
                            bg={roleBadge.bg} 
                            className="px-3 py-2 d-flex align-items-center shadow-sm"
                            style={{ 
                              fontSize: '0.9rem', 
                              borderRadius: '25px',
                              border: '2px solid rgba(255,255,255,0.8)',
                              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                            }}
                          >
                            {roleBadge.icon}
                            <span className="ms-2 fw-semibold">{roleBadge.text}</span>
                          </Badge>
                          {user?.department?.name && (
                            <Badge 
                              bg="info" 
                              className="px-3 py-2 d-flex align-items-center shadow-sm"
                              style={{ 
                                fontSize: '0.9rem', 
                                borderRadius: '25px',
                                border: '2px solid rgba(255,255,255,0.8)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                              }}
                            >
                              <FaBuilding className="me-2" />
                              <span className="fw-semibold">{user.department.name}</span>
                            </Badge>
                          )}
                          {user?.designation && (
                            <Badge 
                              bg="success" 
                              className="px-3 py-2 d-flex align-items-center shadow-sm"
                              style={{ 
                                fontSize: '0.9rem', 
                                borderRadius: '25px',
                                border: '2px solid rgba(255,255,255,0.8)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                              }}
                            >
                              <FaBriefcase className="me-2" />
                              <span className="fw-semibold">{user.designation}</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col xs={12} lg={4} className="text-center text-lg-end">
                  <div className="d-flex flex-column gap-3">
                    <Button 
                      variant="primary" 
                      onClick={() => setShowPasswordModal(true)} 
                      className="btn-lg shadow-sm fw-semibold"
                      style={{ 
                        borderRadius: '30px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                        color: 'white',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(0,123,255,0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #0056b3 0%, #004085 100%)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(0,123,255,0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0,123,255,0.3)';
                      }}
                    >
                      <FaKey className="me-2" />
                      Change Password
                    </Button>

                    <div className="d-flex flex-column gap-1">
                      <small style={{ 
                        color: '#6c757d',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}>
                        <FaCalendar className="me-2 text-info" />
                        Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </small>
                      {user?.phone && (
                        <small style={{ 
                          color: '#6c757d',
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}>
                          <FaPhone className="me-2 text-success" />
                          {user.phone}
                        </small>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Main Profile Content */}
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="pt-3"
              >
            {/* Admin Profile Layout - Matches the image exactly */}
            {isAdmin ? (
              <Tab eventKey="admin" title={<><FaShieldAlt className="me-2" />Admin Dashboard</>}>
                <div className="p-0">
                <Row className="g-0">
                  {/* Left Column - Profile Card */}
                  <Col xs={12} lg={4} className="border-end">
                    <div className="p-4 text-center">
                      <div className="mb-3">
                        <ProfilePictureUpload
                          currentImage={user?.profilePicture}
                          onUploadSuccess={handleProfilePictureUpdate}
                        />
                      </div>
                      
                      <h4 className="mb-1">{user?.name}</h4>
                      <p className="text-muted mb-3">{user?.email}</p>
                      
                      <Badge bg="danger" className="px-3 py-2 mb-3" style={{ fontSize: '0.9rem' }}>
                        <FaCrown className="me-2" />
                        Super Administrator
                      </Badge>

                      <div className="d-grid gap-2 mt-4">
                        <Button variant="primary" onClick={() => setShowEditModal(true)}>
                          <FaEdit className="me-2" />
                          Edit Profile
                        </Button>
                        <Button variant="outline-secondary" onClick={() => setShowPasswordModal(true)}>
                          <FaKey className="me-2" />
                          Change Password
                        </Button>
                      </div>
                    </div>

                    {/* System Overview Stats */}
                    <div className="border-top p-4">
                      <h6 className="mb-3">
                        <FaChartLine className="me-2 text-primary" />
                        System Overview
                      </h6>
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                          <span className="text-primary">
                            <FaUsers className="me-2" />
                            Total Users
                          </span>
                          <Badge bg="primary" pill>25</Badge>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                          <span className="text-success">
                            <FaProjectDiagram className="me-2" />
                            Total Projects
                          </span>
                          <Badge bg="success" pill>{projectStats.totalProjects}</Badge>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                          <span className="text-info">
                            <FaCheckCircle className="me-2" />
                            Leading Projects
                          </span>
                          <Badge bg="info" pill>{projectStats.leadingProjects}</Badge>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                          <span className="text-warning">
                            <FaClock className="me-2" />
                            Assigned Projects
                          </span>
                          <Badge bg="warning" text="dark" pill>{projectStats.assignedProjects}</Badge>
                        </ListGroup.Item>
                      </ListGroup>
                    </div>
                  </Col>

                  {/* Right Column - Information Cards */}
                  <Col xs={12} lg={8}>
                    <div className="p-4">
                      {/* Personal Information Card */}
                      <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-white border-bottom d-flex align-items-center">
                          <FaUser className="me-2 text-primary" />
                          <h6 className="mb-0">Personal Information</h6>
                        </Card.Header>
                        <Card.Body className="p-4">
                          <Row>
                            <Col md={6} className="mb-3">
                              <div className="d-flex align-items-start">
                                <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                                  <FaUser className="text-primary" />
                                </div>
                                <div>
                                  <small className="text-muted d-block mb-1">Full Name</small>
                                  <strong>{user?.name || 'Amit Santra'}</strong>
                                </div>
                              </div>
                            </Col>
                            <Col md={6} className="mb-3">
                              <div className="d-flex align-items-start">
                                <div className="bg-info bg-opacity-10 p-2 rounded me-3">
                                  <FaEnvelope className="text-info" />
                                </div>
                                <div>
                                  <small className="text-muted d-block mb-1">Email Address</small>
                                  <strong>{user?.email || 'amit@wealll.com'}</strong>
                                </div>
                              </div>
                            </Col>
                            <Col md={6} className="mb-3">
                              <div className="d-flex align-items-start">
                                <div className="bg-success bg-opacity-10 p-2 rounded me-3">
                                  <FaPhone className="text-success" />
                                </div>
                                <div>
                                  <small className="text-muted d-block mb-1">Phone Number</small>
                                  <strong>{user?.phone || '—'}</strong>
                                </div>
                              </div>
                            </Col>
                            <Col md={6} className="mb-3">
                              <div className="d-flex align-items-start">
                                <div className="bg-warning bg-opacity-10 p-2 rounded me-3">
                                  <FaCalendar className="text-warning" />
                                </div>
                                <div>
                                  <small className="text-muted d-block mb-1">Member Since</small>
                                  <strong>N/A</strong>
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      {/* Access & Permissions Card */}
                      <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-bottom d-flex align-items-center">
                          <FaShieldAlt className="me-2 text-success" />
                          <h6 className="mb-0">Access & Permissions</h6>
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
                    </div>
                  </Col>
                </Row>
              </div>
            </Tab>
            ) : (
              /* Employee Profile Layout - Tabbed Interface */
              <Tab eventKey="personal" title={<><FaUser className="me-2" />Personal Details</>}>
                <div className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">Personal Information</h5>
                    <Button 
                      variant={editMode.personal ? "success" : "outline-primary"}
                      size="sm"
                      onClick={() => toggleEditMode('personal')}
                      disabled={saving}
                    >
                      <FaEdit className="me-2" />
                      {editMode.personal ? (saving ? 'Saving...' : 'Save Changes') : 'Edit Details'}
                    </Button>
                  </div>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label>Full Name *</Form.Label>
                        {editMode.personal ? (
                          <Form.Control
                            type="text"
                            defaultValue={user?.name || ''}
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
                        <Form.Label>Personal Email</Form.Label>
                        {editMode.personal ? (
                          <Form.Control
                            type="email"
                            defaultValue={user?.personalEmail || ''}
                            placeholder="your.personal@email.com"
                            id="personal-personalEmail"
                          />
                        ) : (
                          <div className="form-control-plaintext border rounded p-2 bg-light">
                            {user?.personalEmail || '—'}
                          </div>
                        )}
                        <Form.Text className="text-muted">Your personal email address</Form.Text>
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
                </div>
              </Tab>
            )}

            {/* Job Details Tab */}
            <Tab eventKey="job" title={<><FaBriefcase className="me-2" />Job Details</>}>
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">Job Information</h5>
                  {isHROrAdmin && (
                    <Badge bg="info" className="px-2 py-1">
                      <FaShieldAlt className="me-1" />
                      HR/Admin Access
                    </Badge>
                  )}
                  {!isHROrAdmin && (
                    <Badge bg="secondary" className="px-2 py-1">
                      <FaEye className="me-1" />
                      Read Only
                    </Badge>
                  )}
                </div>

                {!isHROrAdmin && (
                  <Alert variant="info" className="mb-4">
                    <FaShieldAlt className="me-2" />
                    Job details can only be modified by HR or Admin personnel.
                  </Alert>
                )}

                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Employee ID</Form.Label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        {user?.employeeId || 'Not assigned'}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Designation/Job Title</Form.Label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        {user?.designation || user?.jobTitle || '—'}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Department</Form.Label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        {user?.department?.name || user?.headOfDepartment?.name || 'Not assigned'}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Role</Form.Label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        <Badge bg={roleBadge.bg} className="px-2 py-1">
                          {roleBadge.text}
                        </Badge>
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Joining Date</Form.Label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        {user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString('en-GB') : 
                         user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Employment Type</Form.Label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        {user?.employmentType ? user.employmentType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Salary (Net)</Form.Label>
                      <div className="d-flex align-items-center gap-2">
                        <div className="form-control-plaintext border rounded p-2 bg-light flex-grow-1" style={{ letterSpacing: showSalary ? 'normal' : '0.15em' }}>
                          {salaryStructure
                            ? showSalary
                              ? `₹${salaryStructure.netSalary?.toLocaleString('en-IN')} / month`
                              : '₹ ••••••'
                            : 'Not set'
                          }
                        </div>
                        {salaryStructure && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setShowSalary(v => !v)}
                            title={showSalary ? 'Hide salary' : 'Show salary'}
                            style={{ flexShrink: 0 }}
                          >
                            {showSalary ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        )}
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
                      <Form.Label>Employee Status</Form.Label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        <Badge bg="success" className="px-2 py-1">
                          <FaCheckCircle className="me-1" />
                          Active
                        </Badge>
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Work Location</Form.Label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        {user?.workLocation || 'Office'}
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Tab>

            {/* Contact & Address Tab - For employees, HoD, and HR */}
            {isEmployee && (
              <Tab eventKey="contact" title={<><FaHome className="me-2" />Contact & Address</>}>
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">Contact Information</h5>
                  <Button 
                    variant={editMode.contact ? "success" : "outline-primary"}
                    size="sm"
                    onClick={() => toggleEditMode('contact')}
                  >
                    <FaEdit className="me-2" />
                    {editMode.contact ? 'Save Changes' : 'Edit Details'}
                  </Button>
                </div>

                <Row>
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
              </div>
              </Tab>
            )}

            {/* Bank Details Tab - For employees, HoD, and HR */}
            {isEmployee && (
            <Tab eventKey="bank" title={<><FaCreditCard className="me-2" />Bank Details</>}>
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">Bank & Identity Information</h5>
                  {(isHROrAdmin || !bankDetailsUpdated) ? (
                    <Button 
                      variant={editMode.bank ? "success" : "outline-primary"}
                      size="sm"
                      onClick={() => toggleEditMode('bank')}
                      disabled={saving}
                    >
                      <FaEdit className="me-2" />
                      {editMode.bank ? (saving ? 'Saving...' : 'Save Changes') : 'Edit Details'}
                    </Button>
                  ) : (
                    <Badge bg="info" className="px-3 py-2">
                      <FaShieldAlt className="me-2" />
                      Contact HR for Changes
                    </Badge>
                  )}
                </div>

                {bankDetailsUpdated && !isHROrAdmin ? (
                  <Alert variant="info" className="mb-4">
                    <FaShieldAlt className="me-2" />
                    <strong>Bank details already updated:</strong> You can only update bank details once. 
                    Contact HR/Admin for any further changes.
                  </Alert>
                ) : (
                  <Alert variant="warning" className="mb-4">
                    <FaShieldAlt className="me-2" />
                    Bank details are sensitive information. Please ensure accuracy as this will be used for salary processing.
                    {!isHROrAdmin && <><br /><strong>Note:</strong> You can only update these details once.</>}
                  </Alert>
                )}

                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Bank Name</Form.Label>
                      {editMode.bank ? (
                        <Form.Control
                          type="text"
                          defaultValue={user?.bankDetails?.bankName || ''}
                          placeholder="e.g., State Bank of India"
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
                          {user?.bankDetails?.accountNumber || '—'}
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
                          placeholder="e.g., SBIN0001234"
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
                      <Form.Label>Account Holder Name</Form.Label>
                      {editMode.bank ? (
                        <Form.Control
                          type="text"
                          defaultValue={user?.bankDetails?.accountHolderName || user?.name || ''}
                          placeholder="As per bank records"
                          id="bank-holder"
                        />
                      ) : (
                        <div className="form-control-plaintext border rounded p-2 bg-light">
                          {user?.bankDetails?.accountHolderName || user?.name || '—'}
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>PAN Number</Form.Label>
                      {editMode.bank ? (
                        <Form.Control
                          type="text"
                          defaultValue={user?.governmentIds?.panNumber || ''}
                          placeholder="e.g., ABCDE1234F"
                          id="bank-pan"
                          style={{ textTransform: 'uppercase' }}
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
                          placeholder="Enter 12-digit Aadhaar number"
                          id="bank-aadhaar"
                          maxLength={12}
                        />
                      ) : (
                        <div className="form-control-plaintext border rounded p-2 bg-light">
                          {user?.governmentIds?.aadhaarNumber || '—'}
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
              </div>
              </Tab>
            )}

            {/* Documents Tab - For employees, HoD, and HR */}
            {isEmployee && (
            <Tab eventKey="documents" title={<><FaFileAlt className="me-2" />Documents</>}>
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">Document Management</h5>
                  <Button 
                    variant="primary"
                    onClick={() => openDocumentModal()}
                    disabled={loading}
                  >
                    <FaPlus className="me-2" />
                    Upload Document
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Loading documents...</p>
                  </div>
                ) : (
                  <>
                    {documents.length === 0 && (
                      <Alert variant="info" className="mb-4">
                        <FaFileAlt className="me-2" />
                        <strong>No documents uploaded yet.</strong> Click "Upload Document" to add your first document.
                      </Alert>
                    )}

                    <Row>
                      {getDocumentCategories().map((category) => {
                        const categoryDocs = getDocumentsByCategory(category.value);
                        const canUpload = canUploadDocument(category.value);
                        
                        return (
                          <Col md={6} key={category.value} className="mb-4">
                            <Card className="border-0 shadow-sm h-100">
                              <Card.Header className="bg-light border-bottom-0">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div className="d-flex align-items-center">
                                    <span className="me-2 text-primary">{category.icon}</span>
                                    <strong>{category.label}</strong>
                                  </div>
                                  {category.oneTime && (
                                    <Badge bg="warning" text="dark" className="px-2 py-1">
                                      One Time
                                    </Badge>
                                  )}
                                </div>
                              </Card.Header>
                              <Card.Body>
                                {categoryDocs.length > 0 ? (
                                  <div>
                                    {categoryDocs.map((doc) => (
                                      <div key={doc._id} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                                        <div className="flex-grow-1">
                                          <small className="text-muted d-block">
                                            {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}
                                          </small>
                                          <span className="fw-medium">{doc.originalName}</span>
                                          {doc.description && (
                                            <small className="text-muted d-block">{doc.description}</small>
                                          )}
                                          {/* Verification Status */}
                                          <div className="mt-2">
                                            {doc.verificationStatus === 'pending' && (
                                              <Badge bg="warning" text="dark" className="me-2">
                                                <FaClock className="me-1" />
                                                Verification Pending
                                              </Badge>
                                            )}
                                            {doc.verificationStatus === 'approved' && (
                                              <Badge bg="success" className="me-2">
                                                <FaCheckCircle className="me-1" />
                                                Approved by {doc.verifiedBy?.name || 'HR'}
                                              </Badge>
                                            )}
                                            {doc.verificationStatus === 'rejected' && (
                                              <Badge bg="danger" className="me-2">
                                                <FaTimes className="me-1" />
                                                Rejected
                                              </Badge>
                                            )}
                                            {doc.verificationStatus === 'approved' && doc.verificationDate && (
                                              <small className="text-muted d-block mt-1">
                                                on {new Date(doc.verificationDate).toLocaleDateString('en-GB')}
                                              </small>
                                            )}
                                            {doc.verificationStatus === 'rejected' && doc.rejectionReason && (
                                              <small className="text-danger d-block mt-1">
                                                Reason: {doc.rejectionReason}
                                              </small>
                                            )}
                                          </div>
                                        </div>
                                        <div className="d-flex gap-1">
                                          <Button
                                            variant="outline-info"
                                            size="sm"
                                            onClick={() => handleDocumentView(doc)}
                                            title="View Document"
                                          >
                                            <FaEye />
                                          </Button>
                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleDocumentDownload(doc._id, doc.originalName)}
                                            title="Download Document"
                                          >
                                            <FaDownload />
                                          </Button>
                                          {/* Delete and Reupload options for pending/rejected documents */}
                                          {(doc.verificationStatus === 'pending' || doc.verificationStatus === 'rejected') && (
                                            <>
                                              <Button
                                                variant="outline-warning"
                                                size="sm"
                                                onClick={() => openDocumentModal(category.value, doc._id)}
                                                title="Reupload Document"
                                              >
                                                <FaFileUpload />
                                              </Button>
                                              <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleDocumentDelete(doc._id)}
                                                title="Delete Document"
                                              >
                                                <FaTrash />
                                              </Button>
                                            </>
                                          )}
                                          {isHROrAdmin && doc.verificationStatus === 'approved' && (
                                            <Button
                                              variant="outline-danger"
                                              size="sm"
                                              onClick={() => handleDocumentDelete(doc._id)}
                                              title="Delete Document (HR/Admin Only)"
                                            >
                                              <FaTrash />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center text-muted py-3">
                                    <FaFileAlt size={24} className="mb-2 opacity-50" />
                                    <p className="mb-0">No documents uploaded</p>
                                  </div>
                                )}
                                
                                {canUpload && (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="w-100 mt-2"
                                    onClick={() => openDocumentModal(category.value)}
                                  >
                                    <FaPlus className="me-2" />
                                    Upload {category.label}
                                  </Button>
                                )}
                                
                                {!canUpload && category.oneTime && categoryDocs.length > 0 && (
                                  <Alert variant={isHROrAdmin ? "warning" : "info"} className="mt-2 mb-0 py-2">
                                    <small>
                                      <FaCheckCircle className="me-1" />
                                      {isHROrAdmin ? 
                                        "Document exists. HR/Admin can replace it." : 
                                        "Document already uploaded. Contact HR for changes."
                                      }
                                    </small>
                                  </Alert>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </>
                )}
              </div>
              </Tab>
            )}

            {/* Downloads Tab - For employees, HoD, and HR */}
            {isEmployee && (
            <Tab eventKey="downloads" title={<><FaDownload className="me-2" />Downloads</>}>
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">Official Documents & Downloads</h5>
                  <Badge bg="info" className="px-3 py-2">
                    <FaFileAlt className="me-2" />
                    {officialDocuments.length} Documents Available
                  </Badge>
                </div>

                <Alert variant="info" className="mb-4">
                  <FaDownload className="me-2" />
                  <strong>Download Center:</strong> Access all your official documents including salary slips, 
                  leave approvals, offer letters, and other HR documents. Documents are automatically 
                  generated and made available by the HR department.
                </Alert>

                <Row>
                  {getOfficialDocumentCategories().map((category) => {
                    const categoryDocs = getOfficialDocumentsByCategory(category.value);
                    
                    return (
                      <Col lg={6} xl={4} key={category.value} className="mb-4">
                        <Card className="border-0 shadow-sm h-100">
                          <Card.Header className={`bg-${category.color} bg-opacity-10 border-bottom-0`}>
                            <div className="d-flex align-items-center">
                              <span className={`me-2 text-${category.color}`}>{category.icon}</span>
                              <div>
                                <strong className={`text-${category.color}`}>{category.label}</strong>
                                <div className="small text-muted">{category.description}</div>
                              </div>
                            </div>
                          </Card.Header>
                          <Card.Body className="p-3">
                            {categoryDocs.length > 0 ? (
                              <div>
                                <div className="mb-3">
                                  <Badge bg={category.color} className="px-2 py-1">
                                    {categoryDocs.length} Document{categoryDocs.length > 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                
                                <div className="document-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  {categoryDocs.map((doc, index) => (
                                    <div key={doc._id} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded bg-light">
                                      <div className="flex-grow-1">
                                        <div className="fw-medium text-truncate" title={doc.title || doc.originalName}>
                                          {doc.title || doc.originalName}
                                        </div>
                                        <small className="text-muted">
                                          {new Date(doc.createdAt || doc.uploadedAt).toLocaleDateString('en-GB')}
                                        </small>
                                        {doc.description && (
                                          <div className="small text-muted text-truncate" title={doc.description}>
                                            {doc.description}
                                          </div>
                                        )}
                                      </div>
                                      <div className="d-flex gap-1 ms-2">
                                        <Button
                                          variant="outline-info"
                                          size="sm"
                                          onClick={() => handleOfficialDocumentView(doc)}
                                          title="View Document"
                                        >
                                          <FaEye />
                                        </Button>
                                        <Button
                                          variant={`outline-${category.color}`}
                                          size="sm"
                                          onClick={() => handleOfficialDocumentDownload(doc._id, doc.originalName || doc.title)}
                                          title="Download Document"
                                        >
                                          <FaDownload />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                {categoryDocs.length > 3 && (
                                  <div className="text-center mt-2">
                                    <small className="text-muted">
                                      Scroll to view more documents
                                    </small>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-muted py-4">
                                <div className={`text-${category.color} mb-2`} style={{ fontSize: '2rem' }}>
                                  {category.icon}
                                </div>
                                <p className="mb-2">No documents available</p>
                                <small>
                                  Documents will appear here when uploaded by HR
                                </small>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>

                {/* Quick Download Section */}
                {officialDocuments.length > 0 && (
                  <Card className="border-0 bg-light mt-4">
                    <Card.Header className="bg-transparent border-bottom-0">
                      <h6 className="mb-0">
                        <FaDownload className="me-2 text-primary" />
                        Recent Documents
                      </h6>
                    </Card.Header>
                    <Card.Body className="pt-0">
                      <Table responsive hover className="mb-0">
                        <thead>
                          <tr>
                            <th>Document</th>
                            <th>Category</th>
                            <th>Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {officialDocuments
                            .sort((a, b) => new Date(b.createdAt || b.uploadedAt) - new Date(a.createdAt || a.uploadedAt))
                            .slice(0, 5)
                            .map((doc) => {
                              const category = getOfficialDocumentCategories().find(cat => cat.value === doc.category);
                              return (
                                <tr key={doc._id}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      {category && (
                                        <span className={`me-2 text-${category.color}`}>
                                          {category.icon}
                                        </span>
                                      )}
                                      <div>
                                        <div className="fw-medium">{doc.title || doc.originalName}</div>
                                        {doc.description && (
                                          <small className="text-muted">{doc.description}</small>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    {category && (
                                      <Badge bg={category.color} className="px-2 py-1">
                                        {category.label}
                                      </Badge>
                                    )}
                                  </td>
                                  <td>
                                    <small>
                                      {new Date(doc.createdAt || doc.uploadedAt).toLocaleDateString('en-GB')}
                                    </small>
                                  </td>
                                  <td>
                                    <div className="d-flex gap-1">
                                      <Button
                                        variant="outline-info"
                                        size="sm"
                                        onClick={() => handleOfficialDocumentView(doc)}
                                        title="View Document"
                                      >
                                        <FaEye />
                                      </Button>
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleOfficialDocumentDownload(doc._id, doc.originalName || doc.title)}
                                        title="Download Document"
                                      >
                                        <FaDownload />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </Table>
                      
                      {officialDocuments.length > 5 && (
                        <div className="text-center mt-3">
                          <small className="text-muted">
                            Showing 5 most recent documents. View category tabs above for all documents.
                          </small>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                )}

                {/* No Documents Message */}
                {officialDocuments.length === 0 && (
                  <Card className="border-0 bg-light text-center py-5">
                    <Card.Body>
                      <FaFileAlt size={48} className="text-muted mb-3" />
                      <h5 className="text-muted mb-2">No Official Documents Available</h5>
                      <p className="text-muted mb-0">
                        Official documents like salary slips, offer letters, and other HR documents 
                        will appear here once they are uploaded by the HR department.
                      </p>
                    </Card.Body>
                  </Card>
                )}
              </div>
              </Tab>
            )}

            {/* Admin System Overview Tab */}
            {isAdmin && (
              <Tab eventKey="system" title={<><FaShieldAlt className="me-2" />System Overview</>}>
                <div className="p-4">
                  <h5 className="mb-4">System Access & Management</h5>
                  
                  <div className="alert alert-success border-0 mb-4">
                    <FaCheckCircle className="me-2" />
                    <strong>Administrator Access Granted</strong> - You have full system privileges
                  </div>

                  <Row>
                    <Col md={6}>
                      <Card className="border-0 bg-light mb-3">
                        <Card.Body>
                          <h6 className="mb-3">
                            <FaShieldAlt className="me-2 text-primary" />
                            Administrative Privileges
                          </h6>
                          <ul className="list-unstyled">
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              User Management & Access Control
                            </li>
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              Department & Project Oversight
                            </li>
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              System Configuration & Settings
                            </li>
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              Reports & Analytics Access
                            </li>
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              Attendance & Leave Management
                            </li>
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              Client & Financial Management
                            </li>
                          </ul>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="border-0 bg-light mb-3">
                        <Card.Body>
                          <h6 className="mb-3">
                            <FaChartLine className="me-2 text-success" />
                            System Statistics
                          </h6>
                          <ListGroup variant="flush">
                            <ListGroup.Item className="d-flex justify-content-between align-items-center bg-transparent">
                              <span><FaUsers className="me-2 text-primary" />Total Users</span>
                              <Badge bg="primary" pill>Loading...</Badge>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between align-items-center bg-transparent">
                              <span><FaProjectDiagram className="me-2 text-success" />Active Projects</span>
                              <Badge bg="success" pill>Loading...</Badge>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between align-items-center bg-transparent">
                              <span><FaBuilding className="me-2 text-info" />Departments</span>
                              <Badge bg="info" pill>Loading...</Badge>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between align-items-center bg-transparent">
                              <span><FaClock className="me-2 text-warning" />System Uptime</span>
                              <Badge bg="warning" text="dark" pill>99.9%</Badge>
                            </ListGroup.Item>
                          </ListGroup>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {user?.role === 'superadmin' && (
                    <div className="alert alert-danger border-0 mt-3">
                      <FaCrown className="me-2" />
                      <strong>SuperAdmin Status:</strong> You have unrestricted access to all system features and cannot be deleted or demoted.
                    </div>
                  )}
                </div>
              </Tab>
            )}

            {/* Notification Settings Tab - For all users */}
            <Tab eventKey="notifications" title={<><FaVolumeUp className="me-2" />Notifications</>}>
              <div className="p-4">
                <NotificationSettings />
              </div>
            </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </>
      )}

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
                name="name"
                defaultValue={user?.name || ''}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                defaultValue={user?.email || ''}
                disabled
                className="bg-light"
              />
              <Form.Text className="text-muted">Email cannot be changed</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                defaultValue={user?.phone || ''}
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

      {/* Document Upload Modal */}
      <Modal show={showDocumentModal} onHide={() => setShowDocumentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileUpload className="me-2" />
            {reuploadDocumentId ? 'Reupload Document' : 'Upload Document'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleDocumentUpload}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Document Category</Form.Label>
              <Form.Select
                value={documentForm.category}
                onChange={(e) => setDocumentForm({ ...documentForm, category: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {getDocumentCategories().map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Select File</Form.Label>
              <Form.Control
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files[0] })}
                required
              />
              <Form.Text className="text-muted">
                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB)
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={documentForm.description}
                onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                placeholder="Add a brief description..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setShowDocumentModal(false);
              setReuploadDocumentId(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  {reuploadDocumentId ? 'Reuploading...' : 'Uploading...'}
                </>
              ) : (
                <>
                  <FaFileUpload className="me-2" />
                  {reuploadDocumentId ? 'Reupload Document' : 'Upload Document'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Document Confirmation Modal */}
      <Modal show={showDeleteConfirmModal} onHide={() => setShowDeleteConfirmModal(false)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="text-danger">
            <FaTrash className="me-2" />
            Delete Document
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          {documentToDelete && (
            <div>
              <div className="alert alert-warning mb-3" role="alert">
                <strong>Warning:</strong> This action cannot be undone.
              </div>
              <p className="mb-2">
                <strong>Document:</strong> {documentToDelete.originalName}
              </p>
              <p className="mb-3">
                <strong>Category:</strong> {documentToDelete.category}
              </p>
              <p className="text-muted mb-0">
                Are you sure you want to permanently delete this document?
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowDeleteConfirmModal(false);
              setDocumentToDelete(null);
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDeleteDocument}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Deleting...
              </>
            ) : (
              <>
                <FaTrash className="me-2" />
                Delete Document
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Change Password Modal */}
      <Modal 
        show={showPasswordModal} 
        onHide={() => setShowPasswordModal(false)} 
        centered 
        className="change-password-modal"
      >
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

      {/* Document Viewer Modal */}
      <Modal 
        show={showDocumentViewer} 
        onHide={closeDocumentViewer} 
        size="xl" 
        centered 
        className="document-viewer-modal"
        style={{ zIndex: 1060 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEye className="me-2" />
            View Document - {viewingDocument?.originalName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {viewingDocument && (
            <div className="document-viewer" style={{ minHeight: '500px', maxHeight: '70vh', overflow: 'auto' }}>
              {viewingDocument.mimetype?.includes('image') ? (
                <img loading="lazy" src={viewingDocument.url} 
                  alt={viewingDocument.originalName}
                  className="w-100 h-auto"
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                />
              ) : viewingDocument.mimetype?.includes('pdf') ? (
                <iframe
                  src={viewingDocument.url}
                  title={viewingDocument.originalName}
                  width="100%"
                  height="500px"
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="text-center p-5">
                  <FaFileAlt size={64} className="text-muted mb-3" />
                  <h5>Document Preview Not Available</h5>
                  <p className="text-muted mb-4">
                    This document type cannot be previewed in the browser.
                  </p>
                  <div className="d-flex gap-2 justify-content-center">
                    <Button 
                      variant="primary" 
                      onClick={() => handleDocumentDownload(viewingDocument._id, viewingDocument.originalName)}
                    >
                      <FaDownload className="me-2" />
                      Download to View
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="text-muted small">
              <strong>Category:</strong> {getDocumentCategories().find(cat => cat.value === viewingDocument?.category)?.label || viewingDocument?.category}
              {viewingDocument?.description && (
                <>
                  <br />
                  <strong>Description:</strong> {viewingDocument.description}
                </>
              )}
              <br />
              <strong>Uploaded:</strong> {viewingDocument?.uploadedAt ? new Date(viewingDocument.uploadedAt).toLocaleDateString('en-GB') : 'N/A'}
            </div>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-primary" 
                onClick={() => handleDocumentDownload(viewingDocument?._id, viewingDocument?.originalName)}
              >
                <FaDownload className="me-2" />
                Download
              </Button>
              <Button variant="secondary" onClick={closeDocumentViewer}>
                Close
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyProfile;

