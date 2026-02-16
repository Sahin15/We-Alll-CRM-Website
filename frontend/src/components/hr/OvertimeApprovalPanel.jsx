import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Badge,
  Button,
  Spinner,
  Modal,
  Form,
  Alert,
  Row,
  Col,
} from 'react-bootstrap';
import { FaClock, FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import toast from '../../utils/toast';
import {
  getPendingOvertimeEntries,
  approveOvertimeEntry,
  rejectOvertimeEntry,
} from '../../api/overtimeApi';

const OvertimeApprovalPanel = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingEntries();
  }, []);

  const fetchPendingEntries = async () => {
    try {
      setLoading(true);
      const response = await getPendingOvertimeEntries();
      setEntries(response.entries || []);
    } catch (error) {
      console.error('Error fetching pending overtime:', error);
      toast.error('Failed to load pending overtime entries');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entry) => {
    if (!window.confirm(`Approve ${entry.duration} hours overtime for ${entry.employee?.name}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await approveOvertimeEntry(entry.attendanceId, entry._id);
      toast.success('Overtime approved successfully');
      fetchPendingEntries();
    } catch (error) {
      console.error('Error approving overtime:', error);
      toast.error(error.response?.data?.message || 'Failed to approve overtime');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (entry) => {
    setSelectedEntry(entry);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await rejectOvertimeEntry(
        selectedEntry.attendanceId,
        selectedEntry._id,
        rejectionReason
      );
      toast.success('Overtime rejected');
      setShowRejectModal(false);
      setSelectedEntry(null);
      setRejectionReason('');
      fetchPendingEntries();
    } catch (error) {
      console.error('Error rejecting overtime:', error);
      toast.error(error.response?.data?.message || 'Failed to reject overtime');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading pending overtime...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaClock className="me-2 text-primary" />
              Pending Overtime Approvals
            </h5>
            <Badge bg="warning" className="fs-6">
              {entries.length} Pending
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {entries.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No pending overtime entries to review
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Time Period</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Task Ref</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry._id}>
                      <td>
                        <div>
                          <strong>{entry.employee?.name || 'N/A'}</strong>
                          <br />
                          <small className="text-muted">
                            {entry.employee?.department?.name || 'N/A'}
                          </small>
                        </div>
                      </td>
                      <td>{formatDate(entry.date)}</td>
                      <td>
                        <small>
                          {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                        </small>
                      </td>
                      <td>
                        <Badge bg="info">{entry.duration} hrs</Badge>
                      </td>
                      <td>
                        <div style={{ maxWidth: '200px' }}>
                          <small>{entry.reason}</small>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">
                          {entry.taskReference || '-'}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleApprove(entry)}
                            disabled={actionLoading}
                          >
                            <FaCheck className="me-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRejectClick(entry)}
                            disabled={actionLoading}
                          >
                            <FaTimes className="me-1" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Overtime Entry</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEntry && (
            <>
              <Alert variant="warning">
                <strong>Employee:</strong> {selectedEntry.employee?.name}
                <br />
                <strong>Duration:</strong> {selectedEntry.duration} hours
                <br />
                <strong>Reason:</strong> {selectedEntry.reason}
              </Alert>

              <Form.Group>
                <Form.Label>
                  Rejection Reason <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this overtime is being rejected..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRejectModal(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleRejectSubmit}
            disabled={actionLoading || !rejectionReason.trim()}
          >
            {actionLoading ? 'Rejecting...' : 'Reject Overtime'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default OvertimeApprovalPanel;
