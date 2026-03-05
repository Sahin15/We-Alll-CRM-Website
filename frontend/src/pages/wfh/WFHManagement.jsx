import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Nav, Table, Form, InputGroup, Alert } from 'react-bootstrap';
import { FaPlus, FaHome, FaFilter, FaDownload, FaChevronDown, FaChevronUp, FaSearch, FaUsers, FaEye, FaCheckCircle, FaTimesCircle, FaHourglass } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import wfhApi from '../../api/wfhApi';
import ApplyWFHModal from '../../components/wfh/ApplyWFHModal';
import WFHApprovalModal from '../../components/wfh/WFHApprovalModal';

const WFHManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'hr' || user?.role === 'manager';
  
  const [requests, setRequests] = useState([]);
  const [displayedRequests, setDisplayedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'all-wfh' : 'my-wfh');
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [itemsToShow, setItemsToShow] = useState(9);

  useEffect(() => {
    loadRequests();
  }, [activeTab, filters]);

  useEffect(() => {
    updateDisplayedRequests();
  }, [requests, itemsToShow]);

  const updateDisplayedRequests = () => {
    let filtered = [...requests];

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(req => req.status === filters.status);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(req => 
        req.employee?.name?.toLowerCase().includes(searchTerm) ||
        req.employee?.email?.toLowerCase().includes(searchTerm) ||
        req.reason?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by priority: pending first, then by date (newest first)
    const sortedRequests = filtered.sort((a, b) => {
      if (isAdmin && activeTab === 'all-wfh') {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
      }
      return new Date(b.date) - new Date(a.date);
    });
    
    setDisplayedRequests(sortedRequests.slice(0, itemsToShow));
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      setItemsToShow(9);
      
      let response;
      const params = {};
      
      if (activeTab === 'my-wfh') {
        if (filters.status !== 'all') params.status = filters.status;
        response = await wfhApi.getMyWFHRequests(params);
      } else {
        if (filters.status !== 'all') params.status = filters.status;
        response = await wfhApi.getAllWFHRequests(params);
      }
      
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error loading WFH requests:', error);
      toast.error('Failed to load WFH requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWFH = () => {
    setShowApplyModal(true);
  };

  const handleWFHApplied = () => {
    setShowApplyModal(false);
    loadRequests();
    toast.success('WFH request submitted successfully');
  };

  const handleApproveReject = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const handleApprovalAction = async (action, data) => {
    try {
      if (action === 'approve') {
        await wfhApi.approveWFHRequest(selectedRequest._id);
        toast.success(`WFH request approved for ${selectedRequest.employee?.name || 'employee'}`);
      } else {
        await wfhApi.rejectWFHRequest(selectedRequest._id, data.rejectionReason);
        toast.success(`WFH request rejected for ${selectedRequest.employee?.name || 'employee'}`);
      }
      
      setShowApprovalModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Error processing WFH request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process WFH request';
      toast.error(errorMessage);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this WFH request?')) {
      return;
    }

    try {
      await wfhApi.cancelWFHRequest(requestId);
      toast.success('WFH request cancelled successfully');
      loadRequests();
    } catch (error) {
      console.error('Error cancelling WFH request:', error);
      toast.error('Failed to cancel WFH request');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger'
    };
    return colors[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isToday = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFuture = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const filteredRequests = requests.filter(req => {
    let matches = true;
    
    if (filters.status !== 'all') {
      matches = matches && req.status === filters.status;
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      matches = matches && (
        req.employee?.name?.toLowerCase().includes(searchTerm) ||
        req.employee?.email?.toLowerCase().includes(searchTerm) ||
        req.reason?.toLowerCase().includes(searchTerm)
      );
    }
    
    return matches;
  });

  const handleShowMore = () => {
    setItemsToShow(prev => prev + 9);
  };

  const handleShowLess = () => {
    setItemsToShow(9);
  };

  const getStats = () => {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length
    };
    return stats;
  };

  const stats = getStats();

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <FaHome className="me-2" />
                Work From Home Management
              </h2>
              <p className="text-muted mb-0">
                Manage WFH requests and approvals
                {filteredRequests.length > 9 && displayedRequests.length < filteredRequests.length && (
                  <span className="ms-2">
                    <Badge bg="info" className="small