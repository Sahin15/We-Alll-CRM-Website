import React, { useState } from 'react';
import { Card, Badge, Button, Dropdown, Modal, Form } from 'react-bootstrap';
import { FaCalendar, FaTasks, FaClock, FaUser, FaEllipsisV } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import {
  getStatusAriaLabel,
  getTypeAriaLabel,
  getDueDateAriaLabel,
  handleKeyboardNavigation,
} from '../../utils/accessibility';
import './WorkItemCard.css';

const WorkItemCard = ({ workItem, onView, onStatusChange, currentUser }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);
  
  const isTerminal = ['Done', 'Cancelled'].includes(workItem.status);
  const isOverdue = !isTerminal && (workItem.isOverdue || (
    workItem.dueDate && 
    new Date(workItem.dueDate) < new Date() && 
    !isTerminal
  ));
  
  const isDueToday = !isTerminal && (workItem.isDueToday || (
    workItem.dueDate && 
    new Date(workItem.dueDate).toDateString() === new Date().toDateString() &&
    !isTerminal
  ));

  // Helper function to check if current user can edit (supports multiple assignees)
  const canEdit = () => {
    // Admin roles can always edit
    if (['admin', 'superadmin', 'hod'].includes(currentUser?.role)) {
      return true;
    }
    
    // Check if current user is assigned (single or multiple)
    if (workItem.assignedTo?._id === currentUser?._id) {
      return true;
    }
    
    if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
      return workItem.assignedToMultiple.some(assignee => assignee._id === currentUser?._id);
    }
    
    return false;
  };

  // Helper function to get assignee names (supports both single and multiple assignees)
  const getAssigneeNames = (workItem) => {
    if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
      // Multiple assignees
      const names = workItem.assignedToMultiple.map(assignee => assignee.name).filter(Boolean);
      if (names.length === 0) return 'Unassigned';
      if (names.length === 1) return names[0];
      if (names.length === 2) return `${names[0]} & ${names[1]}`;
      return `${names[0]} & ${names.length - 1} others`;
    } else if (workItem.assignedTo?.name) {
      // Single assignee
      return workItem.assignedTo.name;
    }
    return 'Unassigned';
  };

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
      'Cancelled': 'danger',
    };
    return colors[status] || 'secondary';
  };

  const getTypeIcon = (type) => {
    return type === 'content' ? <FaCalendar /> : <FaTasks />;
  };

  const getTypeColor = (type) => {
    return type === 'content' ? 'success' : 'primary';
  };

  const handleClick = () => onView(workItem);
  
  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === workItem.status || !onStatusChange) return;

    if (newStatus === 'Cancelled') {
      setPendingStatus('Cancelled');
      setCancellationReason('');
      setShowCancelModal(true);
      return;
    }
    
    setIsUpdating(true);
    try {
      await onStatusChange(workItem._id, newStatus, null, null);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCancellation = async () => {
    const trimmed = cancellationReason.trim();
    if (trimmed.length < 25) return;
    setShowCancelModal(false);
    setIsUpdating(true);
    try {
      await onStatusChange(workItem._id, 'Cancelled', null, trimmed);
    } catch (error) {
      console.error('Error cancelling work item:', error);
    } finally {
      setIsUpdating(false);
      setCancellationReason('');
      setPendingStatus(null);
    }
  };
  
  return (
    <>
    <Card 
      className={`h-100 work-item-card ${isOverdue ? 'border-danger' : isDueToday ? 'border-warning' : ''} ${isTerminal && workItem.status === 'Cancelled' ? 'work-item-card-cancelled' : ''}`}
      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      onClick={handleClick}
      onKeyDown={(e) => handleKeyboardNavigation(e, handleClick, handleClick)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        setIsHovered(true);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        setIsHovered(false);
      }}
      tabIndex={0}
      role="button"
      aria-label={`Work item: ${workItem.title}. ${getStatusAriaLabel(workItem.status)}. ${getDueDateAriaLabel(workItem.dueDate, isOverdue, isDueToday)}`}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2">
            <Badge 
              bg={getTypeColor(workItem.type)} 
              className="me-2"
              aria-label={getTypeAriaLabel(workItem.type)}
            >
              {getTypeIcon(workItem.type)} 
              <span aria-hidden="true">{workItem.type === 'content' ? 'Content' : 'Task'}</span>
            </Badge>
            
            {/* Visibility Badge */}
            {workItem.visibility === 'draft' && (
              <Badge bg="secondary" style={{ fontSize: '0.7rem', padding: '4px 6px' }}>
                📝 Draft
              </Badge>
            )}
            {workItem.visibility === 'scheduled' && (
              <Badge bg="warning" style={{ fontSize: '0.7rem', padding: '4px 6px' }}>
                ⏰ Scheduled
              </Badge>
            )}
            {(!workItem.visibility || workItem.visibility === 'active') && (
              <Badge bg="success" style={{ fontSize: '0.7rem', padding: '4px 6px' }}>
                ✓ Active
              </Badge>
            )}
          </div>
          
          <div className="d-flex align-items-center gap-2">
            {/* Interactive Status Badge — hide dropdown for cancelled (terminal state) */}
            {canEdit() && isHovered && !isUpdating && workItem.status !== 'Cancelled' ? (
              <Dropdown align="end" onClick={(e) => e.stopPropagation()}>
                <Dropdown.Toggle
                  as={Badge}
                  bg={getStatusColor(workItem.status)}
                  className="status-dropdown-toggle"
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    fontSize: '0.75rem',
                    padding: '6px 8px',
                    position: 'relative'
                  }}
                >
                  {workItem.status} ▼
                </Dropdown.Toggle>

                <Dropdown.Menu className="status-dropdown-menu">
                  {['To Do', 'In Progress', 'Done', 'Cancelled'].map((status) => (
                    <Dropdown.Item
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(status);
                      }}
                      disabled={status === workItem.status}
                      className={`status-dropdown-item ${status === workItem.status ? 'active' : ''}`}
                    >
                      <Badge 
                        bg={getStatusColor(status)} 
                        className="me-2"
                        style={{ fontSize: '0.7rem' }}
                      >
                        {status}
                      </Badge>
                      {status === workItem.status && <span className="text-success">✓</span>}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <Badge 
                bg={getStatusColor(workItem.status)}
                aria-label={getStatusAriaLabel(workItem.status)}
                className="text-capitalize"
                style={{
                  position: 'relative',
                  fontSize: '0.75rem',
                  padding: '6px 8px'
                }}
              >
                {isUpdating && (
                  <span 
                    className="spinner-border spinner-border-sm me-1" 
                    style={{ width: '0.8rem', height: '0.8rem' }}
                  />
                )}
                <span aria-hidden="true">{workItem.status}</span>
              </Badge>
            )}
          </div>
        </div>

        <h6 className="mb-2">{workItem.title}</h6>
        
        {/* Cancellation reason shown on card */}
        {workItem.status === 'Cancelled' && workItem.cancellationReason && (
          <div style={{
            background: '#fff5f5',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            padding: '8px 10px',
            marginBottom: '8px',
            fontSize: '0.8rem',
            color: '#721c24'
          }}>
            <strong>🚫 Cancelled:</strong> {workItem.cancellationReason}
          </div>
        )}
        
        {workItem.description && (
          <p className="text-muted small mb-2" style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {workItem.description}
          </p>
        )}

        {workItem.type === 'content' && (
          <div className="mb-2">
            {workItem.platform && (
              <Badge bg="info" className="me-1">{workItem.platform}</Badge>
            )}
            {workItem.postType && (
              <Badge bg="secondary">{workItem.postType}</Badge>
            )}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="d-flex align-items-center text-muted small">
            <FaUser className="me-1" aria-hidden="true" />
            <span aria-label={`Assigned to: ${getAssigneeNames(workItem)}`}>
              {getAssigneeNames(workItem)}
            </span>
          </div>
          <div 
            className={`d-flex align-items-center small ${isOverdue ? 'text-danger fw-bold' : isDueToday ? 'text-warning fw-bold' : 'text-muted'}`}
            aria-label={getDueDateAriaLabel(workItem.dueDate, isOverdue, isDueToday)}
          >
            <FaClock className="me-1" aria-hidden="true" />
            <span aria-hidden="true">{formatDate(workItem.dueDate)}</span>
          </div>
        </div>

        {(isOverdue || isDueToday) && (
          <div className="mt-2" role="alert" aria-live="polite">
            {isOverdue && (
              <Badge bg="danger" className="w-100" aria-label="This work item is overdue">
                Overdue!
              </Badge>
            )}
            {isDueToday && !isOverdue && (
              <Badge bg="warning" text="dark" className="w-100" aria-label="This work item is due today">
                Due Today!
              </Badge>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
    
    {/* Cancellation Confirmation Modal */}
    <Modal
      show={showCancelModal}
      onHide={() => { setShowCancelModal(false); setCancellationReason(''); setPendingStatus(null); }}
      centered
      backdrop="static"
      onClick={(e) => e.stopPropagation()}
    >
      <Modal.Header closeButton style={{ background: '#dc3545', color: 'white' }}>
        <Modal.Title style={{ fontSize: '1.1rem' }}>Confirm Work Cancellation</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <p className="text-muted mb-4">
          Are you sure you want to cancel <strong>{workItem.title}</strong>?
          This action is permanent and cannot be undone.
        </p>
        <Form.Group>
          <Form.Label className="fw-bold small text-uppercase text-muted">
            Cancellation Reason <span className="text-danger">*</span> (Min 25 chars)
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder="Explain why this work is being cancelled..."
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            style={{ borderRadius: '8px', resize: 'none' }}
            isInvalid={cancellationReason.trim().length > 0 && cancellationReason.trim().length < 25}
          />
          <Form.Control.Feedback type="invalid">
            Please provide at least 25 characters.
          </Form.Control.Feedback>
          <div className="text-end mt-1">
            <small className={cancellationReason.trim().length < 25 ? 'text-danger' : 'text-success'}>
              {cancellationReason.trim().length}/25 characters
            </small>
          </div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer className="border-0 p-4 pt-0">
        <Button
          variant="outline-secondary"
          onClick={() => { setShowCancelModal(false); setCancellationReason(''); setPendingStatus(null); }}
          style={{ borderRadius: '20px', padding: '8px 20px' }}
        >
          Go Back
        </Button>
        <Button
          variant="danger"
          disabled={isUpdating || cancellationReason.trim().length < 25}
          onClick={handleConfirmCancellation}
          style={{ borderRadius: '20px', padding: '8px 24px', fontWeight: '600' }}
        >
          {isUpdating ? 'Processing...' : 'Confirm Cancellation'}
        </Button>
      </Modal.Footer>
    </Modal>
  </>
  );
};

export default WorkItemCard;
