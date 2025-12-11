import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Nav } from 'react-bootstrap';
import { FaPlus, FaCalendarAlt, FaFilter, FaDownload } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import leaveApi from '../../api/leaveApi';
import CreateLeaveModal from '../../components/leaves/CreateLeaveModal';
import LeaveRequestCard from '../../components/leaves/LeaveRequestCard';
import LeaveApprovalModal from '../../components/leaves/LeaveApprovalModal';
import { toast } from 'react-toastify';
import './LeaveManagement.css';

const LeaveManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'hr';
  
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'all-leaves' : 'my-leaves');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    loadLeaves();
  }, [activeTab, statusFilter]);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      let response;
      
      if (activeTab === 'my-leaves') {
        response = await leaveApi.getMyLeaves();
      } else {
        const filter = statusFilter !== 'all' ? statusFilter : undefined;
        response = await leaveApi.getAllLeaves(filter);
      }
      
      setLeaves(response.data);
    } catch (error) {
      console.error('Error loading leaves:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
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
        toast.success('Leave request approved successfully');
      } else {
        await leaveApi.rejectLeave(selectedLeave._id, data.rejectionReason);
        toast.success('Leave request rejected');
      }
      
      setShowApprovalModal(false);
      setSelectedLeave(null);
      loadLeaves();
    } catch (error) {
      console.error('Error processing leave:', error);
      toast.error('Failed to process leave request');
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
      vacation: 'primary',
      sick: 'danger',
      personal: 'info',
      maternity: 'success',
      paternity: 'success',
      unpaid: 'secondary'
    };
    return colors[type] || 'secondary';
  };

  const filteredLeaves = leaves.filter(leave => {
    if (statusFilter === 'all') return true;
    return leave.status === statusFilter;
  });

  const getStats = () => {
    const stats = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
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
                Manage leave requests, approvals, and employee time off
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button 
                variant="success" 
                onClick={handleCreateLeave}
                className="d-flex align-items-center gap-2"
              >
                <FaPlus /> Request Leave
              </Button>
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
                  <h6 className="text-muted mb-1">Rejected</h6>
                  <h3 className="mb-0 text-danger">{stats.rejected}</h3>
                </div>
                <div className="stats-icon bg-danger">
                  <FaCalendarAlt />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Navigation Tabs */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-3">
              <Nav variant="pills" className="d-flex justify-content-between">
                <div className="d-flex">
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'my-leaves'}
                      onClick={() => setActiveTab('my-leaves')}
                    >
                      My Leave Requests
                    </Nav.Link>
                  </Nav.Item>
                  {isAdmin && (
                    <Nav.Item>
                      <Nav.Link 
                        active={activeTab === 'all-leaves'}
                        onClick={() => setActiveTab('all-leaves')}
                      >
                        All Leave Requests
                      </Nav.Link>
                    </Nav.Item>
                  )}
                </div>
                
                {/* Status Filter */}
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">Filter:</span>
                  {['all', 'pending', 'approved', 'rejected'].map(status => (
                    <Badge
                      key={status}
                      bg={statusFilter === status ? 'primary' : 'light'}
                      text={statusFilter === status ? 'white' : 'dark'}
                      className="cursor-pointer"
                      onClick={() => setStatusFilter(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  ))}
                </div>
              </Nav>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Leave Requests */}
      <Row>
        <Col>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5">
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
            <div className="leave-requests-grid">
              {filteredLeaves.map(leave => (
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