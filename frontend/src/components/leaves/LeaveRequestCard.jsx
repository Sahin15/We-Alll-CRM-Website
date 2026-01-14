
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import { FaClock, FaUser, FaCheck, FaTimes, FaEdit, FaTrash, FaPaperclip, FaDownload, FaChartLine } from 'react-icons/fa';
import moment from 'moment';
import { useState, useEffect } from 'react';
import { leaveApi } from '../../api/leaveApi';

const LeaveRequestCard = ({ 
  leave, 
  isAdmin, 
  currentUserId, 
  onApproveReject, 
  onApprove,
  onReject,
  onCancel, 
  getStatusColor, 
  getLeaveTypeColor 
}) => {
  const [usageSummary, setUsageSummary] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Add comprehensive null checks to prevent runtime errors
  if (!leave) {
    return null;
  }

  // Handle cases where employee data might not be populated
  const employee = leave.employee || {};
  const employeeName = employee.name || 'Unknown Employee';
  const employeeId = employee._id || leave.employeeId || null;

  const isOwnRequest = employeeId === currentUserId || leave.employee?._id === currentUserId;
  const canEdit = isOwnRequest && leave.status === 'pending';
  const canCancel = isOwnRequest && ['pending', 'approved'].includes(leave.status);
  const canApproveReject = isAdmin && leave.status === 'pending';

  // Load usage summary for admin view
  useEffect(() => {
    if (isAdmin && !isOwnRequest && employeeId) {
      loadUsageSummary();
    }
  }, [isAdmin, isOwnRequest, employeeId]);

  const loadUsageSummary = async () => {
    try {
      setLoadingUsage(true);
      const response = await leaveApi.getLeaveUsageSummary(employeeId, leave.leaveYear || new Date().getFullYear());
      setUsageSummary(response.data);
    } catch (error) {
      console.error('Error loading usage summary:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  const formatDate = (date) => {
    return moment(date).format('MMM DD, YYYY');
  };

  const getDuration = () => {
    const start = moment(leave.startDate);
    const end = moment(leave.endDate);
    const days = end.diff(start, 'days') + 1;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <Card 
      className="leave-request-card border-0 shadow-sm h-100"
      style={{
        borderLeft: `4px solid ${leave.status === 'approved' ? '#28a745' : 
                                 leave.status === 'rejected' ? '#dc3545' : 
                                 leave.status === 'pending' ? '#ffc107' : '#6c757d'}`
      }}
    >
      <Card.Body>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center gap-2">
            <Badge bg={getLeaveTypeColor(leave.leaveType)} className="leave-type-badge">
              {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
            </Badge>
            <Badge bg={getStatusColor(leave.status)} className="status-badge">
              {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
            </Badge>
          </div>
          <div className="text-muted small">
            <FaClock className="me-1" />
            {moment(leave.createdAt).fromNow()}
          </div>
        </div>

        {/* Employee Info (for admin view) */}
        {isAdmin && !isOwnRequest && (
          <div className="employee-info mb-3 p-2 bg-light rounded">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <FaUser className="text-muted" />
                <div>
                  <div className="fw-bold">{employeeName}</div>
                  <div className="small text-muted">
                    {employee.designation || 'N/A'} • {employee.department?.name || 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* Usage Ratio Display */}
              <div className="text-end">
                {loadingUsage ? (
                  <div className="small text-muted">Loading...</div>
                ) : usageSummary ? (
                  <div>
                    <div className="small text-muted">
                      <FaChartLine className="me-1" />
                      Leave Usage
                    </div>
                    <div className="fw-bold text-primary">
                      {usageSummary.summary.currentRatio}
                    </div>
                    <div className="small text-muted">
                      {usageSummary.balance.earned.remaining} days available
                    </div>
                  </div>
                ) : (
                  <div className="small text-muted">Usage data unavailable</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Leave Details */}
        <div className="leave-details mb-3">
          <Row className="g-2">
            <Col sm={6}>
              <div className="detail-item">
                <div className="small text-muted">Start Date</div>
                <div className="fw-bold">{formatDate(leave.startDate)}</div>
              </div>
            </Col>
            <Col sm={6}>
              <div className="detail-item">
                <div className="small text-muted">End Date</div>
                <div className="fw-bold">{formatDate(leave.endDate)}</div>
              </div>
            </Col>
            <Col sm={6}>
              <div className="detail-item">
                <div className="small text-muted">Duration</div>
                <div className="fw-bold text-primary">{getDuration()}</div>
              </div>
            </Col>
            <Col sm={6}>
              <div className="detail-item">
                <div className="small text-muted">Days</div>
                <div className="fw-bold">{leave.numberOfDays || getDuration()}</div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Reason */}
        <div className="reason-section mb-3">
          <div className="small text-muted mb-1">Reason</div>
          <div className="reason-text">{leave.reason}</div>
        </div>

        {/* Attachments */}
        {leave.attachments && leave.attachments.length > 0 && (
          <div className="attachments-section mb-3">
            <div className="small text-muted mb-2">
              <FaPaperclip className="me-1" />
              Attachments ({leave.attachments.length})
            </div>
            <div className="attachments-list">
              {leave.attachments.map((attachment, index) => {
                const fileName = attachment.split('/').pop().split('-').slice(2).join('-') || `Attachment ${index + 1}`;
                return (
                  <div key={index} className="attachment-item d-flex justify-content-between align-items-center p-2 bg-light rounded mb-1">
                    <div className="d-flex align-items-center">
                      <FaPaperclip className="text-primary me-2" size={12} />
                      <span className="small">{fileName}</span>
                    </div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => window.open(attachment, '_blank')}
                      className="attachment-download-btn"
                    >
                      <FaDownload size={10} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Approval Info */}
        {leave.status !== 'pending' && leave.approvedBy && (
          <div 
            className="approval-info mb-3 p-2 rounded" 
            style={{ 
              backgroundColor: leave.status === 'approved' ? '#d4edda' : '#f8d7da',
              borderLeft: `3px solid ${leave.status === 'approved' ? '#28a745' : '#dc3545'}`
            }}
          >
            <div className="small">
              <strong>
                {leave.status === 'approved' ? 'Approved' : 'Rejected'} by:
              </strong> {leave.approvedBy.name}
            </div>
            <div className="small text-muted">
              {moment(leave.approvedDate).format('MMM DD, YYYY [at] HH:mm')}
            </div>
            {leave.rejectionReason && (
              <div className="small mt-1">
                <strong>Note:</strong> {leave.rejectionReason}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="actions-section">
          {canApproveReject && (
            <div className="d-flex gap-2 mb-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => onApprove ? onApprove(leave) : onApproveReject(leave)}
                className="flex-fill"
              >
                <FaCheck className="me-1" />
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onReject ? onReject(leave) : onApproveReject(leave)}
                className="flex-fill"
              >
                <FaTimes className="me-1" />
                Reject
              </Button>
            </div>
          )}

          {isOwnRequest && (
            <div className="d-flex gap-2">
              {canEdit && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="flex-fill"
                >
                  <FaEdit className="me-1" />
                  Edit
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onCancel(leave._id)}
                  className="flex-fill"
                >
                  <FaTrash className="me-1" />
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default LeaveRequestCard;