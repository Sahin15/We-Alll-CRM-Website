import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Nav, Table, Form, InputGroup } from 'react-bootstrap';
import { FaPlus, FaCalendarAlt, FaFilter, FaDownload, FaChevronDown, FaChevronUp, FaSearch, FaUsers, FaEye } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { leaveApi } from '../../api/leaveApi';
import { LEAVE_TYPE_DETAILS } from '../../utils/constants';
import { formatDate, getStatusVariant } from '../../utils/helpers';
import CreateLeaveModal from '../../components/leaves/CreateLeaveModal';
import LeaveRequestCard from '../../components/leaves/LeaveRequestCard';
import LeaveApprovalModal from '../../components/leaves/LeaveApprovalModal';
import WFHManagementPanel from '../../components/wfh/WFHManagementPanel';
import { toast } from 'react-toastify';
import './LeaveManagement.css';

const LeaveManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'hr' || user?.role === 'hod' || user?.role === 'manager';
  
  // Redirect employees to their proper leave page
  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/employee/leaves';
      return;
    }
  }, [isAdmin]);
  
  const [leaves, setLeaves] = useState([]);
  const [displayedLeaves, setDisplayedLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all-leaves');
  const [filters, setFilters] = useState({
    status: 'all',
    leaveType: 'all',
    year: new Date().getFullYear(),
    search: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [itemsToShow, setItemsToShow] = useState(9);
  const [employeeBalances, setEmployeeBalances] = useState({});

  useEffect(() => {
    loadLeaves();
  }, [activeTab, filters]);

  useEffect(() => {
    updateDisplayedLeaves();
  }, [leaves, itemsToShow]);

  const updateDisplayedLeaves = () => {
    let filtered = [...leaves];

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(leave => leave.status === filters.status);
    }
    
    if (filters.leaveType !== 'all') {
      filtered = filtered.filter(leave => leave.leaveType === filters.leaveType);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(leave => 
        leave.employee?.name?.toLowerCase().includes(searchTerm) ||
        leave.employee?.email?.toLowerCase().includes(searchTerm) ||
        leave.reason?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by priority: pending first, then by creation date (newest first)
    const sortedLeaves = filtered.sort((a, b) => {
      if (isAdmin && activeTab === 'all-leaves') {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    setDisplayedLeaves(sortedLeaves.slice(0, itemsToShow));
  };

  const loadLeaves = async () => {
    try {
      setLoading(true);
      setItemsToShow(9);
      
      let response;
      const params = {
        year: filters.year
      };
      
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.leaveType !== 'all') params.leaveType = filters.leaveType;
      response = await leaveApi.getAllLeaves(params);
      
      setLeaves(response.data);
      
      // Load employee balances for admin view
      if (isAdmin && activeTab === 'all-leaves') {
        loadEmployeeBalances(response.data);
      }
    } catch (error) {
      console.error('Error loading leaves:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeBalances = async (leaveData) => {
    try {
      const uniqueEmployees = [...new Set(leaveData.map(leave => leave.employee?._id))].filter(Boolean);
      const balances = {};
      
      for (const employeeId of uniqueEmployees) {
        try {
          const response = await leaveApi.getLeaveUsageSummary(employeeId, filters.year);
          balances[employeeId] = response.data;
        } catch (error) {
          console.error(`Error loading usage summary for employee ${employeeId}:`, error);
          // Fallback to regular balance if usage summary fails
          try {
            const balanceResponse = await leaveApi.getLeaveBalance(employeeId, filters.year);
            balances[employeeId] = { balance: balanceResponse.data.balance, summary: null };
          } catch (balanceError) {
            console.error(`Error loading balance for employee ${employeeId}:`, balanceError);
          }
        }
      }
      
      setEmployeeBalances(balances);
    } catch (error) {
      console.error('Error loading employee balances:', error);
    }
  };

  const handleCreateLeave = () => {
    setShowCreateModal(true);
  };

  const handleLeaveCreated = () => {
    setShowCreateModal(false);
    loadLeaves();
    toast.success('Leave request submitted successfully');
  };

  const handleApproveReject = (leave) => {
    setSelectedLeave(leave);
    setShowApprovalModal(true);
  };

  const handleApprovalAction = async (action, data) => {
    try {
      if (action === 'approve') {
        await leaveApi.approveLeave(selectedLeave._id, data.approvalComment || '');
        toast.success(`Leave request approved for ${selectedLeave.employee?.name || 'employee'}`);
      } else {
        await leaveApi.rejectLeave(selectedLeave._id, data.rejectionReason);
        toast.success(`Leave request rejected for ${selectedLeave.employee?.name || 'employee'}`);
      }
      
      setShowApprovalModal(false);
      setSelectedLeave(null);
      loadLeaves();
    } catch (error) {
      console.error('Error processing leave:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process leave request';
      toast.error(errorMessage);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    try {
      await leaveApi.cancelLeave(leaveId);
      toast.success('Leave request cancelled successfully');
      loadLeaves();
    } catch (error) {
      console.error('Error cancelling leave:', error);
      toast.error('Failed to cancel leave request');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      cancelled: 'secondary'
    };
    return colors[status] || 'secondary';
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      personal: 'primary',
      medical: 'danger',
      vacation: 'success',
      unpaid: 'secondary'
    };
    return colors[type] || 'secondary';
  };

  const filteredLeaves = leaves.filter(leave => {
    let matches = true;
    
    if (filters.status !== 'all') {
      matches = matches && leave.status === filters.status;
    }
    
    if (filters.leaveType !== 'all') {
      matches = matches && leave.leaveType === filters.leaveType;
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      matches = matches && (
        leave.employee?.name?.toLowerCase().includes(searchTerm) ||
        leave.employee?.email?.toLowerCase().includes(searchTerm) ||
        leave.reason?.toLowerCase().includes(searchTerm)
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
    // Calculate stats from all leaves to show overall statistics
    const stats = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      totalDays: leaves.filter(l => l.status === 'approved').reduce((sum, l) => sum + l.numberOfDays, 0)
    };
    return stats;
  };

  const stats = getStats();

  return (
    <Container fluid className="leave-management">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="page-title">
                <FaCalendarAlt className="me-2" />
                Leave Management
              </h2>
              <p className="text-muted mb-0">
                Manage leave requests, approvals, and employee time off (24 days annual allowance)
                {filteredLeaves.length > 9 && displayedLeaves.length < filteredLeaves.length && (
                  <span className="ms-2">
                    <Badge bg="info" className="small">
                      Showing {displayedLeaves.length} of {filteredLeaves.length}
                    </Badge>
                  </span>
                )}
              </p>
            </div>
            <div className="d-flex gap-2">
              {isAdmin && (
                <Button variant="outline-primary" className="d-flex align-items-center gap-2">
                  <FaDownload /> Export
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Total Requests</h6>
                  <h3 className="mb-0">{stats.total}</h3>
                </div>
                <div className="stats-icon bg-primary">
                  <FaCalendarAlt />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Pending</h6>
                  <h3 className="mb-0 text-warning">{stats.pending}</h3>
                </div>
                <div className="stats-icon bg-warning">
                  <FaFilter />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Approved</h6>
                  <h3 className="mb-0 text-success">{stats.approved}</h3>
                </div>
                <div className="stats-icon bg-success">
                  <FaCalendarAlt />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Total Days</h6>
                  <h3 className="mb-0 text-info">{stats.totalDays}</h3>
                </div>
                <div className="stats-icon bg-info">
                  <FaUsers />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Navigation and Filters */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-3">
              <Row className="align-items-center">
                <Col md={6}>
                  <Nav variant="pills">
                    <Nav.Item>
                      <Nav.Link 
                        active={activeTab === 'all-leaves'}
                        onClick={() => setActiveTab('all-leaves')}
                      >
                        All Leave Requests
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                        active={activeTab === 'wfh-requests'}
                        onClick={() => setActiveTab('wfh-requests')}
                      >
                        WFH Requests
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Col>
                
                <Col md={6}>
                  <Row className="g-2">
                    <Col md={4}>
                      <Form.Select
                        size="sm"
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <Form.Select
                        size="sm"
                        value={filters.leaveType}
                        onChange={(e) => setFilters({...filters, leaveType: e.target.value})}
                      >
                        <option value="all">All Types</option>
                        {Object.entries(LEAVE_TYPE_DETAILS).map(([type, details]) => (
                          <option key={type} value={type}>{details.name}</option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <InputGroup size="sm">
                        <InputGroup.Text>
                          <FaSearch />
                        </InputGroup.Text>
                        <Form.Control
                          placeholder="Search employees..."
                          value={filters.search}
                          onChange={(e) => setFilters({...filters, search: e.target.value})}
                        />
                      </InputGroup>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Leave Requests */}
      <Row>
        <Col>
          {activeTab === 'wfh-requests' ? (
            <WFHManagementPanel />
          ) : loading ? (
            <Card className="border-0 shadow-sm">
              <Card.Body className="loading-container">
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading leave requests...</p>
                </div>
              </Card.Body>
            </Card>
          ) : filteredLeaves.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <Card.Body className="empty-state">
                <FaCalendarAlt size={48} className="text-muted mb-3" />
                <h5 className="text-muted">No leave requests found</h5>
                <p className="text-muted mb-3">
                  {activeTab === 'my-leaves' 
                    ? "You haven't submitted any leave requests yet."
                    : "No leave requests match your current filter."
                  }
                </p>
                {activeTab === 'my-leaves' && (
                  <Button variant="primary" onClick={handleCreateLeave}>
                    <FaPlus className="me-2" />
                    Request Your First Leave
                  </Button>
                )}
              </Card.Body>
            </Card>
          ) : (
            <>
              {/* Enhanced Table View for Admin */}
              {isAdmin && activeTab === 'all-leaves' ? (
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Leave Type</th>
                          <th>Duration</th>
                          <th>Days</th>
                          <th>Status</th>
                          <th>Usage Ratio</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedLeaves.map(leave => {
                          const balance = employeeBalances[leave.employee?._id];
                          return (
                            <tr key={leave._id}>
                              <td>
                                <div>
                                  <strong>{leave.employee?.name}</strong>
                                  <br />
                                  <small className="text-muted">{leave.employee?.email}</small>
                                </div>
                              </td>
                              <td>
                                <Badge bg={getLeaveTypeColor(leave.leaveType)}>
                                  {LEAVE_TYPE_DETAILS[leave.leaveType]?.name || leave.leaveType}
                                </Badge>
                              </td>
                              <td>
                                <div>
                                  {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                </div>
                              </td>
                              <td>
                                <strong>{leave.numberOfDays}</strong>
                              </td>
                              <td>
                                <Badge bg={getStatusColor(leave.status)}>
                                  {leave.status}
                                </Badge>
                              </td>
                              <td>
                                {balance ? (
                                  <div>
                                    <div className="fw-bold text-primary">
                                      {balance.summary?.currentRatio || `${balance.balance?.earned?.used || 0}/24`}
                                    </div>
                                    <small className="text-muted">
                                      {balance.balance?.earned?.remaining || 0} available
                                    </small>
                                  </div>
                                ) : (
                                  <small className="text-muted">Loading...</small>
                                )}
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    title="View Details"
                                    onClick={() => handleApproveReject(leave)}
                                  >
                                    <FaEye />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              ) : (
                <div className="leave-requests-grid">
                  {displayedLeaves.map(leave => (
                    <LeaveRequestCard
                      key={leave._id}
                      leave={leave}
                      isAdmin={isAdmin}
                      currentUserId={user?.id}
                      onApproveReject={handleApproveReject}
                      onCancel={handleCancelLeave}
                      getStatusColor={getStatusColor}
                      getLeaveTypeColor={getLeaveTypeColor}
                    />
                  ))}
                </div>
              )}
              
              {/* Show More/Less Controls */}
              {filteredLeaves.length > 9 && (
                <div className="show-more-section">
                  <Row>
                    <Col className="text-center">
                      {displayedLeaves.length < filteredLeaves.length ? (
                        <Button 
                          variant="outline-primary" 
                          onClick={handleShowMore}
                          className="show-more-btn"
                        >
                          <FaChevronDown className="me-2" />
                          Show More ({filteredLeaves.length - displayedLeaves.length} remaining)
                        </Button>
                      ) : (
                        <Button 
                          variant="outline-secondary" 
                          onClick={handleShowLess}
                          className="show-more-btn"
                        >
                          <FaChevronUp className="me-2" />
                          Show Less
                        </Button>
                      )}
                      <div className="pagination-info">
                        Showing {displayedLeaves.length} of {filteredLeaves.length} leave requests
                      </div>
                    </Col>
                  </Row>
                </div>
              )}
            </>
          )}
        </Col>
      </Row>

      {/* Modals */}
      <CreateLeaveModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onLeaveCreated={handleLeaveCreated}
      />

      <LeaveApprovalModal
        show={showApprovalModal}
        onHide={() => setShowApprovalModal(false)}
        leave={selectedLeave}
        onAction={handleApprovalAction}
      />
    </Container>
  );
};

export default LeaveManagement;