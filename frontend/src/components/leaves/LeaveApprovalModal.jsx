import { useState } from 'react';
import { Modal, Form, Button, Row, Col, Badge, Alert } from 'react-bootstrap';
import { FaCheck, FaTimes, FaUser, FaCalendarAlt, FaClock, FaFileAlt, FaPaperclip, FaDownload } from 'react-icons/fa';
import moment from 'moment';

const LeaveApprovalModal = ({ show, onHide, leave, onAction }) => {
  const [action, setAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPending = leave?.status === 'pending';

  const handleActionSelect = (selectedAction) => {
    setAction(selectedAction);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!action) {
      setError('Please select an action');
      return;
    }

    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const data = action === 'reject' 
        ? { rejectionReason: rejectionReason.trim() }
        : { approvalComment: approvalComment.trim() };
      
      await onAction(action, data);
      handleClose();
    } catch (error) {
      console.error('Error processing leave:', error);
      setError('Failed to process leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAction('');
    setRejectionReason('');
    setApprovalComment('');
    setError('');
    onHide();
  };

  const formatDate = (date) => {
    return moment(date).format('MMM DD, YYYY');
  };

  const getDuration = () => {
    if (!leave) return '';
    const start = moment(leave.startDate);
    const end = moment(leave.endDate);
    const days = end.diff(start, 'days') + 1;
    return `${days} day${days > 1 ? 's' : ''}`;
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

  if (!leave) return null;

  const statusColors = { approved: 'success', rejected: 'danger', cancelled: 'secondary', pending: 'warning' };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaCalendarAlt className="text-primary" />
          {isPending ? 'Review Leave Request' : 'Leave Request Details'}
          {!isPending && (
            <Badge bg={statusColors[leave.status] || 'secondary'} className="ms-2 text-capitalize">
              {leave.status}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2">
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {/* Employee Information */}
        <div className="employee-section mb-4 p-3 bg-light rounded">
          <div className="d-flex align-items-center gap-3">
            <div className="employee-avatar">
              <FaUser size={24} className="text-muted" />
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-1">{leave.employee.name}</h6>
              <div className="text-muted small">
                {leave.employee.designation} • {leave.employee.department?.name}
              </div>
              <div className="text-muted small">
                Employee ID: {leave.employee.employeeId}
              </div>
            </div>
            <Badge bg={getLeaveTypeColor(leave.leaveType)} className="leave-type-badge">
              {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Leave Details */}
        <div className="leave-details-section mb-4">
          <h6 className="section-title mb-3">Leave Details</h6>
          <Row className="g-3">
            <Col md={6}>
              <div className="detail-card p-3 border rounded">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <FaCalendarAlt className="text-primary" />
                  <span className="fw-bold">Start Date</span>
                </div>
                <div className="detail-value">{formatDate(leave.startDate)}</div>
              </div>
            </Col>
            <Col md={6}>
              <div className="detail-card p-3 border rounded">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <FaCalendarAlt className="text-primary" />
                  <span className="fw-bold">End Date</span>
                </div>
                <div className="detail-value">{formatDate(leave.endDate)}</div>
              </div>
            </Col>
            <Col md={6}>
              <div className="detail-card p-3 border rounded">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <FaClock className="text-info" />
                  <span className="fw-bold">Duration</span>
                </div>
                <div className="detail-value text-primary">{getDuration()}</div>
              </div>
            </Col>
            <Col md={6}>
              <div className="detail-card p-3 border rounded">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <FaClock className="text-info" />
                  <span className="fw-bold">Requested</span>
                </div>
                <div className="detail-value">{moment(leave.createdAt).fromNow()}</div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Reason */}
        <div className="reason-section mb-4">
          <h6 className="section-title mb-3">
            <FaFileAlt className="me-2" />
            Reason for Leave
          </h6>
          <div className="reason-content p-3 bg-light rounded">
            {leave.reason}
          </div>
        </div>

        {/* Attachments */}
        {leave.attachments && leave.attachments.length > 0 && (
          <div className="attachments-section mb-4">
            <h6 className="section-title mb-3">
              <FaPaperclip className="me-2" />
              Attachments ({leave.attachments.length})
            </h6>
            <div className="attachments-grid">
              {leave.attachments.map((attachment, index) => {
                const fileName = attachment.split('/').pop().split('-').slice(2).join('-') || `Attachment ${index + 1}`;
                const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
                
                return (
                  <div key={index} className="attachment-card p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="attachment-info flex-grow-1">
                        <div className="attachment-name fw-bold small">{fileName}</div>
                        <div className="attachment-type text-muted small">
                          {fileExtension.toUpperCase()} File
                        </div>
                      </div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => window.open(attachment, '_blank')}
                        className="ms-2"
                      >
                        <FaDownload className="me-1" />
                        View
                      </Button>
                    </div>
                    {isImage && (
                      <div className="attachment-preview">
                        <img 
                          src={attachment} 
                          alt={fileName}
                          className="img-fluid rounded"
                          style={{ maxHeight: '100px', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Selection — only for pending leaves */}
        {isPending && (
        <div className="action-section mb-4">
          <h6 className="section-title mb-3">Action Required</h6>
          <div className="action-buttons mb-3">
            <Button
              variant={action === 'approve' ? 'success' : 'outline-success'}
              className="me-2 action-btn"
              onClick={() => handleActionSelect('approve')}
            >
              <FaCheck className="me-2" />
              Approve Leave
            </Button>
            <Button
              variant={action === 'reject' ? 'danger' : 'outline-danger'}
              className="action-btn"
              onClick={() => handleActionSelect('reject')}
            >
              <FaTimes className="me-2" />
              Reject Leave
            </Button>
          </div>

          {/* Approval Comment */}
          {action === 'approve' && (
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Approval Comment (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Add any comments or conditions for the approval..."
              />
            </Form.Group>
          )}

          {/* Rejection Reason */}
          {action === 'reject' && (
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Rejection Reason *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for rejecting this leave request..."
                required
              />
              <Form.Text className="text-muted">
                This reason will be shared with the employee.
              </Form.Text>
            </Form.Group>
          )}
        </div>
        )}

        {/* Show approval/rejection info for already-processed leaves */}
        {!isPending && leave.status === 'approved' && leave.rejectionReason && (
          <div className="mb-4">
            <h6 className="section-title mb-2">✅ Approval Note</h6>
            <div className="p-3 rounded" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}>{leave.rejectionReason}</div>
          </div>
        )}
        {!isPending && leave.status === 'rejected' && leave.rejectionReason && (
          <div className="mb-4">
            <h6 className="section-title mb-2">❌ Rejection Reason</h6>
            <div className="p-3 rounded" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>{leave.rejectionReason}</div>
          </div>
        )}

        {/* Approved / Reviewed by — shown for all non-pending leaves */}
        {!isPending && (leave.approvedBy || leave.approvedDate) && (
          <div className="mb-4 p-3 bg-light rounded d-flex align-items-center gap-2">
            <FaUser className="text-muted flex-shrink-0" size={14} />
            <div className="small text-muted">
              <strong className="text-dark">
                {leave.status === 'approved' ? 'Approved' : 'Reviewed'} by:
              </strong>{' '}
              {leave.approvedBy?.name || 'HR / Admin'}
              {leave.approvedDate && (
                <span className="ms-2 text-muted">
                  on {formatDate(leave.approvedDate)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Impact Notice */}
        {isPending && action && (
          <Alert variant={action === 'approve' ? 'success' : 'warning'} className="mb-0">
            <div className="d-flex align-items-start gap-2">
              {action === 'approve' ? <FaCheck /> : <FaTimes />}
              <div>
                <strong>
                  {action === 'approve' ? 'Approval Notice:' : 'Rejection Notice:'}
                </strong>
                <div className="small mt-1">
                  {action === 'approve' 
                    ? 'The employee will be notified of the approval and the leave will be added to their calendar.'
                    : 'The employee will be notified of the rejection with your provided reason.'
                  }
                </div>
              </div>
            </div>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        <Button variant="outline-secondary" onClick={handleClose}>
          {isPending ? 'Cancel' : 'Close'}
        </Button>
        {isPending && (
        <Button 
          variant={action === 'approve' ? 'success' : action === 'reject' ? 'danger' : 'primary'}
          onClick={handleSubmit}
          disabled={loading || !action}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Processing...
            </>
          ) : (
            <>
              {action === 'approve' && <FaCheck className="me-2" />}
              {action === 'reject' && <FaTimes className="me-2" />}
              {action === 'approve' ? 'Approve Leave' : action === 'reject' ? 'Reject Leave' : 'Select Action'}
            </>
          )}
        </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default LeaveApprovalModal;