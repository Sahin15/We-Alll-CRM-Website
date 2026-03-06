import { useState, useEffect } from "react";
import { Container, Card, Table, Badge, Button, Modal, Form, Alert, Spinner } from "react-bootstrap";
import { FaCheck, FaTimes, FaEye, FaCalendar, FaUser } from "react-icons/fa";
import { toast } from "react-toastify";
import { workOnLeaveDayApi } from "../../api/workOnLeaveDayApi";
import { formatDate } from "../../utils/helpers";

const WorkOnLeaveDayManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancelLeave, setCancelLeave] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await workOnLeaveDayApi.getAllRequests({ status: filterStatus || undefined });
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (request, action) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setRejectionReason("");
    setCancelLeave(true);
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setProcessing(true);
      
      if (reviewAction === "approve") {
        await workOnLeaveDayApi.approveRequest(selectedRequest._id, { cancelLeave });
        toast.success("Request approved successfully");
      } else {
        await workOnLeaveDayApi.rejectRequest(selectedRequest._id, { rejectionReason });
        toast.success("Request rejected");
      }

      setShowReviewModal(false);
      fetchRequests();
    } catch (error) {
      console.error("Error reviewing request:", error);
      toast.error(error.response?.data?.message || "Failed to process request");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "warning",
      approved: "success",
      rejected: "danger",
    };
    return <Badge bg={variants[status] || "secondary"}>{status.toUpperCase()}</Badge>;
  };

  const getLeaveTypeBadge = (type) => {
    const variants = {
      personal: "primary",
      medical: "danger",
      vacation: "info",
      half_day: "warning",
      unpaid: "secondary",
    };
    return <Badge bg={variants[type] || "secondary"}>{type.replace("_", " ").toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading requests...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-1">Work on Leave Day Requests</h5>
            <small className="text-muted">
              Manage employee requests to work on their approved leave days
            </small>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Filter */}
          <div className="mb-3">
            <Form.Group>
              <Form.Label className="small">Filter by Status</Form.Label>
              <Form.Select
                size="sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ maxWidth: "200px" }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </Form.Group>
          </div>

          {/* Requests Table */}
          {requests.length > 0 ? (
            <div className="table-responsive">
              <Table hover size="sm">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Leave Type</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div>
                          <FaUser className="me-1" />
                          <strong>{request.employee?.name}</strong>
                          <small className="d-block text-muted">{request.employee?.email}</small>
                        </div>
                      </td>
                      <td>
                        <FaCalendar className="me-1" />
                        {formatDate(request.date)}
                      </td>
                      <td>{getLeaveTypeBadge(request.leaveRequest?.leaveType)}</td>
                      <td>
                        <div style={{ maxWidth: "200px" }}>
                          {request.reason.length > 50
                            ? `${request.reason.substring(0, 50)}...`
                            : request.reason}
                        </div>
                      </td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td>
                        <small>{formatDate(request.createdAt)}</small>
                      </td>
                      <td>
                        {request.status === "pending" ? (
                          <div className="d-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => handleOpenReviewModal(request, "approve")}
                              title="Approve"
                            >
                              <FaCheck size={10} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleOpenReviewModal(request, "reject")}
                              title="Reject"
                            >
                              <FaTimes size={10} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline-info"
                            onClick={() => handleOpenReviewModal(request, "view")}
                            title="View Details"
                          >
                            <FaEye size={10} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info" className="text-center">
              <FaCalendar size={24} className="mb-2" />
              <p className="mb-0">No requests found</p>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {reviewAction === "approve" && "Approve Request"}
            {reviewAction === "reject" && "Reject Request"}
            {reviewAction === "view" && "Request Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <>
              <div className="mb-3">
                <h6>Employee Information</h6>
                <p className="mb-1">
                  <strong>Name:</strong> {selectedRequest.employee?.name}
                </p>
                <p className="mb-1">
                  <strong>Email:</strong> {selectedRequest.employee?.email}
                </p>
                <p className="mb-1">
                  <strong>Department:</strong> {selectedRequest.employee?.department?.name || "N/A"}
                </p>
              </div>

              <div className="mb-3">
                <h6>Leave Information</h6>
                <p className="mb-1">
                  <strong>Date:</strong> {formatDate(selectedRequest.date)}
                </p>
                <p className="mb-1">
                  <strong>Leave Type:</strong> {getLeaveTypeBadge(selectedRequest.leaveRequest?.leaveType)}
                </p>
                <p className="mb-1">
                  <strong>Leave Period:</strong> {formatDate(selectedRequest.leaveRequest?.startDate)} to{" "}
                  {formatDate(selectedRequest.leaveRequest?.endDate)}
                </p>
                <p className="mb-1">
                  <strong>Total Days:</strong> {selectedRequest.leaveRequest?.numberOfDays} day(s)
                </p>
              </div>

              <div className="mb-3">
                <h6>Request Reason</h6>
                <Card className="border-0 bg-light">
                  <Card.Body>
                    <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                      {selectedRequest.reason}
                    </p>
                  </Card.Body>
                </Card>
              </div>

              {reviewAction === "approve" && (
                <div className="mb-3">
                  <Alert variant="warning">
                    <Form.Check
                      type="checkbox"
                      id="cancel-leave-checkbox"
                      label="Cancel the leave for this day"
                      checked={cancelLeave}
                      onChange={(e) => setCancelLeave(e.target.checked)}
                    />
                    <Form.Text className="text-muted d-block mt-2">
                      {cancelLeave
                        ? "The leave will be automatically cancelled for this day, and the employee can clock in."
                        : "The leave will remain active. You'll need to manually adjust the leave if needed."}
                    </Form.Text>
                  </Alert>
                </div>
              )}

              {reviewAction === "reject" && (
                <Form.Group className="mb-3">
                  <Form.Label>Rejection Reason *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Please provide a reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </Form.Group>
              )}

              {selectedRequest.status !== "pending" && (
                <div className="mb-3">
                  <h6>Review Information</h6>
                  <p className="mb-1">
                    <strong>Status:</strong> {getStatusBadge(selectedRequest.status)}
                  </p>
                  <p className="mb-1">
                    <strong>Reviewed By:</strong> {selectedRequest.reviewedBy?.name || "N/A"}
                  </p>
                  <p className="mb-1">
                    <strong>Reviewed At:</strong> {formatDate(selectedRequest.reviewedAt)}
                  </p>
                  {selectedRequest.rejectionReason && (
                    <p className="mb-1">
                      <strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}
                    </p>
                  )}
                  {selectedRequest.leaveCancelled && (
                    <Alert variant="info" className="mt-2 mb-0">
                      Leave was cancelled for this day
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
            {reviewAction === "view" ? "Close" : "Cancel"}
          </Button>
          {reviewAction === "approve" && (
            <Button variant="success" onClick={handleReview} disabled={processing}>
              {processing ? "Processing..." : "Approve Request"}
            </Button>
          )}
          {reviewAction === "reject" && (
            <Button
              variant="danger"
              onClick={handleReview}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? "Processing..." : "Reject Request"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default WorkOnLeaveDayManagement;
