import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { FaTimes, FaCheck } from 'react-icons/fa';
import toast from '../../utils/toast';

const DocumentVerificationModal = ({ 
  show, 
  onHide, 
  document, 
  onApprove, 
  onReject, 
  loading 
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [action, setAction] = useState(null); // 'approve' or 'reject'

  const handleApprove = async () => {
    try {
      await onApprove(document._id);
      setAction(null);
      setRejectReason('');
      onHide();
    } catch (error) {
      toast.error('Failed to approve document');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await onReject(document._id, rejectReason);
      setAction(null);
      setRejectReason('');
      onHide();
    } catch (error) {
      toast.error('Failed to reject document');
    }
  };

  if (!document) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Document Verification</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <h6 className="text-muted mb-2">Document Details</h6>
          <div className="p-3 bg-light rounded">
            <div className="mb-2">
              <strong>File Name:</strong> {document.originalName}
            </div>
            <div className="mb-2">
              <strong>Category:</strong> {document.category?.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div className="mb-2">
              <strong>Uploaded By:</strong> {document.uploadedBy?.name || 'Unknown'}
            </div>
            <div className="mb-2">
              <strong>Upload Date:</strong> {new Date(document.createdAt).toLocaleDateString('en-IN')}
            </div>
            {document.description && (
              <div>
                <strong>Description:</strong> {document.description}
              </div>
            )}
          </div>
        </div>

        {action === 'reject' && (
          <div className="mb-4">
            <Alert variant="danger">
              <FaTimes className="me-2" />
              Please provide a reason for rejecting this document
            </Alert>
            <Form.Group>
              <Form.Label>Rejection Reason *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
              />
            </Form.Group>
          </div>
        )}

        {action === 'approve' && (
          <Alert variant="success">
            <FaCheck className="me-2" />
            Are you sure you want to approve this document?
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        {!action ? (
          <>
            <Button variant="secondary" onClick={onHide}>
              Close
            </Button>
            <Button 
              variant="danger" 
              onClick={() => setAction('reject')}
              disabled={loading}
            >
              <FaTimes className="me-2" />
              Reject
            </Button>
            <Button 
              variant="success" 
              onClick={() => setAction('approve')}
              disabled={loading}
            >
              <FaCheck className="me-2" />
              Approve
            </Button>
          </>
        ) : action === 'approve' ? (
          <>
            <Button 
              variant="secondary" 
              onClick={() => setAction(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="success" 
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="secondary" 
              onClick={() => setAction(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleReject}
              disabled={loading || !rejectReason.trim()}
            >
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default DocumentVerificationModal;
