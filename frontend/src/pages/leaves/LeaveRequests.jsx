import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
} from "react-bootstrap";
import { FaCalendarAlt, FaFilter } from "react-icons/fa";
import { toast } from "react-toastify";
import { leaveApi } from "../../api/leaveApi";
import LeaveRequestCard from "../../components/leaves/LeaveRequestCard";
import LeaveApprovalModal from "../../components/leaves/LeaveApprovalModal";
import { useAuth } from "../../context/AuthContext";
import '../leaves/LeaveManagement.css';

const LeaveRequests = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    fetchLeaves();
  }, []); // Remove statusFilter dependency since we filter in frontend now

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      // Get ALL leaves, don't filter at API level
      const response = await leaveApi.getAllLeaves({});
      setLeaves(response.data);
    } catch (error) {
      console.error('Error loading leaves:', error);
      toast.error("Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
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
      fetchLeaves();
    } catch (error) {
      console.error('Error processing leave:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process leave request';
      toast.error(errorMessage);
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

  const getStats = () => {
    // Calculate stats from ALL leaves (not filtered)
    const stats = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
    };
    return stats;
  };

  const stats = getStats();

  // Filter leaves for display based on selected tab
  const filteredLeaves = leaves.filter(leave => {
    if (statusFilter === 'all') return true;
    return leave.status === statusFilter;
  });

  return (
    <Container fluid className="leave-requests">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="page-title">
                <FaCalendarAlt className="me-2" />
                Leave Requests - Approval Center
              </h2>
              <p className="text-muted mb-0">
                Review and manage employee leave requests
              </p>
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

      {/* Status Filter */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Filter by Status:</span>
                {['all', 'pending', 'approved', 'rejected'].map(status => (
                  <Badge
                    key={status}
                    bg={statusFilter === status ? 'primary' : 'light'}
                    text={statusFilter === status ? 'white' : 'dark'}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter(status)}
                    style={{ cursor: 'pointer' }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                ))}
              </div>
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
                  No leave requests match your current filter.
                </p>
              </Card.Body>
            </Card>
          ) : (
            <div className="leave-requests-grid">
              {filteredLeaves.map(leave => (
                <LeaveRequestCard
                  key={leave._id}
                  leave={leave}
                  isAdmin={true}
                  currentUserId={user?.id}
                  onApproveReject={handleApproveReject}
                  onCancel={() => {}} // No cancel for admin view
                  getStatusColor={getStatusColor}
                  getLeaveTypeColor={getLeaveTypeColor}
                />
              ))}
            </div>
          )}
        </Col>
      </Row>

      {/* Approval Modal */}
      <LeaveApprovalModal
        show={showApprovalModal}
        onHide={() => setShowApprovalModal(false)}
        leave={selectedLeave}
        onAction={handleApprovalAction}
      />
    </Container>
  );
};

export default LeaveRequests;
