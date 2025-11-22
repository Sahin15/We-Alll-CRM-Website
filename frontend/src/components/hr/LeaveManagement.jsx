import { useState, useEffect } from "react";
import {
  Card,
  Table,
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
  FaUser
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../services/api";

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState(""); // 'approve' or 'reject'
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
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

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get("/leaves");
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
        await api.put(`/leaves/${selectedLeave._id}/approve`, {
          approvalComment: comment
        });
        toast.success("Leave request approved successfully");
      } else if (actionType === "reject") {
        await api.put(`/leaves/${selectedLeave._id}/reject`, {
          rejectionReason: comment
        });
        toast.success("Leave request rejected");
      }

      setShowModal(false);
      setSelectedLeave(null);
      setComment("");
      fetchLeaves();
    } catch (error) {
      console.error("Error processing leave:", error);
      toast.error(error.response?.data?.message || "Failed to process leave request");
    } finally {
      setProcessing(false);
    }
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
      casual: "info",
      sick: "warning",
      vacation: "primary",
      maternity: "success",
      paternity: "success"
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
    return new Date(date).toLocaleDateString("en-US", {
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
          <h5 className="mb-0">
            <FaCalendarAlt className="me-2 text-primary" />
            Leave Management
          </h5>
        </Card.Header>
        <Card.Body>
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
                <option value="casual">Casual</option>
                <option value="sick">Sick</option>
                <option value="vacation">Vacation</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
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

          {/* Leave Requests Table */}
          {filteredLeaves.length > 0 ? (
            <div className="table-responsive">
              <Table hover>
                <thead className="bg-light">
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((leave) => (
                    <tr key={leave._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="text-muted me-2" />
                          <div>
                            <div className="fw-bold">{leave.employee?.name || "N/A"}</div>
                            <small className="text-muted">{leave.employee?.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{getLeaveTypeBadge(leave.leaveType)}</td>
                      <td>
                        <small>
                          {formatDate(leave.startDate)} <br />
                          to {formatDate(leave.endDate)}
                        </small>
                      </td>
                      <td>
                        <Badge bg="secondary">
                          {calculateDays(leave.startDate, leave.endDate)} days
                        </Badge>
                      </td>
                      <td>
                        <small className="text-muted">
                          {leave.reason?.substring(0, 30)}
                          {leave.reason?.length > 30 ? "..." : ""}
                        </small>
                      </td>
                      <td>{getStatusBadge(leave.status)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleViewDetails(leave)}
                          >
                            <FaEye />
                          </Button>
                          {leave.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleApprove(leave)}
                              >
                                <FaCheck />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleReject(leave)}
                              >
                                <FaTimes />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
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
