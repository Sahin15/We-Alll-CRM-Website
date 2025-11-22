import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import { FaCheck, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { leaveApi } from "../../api/leaveApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";

const LeaveRequests = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getAllLeaves(filter);
      setLeaves(response.data);
    } catch (error) {
      toast.error("Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (
      window.confirm("Are you sure you want to approve this leave request?")
    ) {
      try {
        await leaveApi.approveLeave(id);
        toast.success("Leave request approved");
        fetchLeaves();
      } catch (error) {
        toast.error("Failed to approve leave request");
      }
    }
  };

  const handleReject = async () => {
    try {
      await leaveApi.rejectLeave(selectedLeave._id, rejectionReason);
      toast.success("Leave request rejected");
      setShowRejectModal(false);
      setRejectionReason("");
      fetchLeaves();
    } catch (error) {
      toast.error("Failed to reject leave request");
    }
  };

  const openRejectModal = (leave) => {
    setSelectedLeave(leave);
    setShowRejectModal(true);
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Leave Requests</h2>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <div className="btn-group" role="group">
            <Button
              variant={filter === "pending" ? "primary" : "outline-primary"}
              onClick={() => setFilter("pending")}
            >
              Pending
            </Button>
            <Button
              variant={filter === "approved" ? "success" : "outline-success"}
              onClick={() => setFilter("approved")}
            >
              Approved
            </Button>
            <Button
              variant={filter === "rejected" ? "danger" : "outline-danger"}
              onClick={() => setFilter("rejected")}
            >
              Rejected
            </Button>
            <Button
              variant={filter === "" ? "secondary" : "outline-secondary"}
              onClick={() => setFilter("")}
            >
              All
            </Button>
          </div>
        </Col>
      </Row>

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
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length > 0 ? (
                      leaves.map((leave) => (
                        <tr key={leave._id}>
                          <td>{leave.employee?.name || "N/A"}</td>
                          <td className="text-capitalize">{leave.leaveType}</td>
                          <td>{formatDate(leave.startDate)}</td>
                          <td>{formatDate(leave.endDate)}</td>
                          <td>{leave.numberOfDays}</td>
                          <td>{leave.reason}</td>
                          <td>
                            <Badge bg={getStatusVariant(leave.status)}>
                              {leave.status}
                            </Badge>
                          </td>
                          <td>
                            {leave.status === "pending" && (
                              <div className="btn-group" role="group">
                                <Button
                                  size="sm"
                                  variant="outline-success"
                                  onClick={() => handleApprove(leave._id)}
                                >
                                  <FaCheck /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => openRejectModal(leave)}
                                >
                                  <FaTimes /> Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          No leave requests found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Rejection Reason</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            disabled={!rejectionReason.trim()}
          >
            Reject Leave
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LeaveRequests;
