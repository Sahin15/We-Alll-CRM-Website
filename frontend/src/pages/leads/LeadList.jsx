import { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Alert,
  Spinner,
  ProgressBar,
  Tabs,
  Tab,
} from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaEye, FaFilter, FaEnvelope, FaCheck, FaHistory, FaArrowUp, FaUserCheck, FaUsers, FaUser } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { leadApi } from "../../api/leadApi";
import emailService from "../../services/emailService";
import EmailHistoryModal from "../../components/leads/EmailHistoryModal";
import FollowUpDashboard from "../../components/leads/FollowUpDashboard";
import LeadMeetingsDashboard from "../../components/leads/LeadMeetingsDashboard";
import MultipleContactsForm from "../../components/leads/MultipleContactsForm";
import { formatDate } from "../../utils/helpers";
import "./LeadList.css";

const LeadList = () => {
  const { user, token } = useAuth();
  const { id } = useParams(); // For edit mode
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('leadListTab') || 'followup');
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    phoneDesignation: "",
    phoneLabel: "Primary",
    email: "",
    companyName: "",
    service: [],
    customService: "",
    budget: "",
    source: "",
    customSource: "",
    reference: "",
    status: "New",
  });
  const [formContacts, setFormContacts] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterHasEmail, setFilterHasEmail] = useState("");
  const [filterFollowUp, setFilterFollowUp] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailProgress, setEmailProgress] = useState(0);
  const [emailResults, setEmailResults] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('vyapaar-expo-2');
  const [showEmailHistoryModal, setShowEmailHistoryModal] = useState(false);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState(null);

  // Team / assignment state — assign access for hod, manager, admin, superadmin, or Sales department members
  const isManager = ['admin', 'superadmin', 'manager', 'hod'].includes(user?.role) || 
                    user?.department?.name === 'Sales' || 
                    user?.department === 'Sales';
  const [myLeadsOnly, setMyLeadsOnly] = useState(() => sessionStorage.getItem('leadListMyOnly') !== 'false');
  const [filterAssignedTo, setFilterAssignedTo] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningLead, setAssigningLead] = useState(null);
  const [assignTarget, setAssignTarget] = useState('');
  const navigate = useNavigate();

  // Save and restore scroll position and active tab when navigating to/from lead details
  const scrollKey = 'leadListScrollY';

  // Restore scroll after leads finish loading (or instantly if loaded from cache)
  useEffect(() => {
    if (!loading) {
      const saved = sessionStorage.getItem(scrollKey);
      if (saved) {
        // Double rAF ensures layout is fully painted before scrolling
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: parseInt(saved), behavior: 'instant' });
            sessionStorage.removeItem(scrollKey);
          });
        });
      }
    }
  }, [loading]);

  // Persist active tab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('leadListTab', activeTab);
  }, [activeTab]);

  // Persist myLeadsOnly to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('leadListMyOnly', myLeadsOnly ? 'true' : 'false');
  }, [myLeadsOnly]);

  // Show scroll-to-top button when scrolled down
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleViewLead = (leadId) => {
    sessionStorage.setItem(scrollKey, window.scrollY);
    navigate(`/leads/${leadId}`);
  };

  // Fetch sales team members for assignment
  useEffect(() => {
    if (isManager) {
      import('../../api/userApi').then(({ userApi }) => {
        userApi.getAllUsers().then(res => {
          const users = Array.isArray(res.data) ? res.data : (res.data?.users || []);
          // Only show Sales department members
          const salesMembers = users.filter(u => {
            const deptName = (u.department?.name || u.department || '').toLowerCase();
            return deptName === 'sales' && ['employee', 'hod', 'manager'].includes(u.role);
          });
          setTeamMembers(salesMembers);
        }).catch(() => {});
      });
    }
  }, [isManager]);

  const handleOpenAssign = (lead) => {
    setAssigningLead(lead);
    setAssignTarget(lead.assignedTo?._id || '');
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async () => {
    if (!assignTarget) { toast.error('Select a team member'); return; }
    try {
      await leadApi.assignLead(assigningLead._id, assignTarget);
      toast.success('Lead assigned successfully');
      setShowAssignModal(false);
      setAssigningLead(null);
      fetchLeads(true);
    } catch {
      toast.error('Failed to assign lead');
    }
  };

  // Function to format budget for display (convert old format to new compact format)
  const formatBudgetForDisplay = (budget) => {
    if (!budget) return "N/A";
    
    // Convert old format to new format
    const budgetMap = {
      "20,000 to 50,000 /Month": "20k to 50k /Month",
      "50,000 to 80,000 /Month": "50k to 80k /Month", 
      "80,000 to 100,000 /Month": "80k to 100k /Month",
      "100,000 to 200,000 /Month": "100k to 200k /Month"
    };
    
    return budgetMap[budget] || budget;
  };

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-switch to cards on mobile
      if (mobile) {
        setViewMode('cards');
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const serviceOptions = [
    "Marketing",
    "SEO",
    "SSM",
    "Logo Designing",
    "Web Development",
    "Web Designing",
    "App Development",
    "Facebook Page Recovery",
    "Bridal Package",
  ];

  const budgetOptions = [
    "20k to 50k /Month",
    "50k to 80k /Month",
    "80k to 100k /Month",
    "100k to 200k /Month",
    "Custom",
  ];

  const sourceOptions = [
    "Website", 
    "Seminar",
    "Referral",
    "Social Media",
    "Advertisement",
    "Cold Call",
    "Vyapaar Expo",
    "Kaustav Mukherjee",
    "Rahul Shaw",
    "Other",
  ];
  const statusOptions = [
    "New",
    "Contacted",
    "Qualified",
    "Proposal Sent",
    "Negotiation",
    "Won",
    "Lost",
  ];

  useEffect(() => {
    if (!user || !token) {
      toast.error("Please log in to access lead management");
      navigate("/login");
      return;
    }

    // If returning from a lead detail (cache exists), load instantly then refresh silently
    const cached = sessionStorage.getItem(LEADS_CACHE_KEY);
    const isReturning = !!sessionStorage.getItem(scrollKey);

    if (cached && isReturning && !filterStatus && !filterSource) {
      try {
        setLeads(JSON.parse(cached));
        setLoading(false);
        // Silently refresh in background
        fetchLeads(true);
      } catch {
        fetchLeads();
      }
    } else {
      fetchLeads();
    }

    fetchEmailTemplates();
  }, [filterStatus, filterSource, myLeadsOnly, filterAssignedTo, user, token, navigate]);

  // Handle edit mode when ID is present in URL
  useEffect(() => {
    if (id) {
      fetchLeadForEdit(id);
    }
  }, [id]);

  const fetchLeadForEdit = async (leadId) => {
    try {
      const response = await leadApi.getLeadById(leadId);
      setEditMode(true);
      setCurrentLead(response.data);
      setShowModal(true);
      setFormData({
        fullName: response.data.fullName || "",
        phone: response.data.phone || "",
        phoneDesignation: response.data.phoneDesignation || "",
        phoneLabel: response.data.phoneLabel || "Primary",
        email: response.data.email || "",
        companyName: response.data.companyName || "",
        service: Array.isArray(response.data.service) ? response.data.service : (response.data.service ? [response.data.service] : []),
        customService: response.data.customService || "",
        budget: response.data.budget || "",
        source: response.data.source || "",
        customSource: response.data.customSource || "",
        reference: response.data.reference || "",
        status: response.data.status || "New",
      });
      setFormContacts(response.data.contacts || []);
    } catch (error) {
      console.error("Lead fetch error:", error);
      toast.error("Failed to fetch lead for editing");
      navigate("/leads");
    }
  };

  const LEADS_CACHE_KEY = 'leadListCache';

  const fetchLeads = async (background = false) => {
    try {
      if (!user || !token) return;

      if (!background) setLoading(true);

      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSource) params.source = filterSource;
      if (myLeadsOnly) params.myLeads = 'true';
      else if (filterAssignedTo) params.assignedTo = filterAssignedTo;

      const response = await leadApi.getAllLeads(params);
      setLeads(response.data);
      sessionStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(response.data));
    } catch (error) {
      console.error("Lead fetch error:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
      }
    } finally {
      if (!background) setLoading(false);
    }
  };

  // Check if current user can edit a lead
  const canEditLead = (lead) => {
    if (!user) return false;
    
    // Admin, superadmin, hr, and manager can edit any lead
    if (['admin', 'superadmin', 'hr', 'manager'].includes(user.role)) {
      return true;
    }
    
    // User can edit if they are assigned to the lead
    const userId = user.id || user._id;
    if (lead.assignedTo && (lead.assignedTo._id === userId || lead.assignedTo === userId)) {
      return true;
    }
    
    // User can edit if they created the lead
    if (lead.createdBy && (lead.createdBy._id === userId || lead.createdBy === userId)) {
      return true;
    }
    
    return false;
  };

  const fetchEmailTemplates = async () => {
    // Define fallback templates first
    const fallbackTemplates = [
      {
        id: 'vyapaar-expo',
        name: 'Vyapaar Expo Thank You',
        description: 'Thank you email for Vyapaar Expo leads with special offer',
        preview: 'Thank you for visiting We Alll at Vyapaar Expo...',
      },
      {
        id: 'vyapaar-expo-2',
        name: 'Vyapaar Expo 2.0 Thank You',
        description: 'Professional thank you email for Vyapaar Expo 2.0 at Biswa Bangla Convention Center',
        preview: 'Thank you for connecting at Vyapaar Expo 2.0...',
      },
      {
        id: 'general-followup',
        name: 'General Follow-up',
        description: 'General follow-up email for leads and prospects',
        preview: 'Thank you for your interest in our services...',
      },
      {
        id: 'service-inquiry',
        name: 'Service Inquiry Response',
        description: 'Response to service inquiry with detailed information',
        preview: 'Thank you for inquiring about our services...',
      }
    ];

    try {
      const response = await emailService.getEmailTemplates();
      if (response && response.success && response.data && response.data.length > 0) {
        setAvailableTemplates(response.data);
      } else {
        setAvailableTemplates(fallbackTemplates);
      }
    } catch (error) {
      console.error("❌ Failed to fetch email templates from API:", error.response?.status, error.response?.data?.message || error.message);
      setAvailableTemplates(fallbackTemplates);
    }
  };

  const handleShowModal = (lead = null) => {
    if (lead) {
      setEditMode(true);
      setCurrentLead(lead);
      setFormData({
        fullName: lead.fullName || "",
        phone: lead.phone || "",
        phoneDesignation: lead.phoneDesignation || "",
        phoneLabel: lead.phoneLabel || "Primary",
        email: lead.email || "",
        companyName: lead.companyName || "",
        service: Array.isArray(lead.service) ? lead.service : (lead.service ? [lead.service] : []),
        customService: lead.customService || "",
        budget: lead.budget || "",
        source: lead.source || "",
        customSource: lead.customSource || "",
        reference: lead.reference || "",
        status: lead.status || "New",
      });
      setFormContacts(lead.contacts || []);
    } else {
      setEditMode(false);
      setCurrentLead(null);
      setFormData({
        fullName: "",
        phone: "",
        phoneDesignation: "",
        phoneLabel: "Primary",
        email: "",
        companyName: "",
        service: [],
        customService: "",
        budget: "",
        source: "",
        customSource: "",
        reference: "",
        status: "New",
      });
      setFormContacts([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentLead(null);
    setFormContacts([]);
    // If we were in edit mode from URL, navigate back to list
    if (id) {
      navigate("/leads");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle multiple service selection
  const handleServiceChange = (service) => {
    const currentServices = formData.service || [];
    const updatedServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service];
    
    setFormData({ ...formData, service: updatedServices });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if user is authenticated
      if (!user || !token) {
        toast.error("Please log in to create leads");
        navigate("/login");
        return;
      }

      // Separate new contacts (with temporary _id) from existing ones
      const newContacts = formContacts.filter(contact => contact._id && contact._id.match(/^\d+$/));
      const existingContacts = formContacts.filter(contact => contact._id && !contact._id.match(/^\d+$/));

      // Prepare submit data (without contacts)
      const submitData = {
        ...formData,
        phone: formData.phone ? Number(formData.phone) : undefined,
        service: formData.service,
        source: (formData.customSource || '').trim() || formData.source,
      };

      // Remove customSource from submit data
      delete submitData.customSource;

      if (editMode) {
        // Update the lead
        await leadApi.updateLead(currentLead._id, submitData);
        
        // Add new contacts using dedicated endpoints
        for (const contact of newContacts) {
          const { _id, ...contactData } = contact;
          try {
            await leadApi.addContact(currentLead._id, contactData);
          } catch (error) {
            console.error("Error adding contact:", error);
            toast.warning("Lead updated but some contacts failed to add");
          }
        }
        
        toast.success("Lead updated successfully");
        
        // Trigger a custom event to notify LeadDetails page to refresh
        window.dispatchEvent(new CustomEvent('leadUpdated', { detail: { leadId: currentLead._id } }));
      } else {
        // For new leads, include contacts in creation
        const cleanedContacts = newContacts.map(({ _id, ...rest }) => rest);
        submitData.contacts = cleanedContacts;
        await leadApi.createLead(submitData);
        toast.success("Lead created successfully");
      }
      handleCloseModal();
      fetchLeads();
      // If we were in edit mode from URL, navigate back to list
      if (id) {
        navigate("/leads");
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }

      if (status === 403) {
        toast.error("You don't have permission to perform this action.");
        return;
      }

      if (status === 400) {
        // Show the exact server message — it's already human-readable
        toast.error(message || "Please check your input and try again.");
        return;
      }

      toast.error(message || `Failed to ${editMode ? "update" : "create"} lead.`);    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      try {
        await leadApi.deleteLead(id);
        toast.success("Lead deleted successfully");
        fetchLeads();
      } catch (error) {
        toast.error("Failed to delete lead");
      }
    }
  };

  const handleShowEmailHistory = (lead) => {
    setSelectedLeadForHistory(lead);
    setShowEmailHistoryModal(true);
  };

  const handleCloseEmailHistory = () => {
    setShowEmailHistoryModal(false);
    setSelectedLeadForHistory(null);
  };

  // Bulk email functions
  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };

  const handleSelectAllLeads = () => {
    const leadsWithEmail = filteredLeads.filter(lead => lead.email);
    if (selectedLeads.length === leadsWithEmail.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leadsWithEmail.map(lead => lead._id));
    }
  };

  const handleBulkEmail = () => {
    if (selectedLeads.length === 0) {
      toast.warning("Please select leads to send emails to");
      return;
    }
    setShowBulkEmailModal(true);
  };

  const sendBulkEmails = async () => {
    try {
      setEmailSending(true);
      setEmailProgress(0);
      
      const response = await emailService.sendBulkEmail({
        leadIds: selectedLeads,
        template: selectedTemplate
      });

      if (response.success) {
        setEmailResults(response.data);
        toast.success(`Emails sent successfully! ${response.data.sent}/${response.data.total} delivered`);
        setSelectedLeads([]);
      } else {
        toast.error(response.message || "Failed to send emails");
      }
    } catch (error) {
      console.error("Bulk email error:", error);
      toast.error("Failed to send bulk emails");
    } finally {
      setEmailSending(false);
      setShowBulkEmailModal(false);
    }
  };

  // Filter leads based on status, source, has email, follow-up status, and search query
  const filteredLeads = leads.filter(lead => {
    const statusMatch = !filterStatus || lead.status === filterStatus;
    const sourceMatch = !filterSource || lead.source === filterSource;
    
    // Has email filter
    const hasEmailMatch = !filterHasEmail || 
      (filterHasEmail === 'yes' && lead.email) ||
      (filterHasEmail === 'no' && !lead.email);
    
    // Follow-up filter
    let followUpMatch = true;
    if (filterFollowUp) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const next7Days = new Date(todayStart);
      next7Days.setDate(next7Days.getDate() + 7);

      const pendingFollowUps = lead.followUps?.filter(f => f.status === 'Pending') || [];
      
      if (filterFollowUp === 'overdue') {
        followUpMatch = pendingFollowUps.some(f => new Date(f.scheduledDate) < todayStart);
      } else if (filterFollowUp === 'today') {
        followUpMatch = pendingFollowUps.some(f => {
          const date = new Date(f.scheduledDate);
          return date >= todayStart && date < todayEnd;
        });
      } else if (filterFollowUp === 'week') {
        followUpMatch = pendingFollowUps.some(f => {
          const date = new Date(f.scheduledDate);
          return date >= todayStart && date < next7Days;
        });
      } else if (filterFollowUp === 'none') {
        followUpMatch = pendingFollowUps.length === 0;
      }
    }
    
    // Search query filter (searches in name, email, phone, company)
    const searchMatch = !searchQuery || 
      lead.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.toString().includes(searchQuery) ||
      lead.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && sourceMatch && hasEmailMatch && followUpMatch && searchMatch;
  });

  const getStatusVariant = (status) => {
    switch (status) {
      case "New":
        return "info";
      case "Contacted":
        return "primary";
      case "Qualified":
        return "success";
      case "Proposal Sent":
        return "warning";
      case "Negotiation":
        return "purple";
      case "Won":
        return "success";
      case "Lost":
        return "danger";
      default:
        return "primary";
    }
  };

  const getEmailStatusVariant = (emailStats) => {
    if (!emailStats || emailStats.emailStatus === 'never-sent') {
      return 'secondary';
    }
    switch (emailStats.emailStatus) {
      case 'sent':
        return 'success';
      case 'failed':
        return 'danger';
      case 'bounced':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getEmailStatusText = (emailStats) => {
    if (!emailStats || emailStats.emailStatus === 'never-sent') {
      return 'No Email';
    }
    switch (emailStats.emailStatus) {
      case 'sent':
        return `${emailStats.totalEmailsSent || 0} Sent`;
      case 'failed':
        return 'Failed';
      case 'bounced':
        return 'Bounced';
      default:
        return 'No Email';
    }
  };

  const getSimpleEmailStatus = (emailStats) => {
    if (!emailStats || emailStats.emailStatus === 'never-sent') {
      return { text: 'No', variant: 'secondary', icon: '✉️' };
    }
    switch (emailStats.emailStatus) {
      case 'sent':
        return { text: 'Yes', variant: 'success', icon: '✅' };
      case 'failed':
        return { text: 'Failed', variant: 'danger', icon: '❌' };
      case 'bounced':
        return { text: 'Bounced', variant: 'warning', icon: '⚠️' };
      default:
        return { text: 'No', variant: 'secondary', icon: '✉️' };
    }
  };

  const getSourceVariant = (source) => {
    switch (source) {
      case "Website":
        return "primary";
      case "Seminar":
        return "info";
      case "Vyapaar Expo":
        return "warning";
      case "Referral":
        return "success";
      case "Social Media":
        return "info";
      case "Advertisement":
        return "warning";
      case "Cold Call":
        return "danger";
      case "Kaustav Mukherjee":
        return "success";
      case "Rahul Shaw":
        return "info";
      case "Other":
        return "dark";
      default:
        return "secondary";
    }
  };

  // Get company styling with subtle color highlight
  const getCompanyStyle = (companyName) => {
    if (!companyName || companyName === "Individual") {
      return {
        backgroundColor: '#f8f9fa',
        color: '#6c757d',
        borderLeft: '3px solid #dee2e6'
      };
    }
    
    // Subtle gradient background with accent border
    return {
      backgroundColor: '#f0f7ff',
      color: '#0d6efd',
      borderLeft: '3px solid #0d6efd',
      fontWeight: '500'
    };
  };

  const getFollowUpStatus = (lead) => {
    const pendingFollowUps = lead.followUps?.filter(f => f.status === 'Pending') || [];
    if (pendingFollowUps.length === 0) {
      return { text: 'None', variant: 'secondary', icon: '📅' };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Sort by date to get the earliest
    const sortedFollowUps = [...pendingFollowUps].sort((a, b) => 
      new Date(a.scheduledDate) - new Date(b.scheduledDate)
    );
    const nextFollowUp = sortedFollowUps[0];
    const followUpDate = new Date(nextFollowUp.scheduledDate);

    if (followUpDate < todayStart) {
      return { text: 'Overdue', variant: 'danger', icon: '🔴', date: followUpDate };
    } else if (followUpDate >= todayStart && followUpDate < todayEnd) {
      return { text: 'Today', variant: 'warning', icon: '🟡', date: followUpDate };
    } else {
      return { text: 'Upcoming', variant: 'info', icon: '🔵', date: followUpDate };
    }
  };

  const formatLastEmailDate = (emailStats) => {
    if (!emailStats || !emailStats.lastEmailSentAt) {
      return 'Never';
    }
    return formatDate(emailStats.lastEmailSentAt);
  };

  // Generate color-coded badge for assigned team member
  const getAssignedToColor = (assignedTo) => {
    if (!assignedTo) return '#E9ECEF';
    
    // Generate consistent color based on name hash - use distinct colors
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'];
    const hash = assignedTo.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getAssignedToBadge = (lead) => {
    if (!lead.assignedTo) {
      return (
        <span 
          style={{ 
            backgroundColor: '#E9ECEF',
            color: '#495057',
            fontSize: '0.75rem', 
            padding: '0.4rem 0.6rem',
            fontWeight: '600',
            minWidth: '32px',
            textAlign: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            cursor: 'default'
          }}
          title="Unassigned"
        >
          UN
        </span>
      );
    }
    
    const initials = lead.assignedTo.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return (
      <span 
        style={{ 
          backgroundColor: getAssignedToColor(lead.assignedTo),
          color: '#FFFFFF',
          fontSize: '0.75rem', 
          padding: '0.4rem 0.6rem',
          fontWeight: '600',
          minWidth: '32px',
          textAlign: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          cursor: 'default',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        title={lead.assignedTo.name}
      >
        {initials}
      </span>
    );
  };

  // Compact lead card component for 3x3 grid layout
  const LeadCard = ({ lead, showCheckbox = false, isSelected = false, onCheckboxChange }) => (
    <Card className="mb-3 lead-card shadow-sm compact-card">
      <Card.Body className="p-2">
        {/* Header with Checkbox, Name and Status */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-start flex-grow-1">
            {showCheckbox && lead.email && (
              <Form.Check
                type="checkbox"
                className="me-2 mt-1"
                checked={isSelected}
                onChange={onCheckboxChange}
                style={{ minWidth: '16px' }}
              />
            )}
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 mb-1">
                <h6 className="lead-name mb-0 text-truncate" title={lead.fullName}>
                  {lead.fullName}
                </h6>
                {getAssignedToBadge(lead)}
              </div>
              <div 
                className="company-highlight-sm"
                style={{
                  ...getCompanyStyle(lead.companyName),
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block'
                }}
                title={lead.companyName || "Individual"}
              >
                {lead.companyName || "Individual"}
              </div>
            </div>
          </div>
          <div className="d-flex flex-column gap-1">
            <Badge bg={getStatusVariant(lead.status)} className="status-badge-sm">
              {lead.status}
            </Badge>
            <Badge bg={getSourceVariant(lead.source)} className="source-badge-sm">
              {lead.source.length > 8 ? lead.source.substring(0, 8) + '...' : lead.source}
            </Badge>
          </div>
        </div>

        {/* Contact Info */}
        <div className="contact-info-compact mb-2">
          <div className="d-flex align-items-center mb-1">
            <span className="info-icon-sm">📞</span>
            <small className="text-truncate ms-1" title={lead.phone}>
              {lead.phone || "No phone"}
            </small>
          </div>
          <div className="d-flex align-items-center mb-1">
            <span className="info-icon-sm">✉️</span>
            <small className="text-truncate ms-1" title={lead.email}>
              {lead.email || "No email"}
            </small>
          </div>
        </div>

        {/* Service and Budget */}
        <div className="service-budget-compact mb-2">
          <div className="d-flex align-items-center mb-1">
            <span className="info-icon-sm">🎯</span>
            <small className="text-truncate ms-1 fw-medium" title={
              Array.isArray(lead.service) && lead.service.length > 0 
                ? lead.service.join(", ") 
                : lead.service || "Not specified"
            }>
              {Array.isArray(lead.service) && lead.service.length > 0 
                ? lead.service.slice(0, 1).join("") + (lead.service.length > 1 ? " +" : "")
                : lead.service || "Not specified"}
            </small>
          </div>
          <div className="d-flex align-items-center">
            <span className="info-icon-sm">💰</span>
            <small className="text-truncate ms-1 text-success fw-bold" title={formatBudgetForDisplay(lead.budget)}>
              {formatBudgetForDisplay(lead.budget).replace(' /Month', '')}
            </small>
          </div>
        </div>

        {/* Footer with Email Status, Follow-Up Status and Actions */}
        <div className="d-flex justify-content-between align-items-center pt-1 border-top">
          <div className="d-flex align-items-center gap-1">
            <Badge bg={getEmailStatusVariant(lead.emailStats)} className="email-badge-sm">
              {getSimpleEmailStatus(lead.emailStats).icon}
            </Badge>
            {(() => {
              const followUpStatus = getFollowUpStatus(lead);
              return (
                <Badge 
                  bg={followUpStatus.variant} 
                  className="email-badge-sm"
                  title={followUpStatus.date ? `Next: ${formatDate(followUpStatus.date)}` : 'No follow-up scheduled'}
                >
                  {followUpStatus.icon}
                </Badge>
              );
            })()}
          </div>
          <div className="btn-group" role="group">
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => handleViewLead(lead._id)}
              title="View Details"
              className="action-btn-xs"
            >
              <FaEye size={10} />
            </Button>
            {canEditLead(lead) && (
              <Button
                size="sm"
                variant="outline-success"
                onClick={() => handleShowModal(lead)}
                title="Edit Lead"
                className="action-btn-xs"
              >
                <FaEdit size={10} />
              </Button>
            )}
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <Button
                size="sm"
                variant="outline-danger"
                onClick={() => handleDelete(lead._id)}
                title="Delete Lead"
                className="action-btn-xs"
              >
                <FaTrash size={10} />
              </Button>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Lead Management</h2>
              <div className="mt-2">
                <Badge bg="primary" className="me-2 px-3 py-2" style={{ fontSize: '0.9rem' }}>
                  Total Leads: {leads.length}
                </Badge>
                <Badge bg="info" className="me-2 px-3 py-2" style={{ fontSize: '0.9rem' }}>
                  With Email: {leads.filter(lead => lead.email).length}
                </Badge>
                <Badge bg="secondary" className="px-3 py-2" style={{ fontSize: '0.9rem' }}>
                  Without Email: {leads.filter(lead => !lead.email).length}
                </Badge>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Button variant="primary" onClick={() => handleShowModal()}>
                <FaPlus className="me-2" />
                Add Lead
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Tabs for Follow-Up Dashboard, Lead List, and Meetings */}
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="followup" title="Follow-Up Dashboard">
          <Row className="mb-4">
            <Col>
              <FollowUpDashboard />
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="meetings" title="Lead Meetings">
          <Row className="mb-4">
            <Col>
              <LeadMeetingsDashboard />
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="leads" title="Lead List">
      {/* Filters - Compact Layout */}
      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">

        {/* Table / Cards toggle — desktop only */}
        {!isMobile && (
          <div className="btn-group btn-group-sm" role="group">
            <Button variant={viewMode === 'table' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setViewMode('table')}>Table</Button>
            <Button variant={viewMode === 'cards' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
          </div>
        )}

        <div className="btn-group btn-group-sm" role="group">
          <button type="button" className={`btn btn-sm ${!myLeadsOnly ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setMyLeadsOnly(false); setFilterAssignedTo(''); }}>All Leads</button>
          <button type="button" className={`btn btn-sm ${myLeadsOnly ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setMyLeadsOnly(true); setFilterAssignedTo(''); }}>My Leads</button>
        </div>

        {isManager && !myLeadsOnly && (
          <Form.Select size="sm" value={filterAssignedTo} onChange={(e) => setFilterAssignedTo(e.target.value)} style={{ width: '130px' }}>
            <option value="">All Members</option>
            {teamMembers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
          </Form.Select>
        )}

        <Form.Select size="sm" value={filterStatus} onChange={(e) => {
          if (e.target.value === 'has-email' || e.target.value === 'no-email') {
            setFilterHasEmail(e.target.value === 'has-email' ? 'yes' : 'no');
            setFilterStatus('');
          } else {
            setFilterHasEmail('');
            setFilterStatus(e.target.value);
          }
        }} style={{ width: '130px' }}>
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          <option disabled>──────</option>
          <option value="has-email">✉ Has Email</option>
          <option value="no-email">✉ No Email</option>
        </Form.Select>

        <Form.Select size="sm" value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={{ width: '120px' }}>
          <option value="">All Sources</option>
          {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </Form.Select>

        <Form.Select size="sm" value={filterFollowUp} onChange={(e) => setFilterFollowUp(e.target.value)} style={{ width: '155px' }}>
          <option value="">All Follow-Ups</option>
          <option value="overdue">🔴 Overdue</option>
          <option value="today">🟡 Today</option>
          <option value="week">🔵 This Week</option>
          <option value="none">No Follow-Up</option>
        </Form.Select>

        <Form.Control size="sm" type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '160px' }} />

        <Button size="sm" variant="outline-secondary" onClick={() => { setFilterStatus(""); setFilterSource(""); setFilterHasEmail(""); setFilterFollowUp(""); setSearchQuery(""); }}>Clear</Button>

        {filteredLeads.filter(l => l.email).length > 0 && (
          <Button size="sm" variant="outline-primary" onClick={handleSelectAllLeads}>
            {selectedLeads.length === filteredLeads.filter(l => l.email).length ? 'Deselect All' : 'Select All'}
          </Button>
        )}

        <small className="text-muted">{filteredLeads.length} / {leads.length} leads</small>
      </div>

      {/* Bulk email action bar — only when leads are selected */}
      {selectedLeads.length > 0 && (
        <div className="d-flex align-items-center gap-2 mb-3 px-3 py-2 rounded" style={{ background: '#e8f4fd', border: '1px solid #bee3f8' }}>
          <span className="small fw-medium text-primary">{selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected</span>
          <Button size="sm" variant="outline-primary" onClick={handleSelectAllLeads}>
            {selectedLeads.length === filteredLeads.filter(l => l.email).length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button size="sm" variant="primary" onClick={handleBulkEmail}>
            <FaEnvelope className="me-1" size={11} /> Send Email to {selectedLeads.length}
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setSelectedLeads([])}>
            Clear Selection
          </Button>
        </div>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (isMobile || viewMode === 'cards') ? (
                // Card View (Mobile and Desktop)
                <div className="mobile-lead-cards">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => (
                      <LeadCard 
                        key={lead._id}
                        lead={lead} 
                        showCheckbox={true}
                        isSelected={selectedLeads.includes(lead._id)}
                        onCheckboxChange={() => handleSelectLead(lead._id)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-muted">
                        <FaFilter className="mb-2" size={24} />
                        <p className="mb-0">No leads found</p>
                        <small>Try adjusting your filters or add a new lead</small>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Desktop Table View
                <div className="table-responsive">
                  <Table hover className="lead-management-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: '24px' }} />
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '55px' }} />
                      <col style={{ width: '120px' }} />
                    </colgroup>
                    <thead className="table-dark">
                      <tr>
                        <th className="text-center">
                          <Form.Check
                            type="checkbox"
                            checked={selectedLeads.length === filteredLeads.filter(lead => lead.email).length && filteredLeads.filter(lead => lead.email).length > 0}
                            onChange={handleSelectAllLeads}
                            disabled={filteredLeads.filter(lead => lead.email).length === 0}
                          />
                        </th>
                        <th className="text-center">Sl No.</th>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Phone</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th className="text-center">Sent</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.length > 0 ? (
                        filteredLeads.map((lead, index) => (
                          <tr 
                            key={lead._id} 
                            className="lead-table-row"
                            onClick={() => handleViewLead(lead._id)}
                            style={{ cursor: 'pointer' }}
                            title="Click to view lead details"
                          >
                            <td className="text-center">
                              <Form.Check
                                type="checkbox"
                                checked={selectedLeads.includes(lead._id)}
                                onChange={() => handleSelectLead(lead._id)}
                                disabled={!lead.email}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="text-muted small text-center">{index + 1}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div 
                                  className="text-truncate fw-bold" 
                                  title={lead.fullName}
                                  style={{ flex: 1 }}
                                >
                                  {lead.fullName}
                                </div>
                                {getAssignedToBadge(lead)}
                              </div>
                            </td>
                            <td>
                              <div 
                                className="company-highlight text-truncate"
                                style={{
                                  ...getCompanyStyle(lead.companyName),
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.82rem',
                                }}
                                title={lead.companyName || "Individual"}
                              >
                                {lead.companyName || "Individual"}
                              </div>
                            </td>
                            <td>
                              <div 
                                className="text-truncate small" 
                                title={lead.phone || "N/A"}
                              >
                                {lead.phone || "N/A"}
                              </div>
                            </td>
                            <td>
                              <Badge 
                                bg={getSourceVariant(lead.source)}
                                style={{ fontSize: '0.75rem', whiteSpace: 'normal', wordBreak: 'break-word' }}
                                title={lead.source}
                              >
                                {lead.source}
                              </Badge>
                            </td>
                            <td>
                              <Badge 
                                bg={getStatusVariant(lead.status)}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {lead.status}
                              </Badge>
                            </td>
                            <td className="text-center">
                              {(() => {
                                const emailStatus = getSimpleEmailStatus(lead.emailStats);
                                return (
                                  <Badge 
                                    bg={emailStatus.variant}
                                    className="email-status-compact"
                                    title={lead.emailStats?.totalEmailsSent ? 
                                      `${lead.emailStats.totalEmailsSent} emails sent. Last: ${formatLastEmailDate(lead.emailStats)}` : 
                                      'No emails sent'
                                    }
                                  >
                                    {emailStatus.icon}
                                  </Badge>
                                );
                              })()}
                            </td>
                            <td onClick={(e) => e.stopPropagation()} className="text-center">
                              <div className="d-flex justify-content-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => handleViewLead(lead._id)}
                                  title="View Lead"
                                  style={{ padding: '2px 6px', lineHeight: 1 }}
                                >
                                  <FaEye size={11} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-success"
                                  onClick={() => handleShowModal(lead)}
                                  title="Edit Lead"
                                  style={{ padding: '2px 6px', lineHeight: 1 }}
                                >
                                  <FaEdit size={11} />
                                </Button>
                                {isManager && (
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => handleOpenAssign(lead)}
                                    title={`Assign — ${lead.assignedTo?.name || 'Unassigned'}`}
                                    style={{ padding: '2px 6px', lineHeight: 1 }}
                                  >
                                    <FaUserCheck size={11} />
                                  </Button>
                                )}
                                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleDelete(lead._id)}
                                    title="Delete Lead"
                                    style={{ padding: '2px 6px', lineHeight: 1 }}
                                  >
                                    <FaTrash size={11} />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="text-center py-4">
                            <div className="text-muted">
                              <FaFilter className="mb-2" size={24} />
                              <p className="mb-0">No leads found</p>
                              <small>Try adjusting your filters or add a new lead</small>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
        </Tab>
      </Tabs>

      {/* Add/Edit Lead Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="xl" centered className="lead-modal">
        <Modal.Header closeButton className="lead-modal-header">
          <Modal.Title className="d-flex align-items-center">
            <div className="modal-icon me-3">
              {editMode ? <FaEdit /> : <FaPlus />}
            </div>
            <div>
              <h4 className="mb-0">{editMode ? "Edit Lead" : "Add New Lead"}</h4>
              <small className="opacity-75">
                {editMode ? "Update lead information" : "Capture new lead details"}
              </small>
            </div>
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="lead-modal-body">
            {/* Personal Information Section */}
            <div className="form-section mb-4">
              <div className="section-header mb-3">
                <h5 className="section-title">👤 Personal Information</h5>
                <p className="section-subtitle">Basic contact details</p>
              </div>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      Full Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      placeholder="Enter full name"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      Phone Number <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="Enter phone number"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Designation</Form.Label>
                    <Form.Control
                      type="text"
                      name="phoneDesignation"
                      value={formData.phoneDesignation}
                      onChange={handleChange}
                      placeholder="e.g., Manager, Director, Owner"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Label</Form.Label>
                    <Form.Select
                      name="phoneLabel"
                      value={formData.phoneLabel}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      <option value="Primary">Primary</option>
                      <option value="Office">Office</option>
                      <option value="Personal">Personal</option>
                      <option value="Other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="lead@example.com"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Company Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Multiple Contacts Section */}
            <div className="form-section mb-4">
              <div className="section-header mb-3">
                <h5 className="section-title">📞 Additional Contacts</h5>
                <p className="section-subtitle">Add multiple contact persons with their designations</p>
              </div>
              <MultipleContactsForm 
                contacts={formContacts} 
                onContactsChange={setFormContacts}
              />
            </div>

            {/* Service Requirements Section */}
            <div className="form-section mb-4">
              <div className="section-header mb-3">
                <h5 className="section-title">🎯 Service Requirements</h5>
                <p className="section-subtitle">What services does the client need?</p>
              </div>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      Services Required <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="services-grid">
                      {serviceOptions.map((service) => (
                        <div key={service} className="service-checkbox-item">
                          <Form.Check
                            type="checkbox"
                            id={`service-${service}`}
                            label={service}
                            checked={formData.service.includes(service)}
                            onChange={() => handleServiceChange(service)}
                            className="service-checkbox"
                          />
                        </div>
                      ))}
                    </div>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Custom Service</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="customService"
                      value={formData.customService}
                      onChange={handleChange}
                      placeholder="Describe any custom service requirements..."
                      className="form-control-modern"
                    />
                    <Form.Text className="text-muted">
                      Specify any services not listed above
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Budget & Source Section */}
            <div className="form-section mb-4">
              <div className="section-header mb-3">
                <h5 className="section-title">💰 Budget & Source</h5>
                <p className="section-subtitle">Budget range and lead source information</p>
              </div>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Budget Range</Form.Label>
                    <Form.Select
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      <option value="">Select budget range</option>
                      {budgetOptions.map((budget) => (
                        <option key={budget} value={budget}>
                          {budget}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Lead Source</Form.Label>
                    <Form.Select
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      <option value="">Select lead source</option>
                      {sourceOptions.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Custom Lead Source</Form.Label>
                    <Form.Control
                      type="text"
                      name="customSource"
                      value={formData.customSource}
                      onChange={handleChange}
                      placeholder="Enter custom source"
                      className="form-control-modern"
                    />
                    <Form.Text className="text-muted">
                      If not listed above, specify custom source
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Additional Information Section */}
            <div className="form-section">
              <div className="section-header mb-3">
                <h5 className="section-title">📋 Additional Information</h5>
                <p className="section-subtitle">Reference and status details</p>
              </div>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Reference</Form.Label>
                    <Form.Control
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      placeholder="Who referred this lead?"
                      className="form-control-modern"
                    />
                    <Form.Text className="text-muted">
                      Name of person or company who referred this lead
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Lead Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Modal.Body>
          
          <Modal.Footer className="lead-modal-footer">
            <Button 
              variant="outline-secondary" 
              onClick={handleCloseModal}
              className="btn-modern btn-cancel"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              className="btn-modern btn-submit"
            >
              <span className="me-2">
                {editMode ? <FaEdit /> : <FaPlus />}
              </span>
              {editMode ? "Update Lead" : "Create Lead"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Bulk Email Modal */}
      <Modal show={showBulkEmailModal} onHide={() => setShowBulkEmailModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEnvelope className="me-2" />
            Send Bulk Email
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <h5>Email Recipients ({selectedLeads.length} leads selected)</h5>
            <div className="selected-leads-preview">
              {filteredLeads
                .filter(lead => selectedLeads.includes(lead._id))
                .slice(0, 5)
                .map(lead => (
                  <Badge key={lead._id} bg="primary" className="me-2 mb-2">
                    {lead.fullName} ({lead.email})
                  </Badge>
                ))}
              {selectedLeads.length > 5 && (
                <Badge bg="secondary" className="me-2 mb-2">
                  +{selectedLeads.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h5>Email Template Selection</h5>
            <Form.Group>
              <Form.Label>Choose Email Template</Form.Label>
              <Form.Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="mb-3"
              >
                {availableTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            {/* Template Preview */}
            {availableTemplates.find(t => t.id === selectedTemplate) && (
              <div className="template-preview p-3 border rounded bg-light">
                <h6 className="text-primary">
                  <FaEnvelope className="me-2" />
                  {availableTemplates.find(t => t.id === selectedTemplate).name}
                </h6>
                <p className="text-muted mb-2">
                  {availableTemplates.find(t => t.id === selectedTemplate).description}
                </p>
                <small className="text-secondary">
                  Preview: {availableTemplates.find(t => t.id === selectedTemplate).preview}
                </small>
              </div>
            )}
          </div>

          {emailSending && (
            <div className="mb-4">
              <h6>Sending Progress</h6>
              <ProgressBar 
                now={emailProgress} 
                label={`${emailProgress}%`}
                animated 
                striped 
              />
              <small className="text-muted">Please wait while emails are being sent...</small>
            </div>
          )}

          {emailResults && (
            <Alert variant={emailResults.failed > 0 ? "warning" : "success"}>
              <h6>Email Campaign Results</h6>
              <p className="mb-0">
                <strong>Total:</strong> {emailResults.total} | 
                <strong className="text-success"> Sent:</strong> {emailResults.sent} | 
                <strong className="text-danger"> Failed:</strong> {emailResults.failed}
              </p>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowBulkEmailModal(false)}
            disabled={emailSending}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={sendBulkEmails}
            disabled={emailSending || selectedLeads.length === 0}
          >
            {emailSending ? (
              <>
                <Spinner size="sm" className="me-2" />
                Sending...
              </>
            ) : (
              <>
                <FaEnvelope className="me-2" />
                Send {selectedLeads.length} Emails
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Email History Modal */}
      <EmailHistoryModal
        show={showEmailHistoryModal}
        onHide={handleCloseEmailHistory}
        lead={selectedLeadForHistory}
      />

      {/* Floating Action Button for Bulk Email */}
      {selectedLeads.length > 0 && (
        <div className="floating-email-button">
          <Button
            variant="success"
            onClick={handleBulkEmail}
            className="shadow-lg"
          >
            <FaEnvelope className="me-2" />
            Send to {selectedLeads.length}
          </Button>
        </div>
      )}

      {/* Assign Lead Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">
            <FaUserCheck className="me-2" />
            Assign Lead — {assigningLead?.fullName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label className="small fw-medium">Assign to team member</Form.Label>
            <Form.Select value={assignTarget} onChange={e => setAssignTarget(e.target.value)}>
              <option value="">— Select member —</option>
              {teamMembers.map(m => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          {assigningLead?.assignedTo && (
            <small className="text-muted mt-2 d-block">
              Currently assigned to: <strong>{assigningLead.assignedTo.name}</strong>
            </small>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowAssignModal(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleAssignSubmit}>Assign</Button>
        </Modal.Footer>
      </Modal>

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Scroll to top"
          style={{
            position: 'fixed',
            bottom: selectedLeads.length > 0 ? '80px' : '24px',
            right: '24px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            transition: 'opacity 0.2s',
          }}
        >
          <FaArrowUp size={14} />
        </button>
      )}
    </Container>
  );
};

export default LeadList;
