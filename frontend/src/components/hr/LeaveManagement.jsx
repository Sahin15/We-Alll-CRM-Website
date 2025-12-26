import { useState, useEffect } from "react";
import {
  Card,
  Badge,
  Button,
  Modal,
  Form,
  Row,
  Col,
  InputGroup,
  Spinner,
  Alert
} from "react-bootstrap";
import {
  FaCheck,
  FaTimes,
  FaEye,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaUser,
  FaChevronDown,
  FaChevronUp
} from "react-icons/fa";
import { toast } from "react-toastify";
import leaveApi from "../../api/leaveApi";
import LeaveRequestCard from "../leaves/LeaveRequestCard";
import "../../pages/leaves/LeaveManagement.css";

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [displayedLeaves, setDisplayedLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState(""); // 'approve' or 'reject'
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(9); // Show 9 items initially (3x3 grid)

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // Default to pending
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leaves, searchTerm, statusFilter, leaveTypeFilter, dateFilter]);

  useEffect(() => {
    updateDisplayedLeaves();
  }, [filteredLeaves, itemsToShow]);

  const updateDisplayedLeaves = () => {
    // Sort by priority: pending first, then by creation date (newest first)
    const sortedLeaves = [...filteredLeaves].sort((a, b) => {
      // Pending leaves first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      
      // Then by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    setDisplayedLeaves(sortedLeaves.slice(0, itemsToShow));
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getAllLeaves();
      const allLeaves = response.data;
      
      setLeaves(allLeaves);
      
      // Calculate statistics
      setStats({
        pending: allLeaves.filter(l => l.status === "pending").length,
        approved: allLeaves.filter(l => l.status === "approved").length,
        rejected: allLeaves.filter(l => l.status === "rejected").length,
        total: allLeaves.length
      });
    } catch (error) {
      console.error("Error fetching leaves:", error);
      toast.error("Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...leaves];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(leave => leave.status === statusFilter);
    }

    // Leave type filter
    if (leaveTypeFilter) {
      filtered = filtered.filter(leave => leave.leaveType === leaveTypeFilter);
    }

    // Search filter (employee name or reason)
    if (searchTerm) {
      filtered = filtered.filter(leave =>
        leave.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(leave => {
        const leaveDate = new Date(leave.startDate);
        const filterDate = new Date(dateFilter);
        return leaveDate.toDateString() === filterDate.toDateString();
      });
    }

    setFilteredLeaves(filtered);
  };

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setActionType("");
    setComment("");
    setShowModal(true);
  };

  const handleApprove = (leave) => {
    setSelectedLeave(leave);
    setActionType("approve");
    setComment("");
    setShowModal(true);
  };

  const handleReject = (leave) => {
    setSelectedLeave(leave);
    setActionType("reject");
    setComment("");
    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (actionType === "reject" && !comment.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setProcessing(true);
      
      if (actionType === "approve") {
        await leaveApi.approveLeave(selectedLeave._id, comment);
        toast.success(`Leave approved for ${selectedLeave.employee?.name || 'employee'}`);
      } else if (actionType === "reject") {
        await leaveApi.rejectLeave(selectedLeave._id, comment);
        toast.success(`Leave rejected for ${selectedLeave.employee?.name || 'employee'}`);
      }

      setShowModal(false);
      setSelectedLeave(null);
      setComment("");
      fetchLeaves();
    } catch (error) {
      console.error("Error processing leave:", error);
      const errorMessage = error.response?.data?.message || "Failed to process leave request";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleShowMore = () => {
    setItemsToShow(prev => prev + 9);
  };

  const handleShowLess = () => {
    setItemsToShow(9);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "warning",
      approved: "success",
      rejected: "danger",
      cancelled: "secondary"
    };
    return <Badge bg={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getLeaveTypeBadge = (type) => {
    const variants = {
      vacation: "primary",
      sick: "danger",
      personal: "info",
      maternity: "success",
      paternity: "success",
      unpaid: "secondary"
    };
    return <Badge bg={variants[type] || "secondary"} className="me-2">{type}</Badge>;
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading leave requests...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">
                <FaCalendarAlt className="me-2 text-primary" />
                Leave Management
              </h5>
              <small className="text-muted">Recent leave requests requiring attention</small>
            </div>
            <Badge bg="info" className="px-3 py-2">
              {statusFilter === 'pending' ? 'Pending Requests' : 
               statusFilter === '' ? 'All Requests' : 
               statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Quick Actions */}
          <Row className="mb-3">
            <Col>
              <div className="d-flex gap-2 flex-wrap">
                <Button 
                  variant={statusFilter === 'pending' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                >
                  <FaFilter className="me-1" />
                  Pending ({stats.pending})
                </Button>
                <Button 
                  variant={statusFilter === '' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setStatusFilter('')}
                >
                  <FaCalendarAlt className="me-1" />
                  All Requests ({stats.total})
                </Button>
                <Button 
                  variant={statusFilter === 'approved' ? 'success' : 'outline-success'}
                  size="sm"
                  onClick={() => setStatusFilter('approved')}
                >
                  <FaCheck className="me-1" />
                  Approved ({stats.approved})
                </Button>
                <Button 
                  variant={statusFilter === 'rejected' ? 'danger' : 'outline-danger'}
                  size="sm"
                  onClick={() => setStatusFilter('rejected')}
                >
                  <FaTimes className="me-1" />
                  Rejected ({stats.rejected})
                </Button>
              </div>
            </Col>
          </Row>

          {/* Statistics */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border-0 bg-warning bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-warning">{stats.pending}</h3>
                  <small className="text-muted">Pending</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-success bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-success">{stats.approved}</h3>
                  <small className="text-muted">Approved</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-danger bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-danger">{stats.rejected}</h3>
                  <small className="text-muted">Rejected</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-primary bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-primary">{stats.total}</h3>
                  <small className="text-muted">Total</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mb-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by employee or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="vacation">Vacation</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
                <option value="unpaid">Unpaid</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Control
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </Col>
          </Row>

          {/* Leave Requests Grid */}
          {filteredLeaves.length > 0 ? (
            <>
              <div className="leave-requests-grid mb-4">
                {displayedLeaves.map((leave) => (
                  <LeaveRequestCard
                    key={leave._id}
                    leave={leave}
                    isAdmin={true}
                    currentUserId={null} // HR view, not personal
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onApproveReject={handleViewDetails}
                    onCancel={() => {}} // No cancel for HR view
                    getStatusColor={(status) => {
                      const colors = {
                        pending: 'warning',
                        approved: 'success',
                        rejected: 'danger',
                        cancelled: 'secondary'
                      };
                      return colors[status] || 'secondary';
                    }}
                    getLeaveTypeColor={(type) => {
                      const colors = {
                        vacation: 'primary',
                        sick: 'danger',
                        personal: 'info',
                        maternity: 'success',
                        paternity: 'success',
                        unpaid: 'secondary'
                      };
                      return colors[type] || 'secondary';
                    }}
                  />
                ))}
              </div>
              
              {/* Show More/Less Controls */}
              {filteredLeaves.length > 9 && (
                <div className="text-center">
                  {displayedLeaves.length < filteredLeaves.length ? (
                    <Button 
                      variant="outline-primary" 
                      onClick={handleShowMore}
                      className="me-2"
                    >
                      <FaChevronDown className="me-2" />
                      Show More ({filteredLeaves.length - displayedLeaves.length} remaining)
                    </Button>
                  ) : (
                    <Button 
                      variant="outline-secondary" 
                      onClick={handleShowLess}
                    >
                      <FaChevronUp className="me-2" />
                      Show Less
                    </Button>
                  )}
                  <div className="small text-muted mt-2">
                    Showing {displayedLeaves.length} of {filteredLeaves.length} leave requests
                  </div>
                </div>
              )}
            </>
          ) : (
            <Alert variant="info" className="text-center">
              <FaCalendarAlt className="fs-1 mb-3 opacity-25" />
              <p className="mb-0">No leave requests found</p>
              <small>Try adjusting your filters</small>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Action Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {actionType === "approve" && "Approve Leave Request"}
            {actionType === "reject" && "Reject Leave Request"}
            {!actionType && "Leave Request Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeave && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Employee:</strong>
                  <p>{selectedLeave.employee?.name}</p>
                </Col>
                <Col md={6}>
                  <strong>Email:</strong>
                  <p>{selectedLeave.employee?.email}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Leave Type:</strong>
                  <p>{getLeaveTypeBadge(selectedLeave.leaveType)}</p>
                </Col>
                <Col md={6}>
                  <strong>Status:</strong>
                  <p>{getStatusBadge(selectedLeave.status)}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Start Date:</strong>
                  <p>{formatDate(selectedLeave.startDate)}</p>
                </Col>
                <Col md={6}>
                  <strong>End Date:</strong>
                  <p>{formatDate(selectedLeave.endDate)}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <strong>Total Days:</strong>
                  <p>{calculateDays(selectedLeave.startDate, selectedLeave.endDate)} days</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <strong>Reason:</strong>
                  <p className="text-muted">{selectedLeave.reason}</p>
                </Col>
              </Row>

              {selectedLeave.rejectionReason && (
                <Row className="mb-3">
                  <Col md={12}>
                    <Alert variant={selectedLeave.status === "approved" ? "success" : "danger"}>
                      <strong>{selectedLeave.status === "approved" ? "Approval Comment:" : "Rejection Reason:"}</strong>
                      <p className="mb-0 mt-2">{selectedLeave.rejectionReason}</p>
                    </Alert>
                  </Col>
                </Row>
              )}

              {actionType && (
                <Row>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>
                        {actionType === "approve" ? "Approval Comment (Optional)" : "Rejection Reason *"}
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={
                          actionType === "approve"
                            ? "Add any comments for the employee..."
                            : "Please provide a reason for rejection..."
                        }
                        required={actionType === "reject"}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={processing}>
            Close
          </Button>
          {actionType && (
            <Button
              variant={actionType === "approve" ? "success" : "danger"}
              onClick={handleSubmitAction}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "approve" ? <FaCheck className="me-2" /> : <FaTimes className="me-2" />}
                  {actionType === "approve" ? "Approve" : "Reject"}
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default LeaveManagement;
