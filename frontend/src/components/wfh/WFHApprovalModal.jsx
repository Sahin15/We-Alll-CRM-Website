import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

/**
 * Approve/reject modal for a single WFH request.
 *
 * @param {object} props
 * @param {boolean} props.show
 * @param {() => void} props.onHide
 * @param {object|null} props.request
 * @param {(action: 'approve' | 'reject', data?: { rejectionReason?: string }) => void} props.onAction
 * @param {boolean} [props.processing]
 */
const WFHApprovalModal = ({ show, onHide, request, onAction, processing = false }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [mode, setMode] = useState('review');

  const handleClose = () => {
    if (processing) return;
    setRejectionReason('');
    setMode('review');
    onHide();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!request) return null;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton={!processing}>
        <Modal.Title>Review WFH Request</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>Employee:</strong> {request.employee?.name || 'Unknown'}
        </p>
        <p>
          <strong>Date:</strong> {formatDate(request.date)}
        </p>
        <p>
          <strong>Reason:</strong> {request.reason}
        </p>

        {mode === 'reject' && (
          <Form.Group className="mt-3">
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
          </Form.Group>
        )}
      </Modal.Body>
      <Modal.Footer>
        {mode === 'review' ? (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => setMode('reject')}
              disabled={processing}
            >
              <FaTimesCircle className="me-1" />
              Reject
            </Button>
            <Button
              variant="success"
              onClick={() => onAction('approve', {})}
              disabled={processing}
            >
              <FaCheckCircle className="me-1" />
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setMode('review')} disabled={processing}>
              Back
            </Button>
            <Button
              variant="danger"
              onClick={() => onAction('reject', { rejectionReason: rejectionReason.trim() })}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default WFHApprovalModal;
