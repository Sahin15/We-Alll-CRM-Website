import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { FaHome, FaCheckCircle, FaTimesCircle, FaHourglass, FaCalendar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getPendingWFHRequests, approveWFHRequest, rejectWFHRequest } from '../../api/wfhApi';

const WFHApprovalPanel = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await getPendingWFHRequests();
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching pending WFH requests:', error);
      toast.error('Failed to load pending WFH requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this WFH request?')) {
      return;
    }

    try {
      setProcessing(true);
      await approveWFHRequest(id);
      toast.success('WFH request approved successfully!');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error approving WFH request:', error);
      toast.error(error.response?.data?.message || 'Failed to approve WFH request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      await rejectWFHRequest(selectedRequest._id, rejectionReason.trim());
      toast.success('WFH request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting WFH request:', error);
      toast.error(error.response?.data?.message || 'Failed to reject WFH request');
    } finally {
      setProcessing(false);
    }
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

  const isTomorrow = (dateString) => {
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  return (
    <>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaHome className="me-2" />
            Pending WFH Requests
          </h5>
          <Badge bg="warning" pill>
            {requests.length} Pending
          </Badge>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-4">
              <FaCheckCircle size={40} className="text-success mb-3" />
              <p className="text-muted mb-0">No pending WFH requests</p>
            </div>
          ) : (
            <>
              <Alert variant="info" className="mb-3">
                <small>
                  <strong>Note:</strong> WFH employees must clock in at 10:00 AM and clock out at 7:00 PM (same as office hours).
                </small>
              </Alert>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Reason</th>
                    <th>Applied On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div>
                          <strong>{request.employee?.name}</strong>
                          <br />
                          <small className="text-muted">
                            {request.employee?.email}
                          </small>
                          {request.employee?.employeeId && (
                            <>
                              <br />
                              <small className="text-muted">
                                ID: {request.employee.employeeId}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <FaCalendar className="me-1" />
                          <strong>{formatDate(request.date)}</strong>
                          {isToday(request.date) && (
                            <Badge bg="danger" className="ms-2">TODAY</Badge>
                          )}
                          {isTomorrow(request.date) && (
                            <Badge bg="warning" className="ms-2">TOMORROW</Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: '300px' }}>
                          {request.reason}
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">
                          {formatDate(request.createdAt)}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApprove(request._id)}
                            disabled={processing}
                          >
                            <FaCheckCircle className="me-1" />
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRejectClick(request)}
                            disabled={processing}
                          >
                            <FaTimesCircle className="me-1" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => !processing && setShowRejectModal(false)} centered>
        <Modal.Header closeButton={!processing}>
          <Modal.Title>Reject WFH Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div className="mb-3">
              <p>
                <strong>Employee:</strong> {selectedRequest.employee?.name}
              </p>
              <p>
                <strong>Date:</strong> {formatDate(selectedRequest.date)}
              </p>
              <p>
                <strong>Reason:</strong> {selectedRequest.reason}
              </p>
            </div>
          )}
          <Form.Group>
            <Form.Label>
              Reason for Rejection <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter reason for rejecting this WFH request"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={processing}
            />
            <Form.Text className="text-muted">
              This will be visible to the employee
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRejectModal(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleRejectSubmit}
            disabled={processing || !rejectionReason.trim()}
          >
            {processing ? 'Rejecting...' : 'Reject Request'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default WFHApprovalPanel;
