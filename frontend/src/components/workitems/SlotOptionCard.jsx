import React from 'react';
import { Card, Badge, Button, Row, Col, ProgressBar } from 'react-bootstrap';
import { 
  FaCheckCircle, 
  FaClock, 
  FaUser, 
  FaExclamationTriangle,
  FaLock,
  FaArrowRight,
  FaCalendarAlt
} from 'react-icons/fa';

/**
 * SlotOptionCard Component
 * 
 * Card component displaying detailed slot information for selection
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1
 */
const SlotOptionCard = ({
  slot,
  isSelected = false,
  isSelectable = true,
  onSelect,
  showDetails = true,
  showProgress = false,
  compact = false,
  className = ''
}) => {
  if (!slot) return null;

  const getStatusConfig = () => {
    const statusConfigs = {
      'available': {
        bg: 'success',
        text: 'Available',
        icon: FaCheckCircle,
        description: 'Ready for assignment'
      },
      'assigned': {
        bg: 'primary',
        text: 'Assigned',
        icon: FaUser,
        description: `Assigned to ${slot.assignedTo?.name || 'Unknown'}`
      },
      'in-progress': {
        bg: 'warning',
        text: 'In Progress',
        icon: FaClock,
        description: 'Currently being worked on'
      },
      'completed': {
        bg: 'secondary',
        text: 'Completed',
        icon: FaCheckCircle,
        description: 'Work has been completed'
      },
      'blocked': {
        bg: 'danger',
        text: 'Blocked',
        icon: FaLock,
        description: 'Cannot be started due to dependencies or issues'
      },
      'cancelled': {
        bg: 'dark',
        text: 'Cancelled',
        icon: FaExclamationTriangle,
        description: 'Slot has been cancelled'
      }
    };

    return statusConfigs[slot.assignmentStatus] || statusConfigs['available'];
  };

  const getPriorityConfig = () => {
    const priorityConfigs = {
      'Low': { bg: 'info', text: 'Low Priority' },
      'Medium': { bg: 'warning', text: 'Medium Priority' },
      'High': { bg: 'danger', text: 'High Priority' },
      'Urgent': { bg: 'danger', text: 'Urgent Priority' }
    };

    return priorityConfigs[slot.priority] || priorityConfigs['Medium'];
  };

  const calculateProgress = () => {
    if (slot.assignmentStatus === 'completed') return 100;
    if (slot.assignmentStatus === 'in-progress') return 50;
    if (slot.assignmentStatus === 'assigned') return 25;
    return 0;
  };

  const isOverdue = () => {
    if (!slot.dueDate) return false;
    return new Date(slot.dueDate) < new Date() && slot.assignmentStatus !== 'completed';
  };

  const getDaysUntilDue = () => {
    if (!slot.dueDate) return null;
    const today = new Date();
    const dueDate = new Date(slot.dueDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const statusConfig = getStatusConfig();
  const priorityConfig = getPriorityConfig();
  const progress = calculateProgress();
  const daysUntilDue = getDaysUntilDue();
  const overdue = isOverdue();

  const StatusIcon = statusConfig.icon;

  const handleCardClick = () => {
    if (isSelectable && onSelect) {
      onSelect(slot);
    }
  };

  return (
    <Card 
      className={`slot-option-card h-100 ${isSelected ? 'border-primary shadow-sm' : ''} ${
        isSelectable ? 'cursor-pointer' : 'opacity-75'
      } ${className}`}
      onClick={handleCardClick}
      style={{ 
        cursor: isSelectable ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <Card.Header className={`d-flex justify-content-between align-items-center py-2 ${
        isSelected ? 'bg-primary text-white' : 'bg-light'
      }`}>
        <div className="d-flex align-items-center">
          <StatusIcon className={`me-2 ${isSelected ? 'text-white' : `text-${statusConfig.bg}`}`} />
          <strong>{slot.slotIdentifier}</strong>
          {isSelected && <FaArrowRight className="ms-2" />}
        </div>
        <div className="d-flex gap-1">
          <Badge bg={priorityConfig.bg} size="sm">
            {slot.priority}
          </Badge>
          <Badge bg={statusConfig.bg} size="sm">
            {statusConfig.text}
          </Badge>
        </div>
      </Card.Header>

      <Card.Body className={compact ? 'py-2' : 'py-3'}>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="mb-1 text-truncate" title={slot.title}>
            {slot.title}
          </h6>
          {slot.slotConfiguration?.isRequired && (
            <Badge bg="warning" size="sm" className="ms-2">
              Required
            </Badge>
          )}
        </div>

        {showDetails && slot.description && (
          <p className="text-muted small mb-2" style={{ 
            display: '-webkit-box',
            WebkitLineClamp: compact ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {slot.description}
          </p>
        )}

        {showProgress && (
          <div className="mb-2">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">Progress</small>
              <small className="fw-bold">{progress}%</small>
            </div>
            <ProgressBar 
              now={progress} 
              variant={progress === 100 ? 'success' : progress > 0 ? 'primary' : 'secondary'}
              style={{ height: '4px' }}
            />
          </div>
        )}

        <Row className="g-2 small">
          {slot.dueDate && (
            <Col xs={6}>
              <div className="d-flex align-items-center">
                <FaCalendarAlt className={`me-1 ${overdue ? 'text-danger' : 'text-muted'}`} />
                <span className={overdue ? 'text-danger fw-bold' : 'text-muted'}>
                  {overdue ? 'Overdue' : daysUntilDue === 0 ? 'Due Today' : 
                   daysUntilDue === 1 ? 'Due Tomorrow' :
                   daysUntilDue > 0 ? `${daysUntilDue} days` : 
                   new Date(slot.dueDate).toLocaleDateString()}
                </span>
              </div>
            </Col>
          )}
          
          {slot.estimatedEffort && (
            <Col xs={6}>
              <div className="d-flex align-items-center">
                <FaClock className="me-1 text-muted" />
                <span className="text-muted">{slot.estimatedEffort}h</span>
              </div>
            </Col>
          )}

          {slot.assignedTo && (
            <Col xs={12}>
              <div className="d-flex align-items-center">
                <FaUser className="me-1 text-muted" />
                <span className="text-muted small">
                  Assigned to {slot.assignedTo.name}
                </span>
              </div>
            </Col>
          )}

          {slot.dependencies && slot.dependencies.length > 0 && (
            <Col xs={12}>
              <div className="d-flex align-items-center">
                <FaExclamationTriangle className="me-1 text-warning" />
                <span className="text-warning small">
                  {slot.dependencies.length} dependency(ies)
                </span>
              </div>
            </Col>
          )}
        </Row>

        {showDetails && slot.slotConfiguration && (
          <div className="mt-2 pt-2 border-top">
            <div className="d-flex flex-wrap gap-1">
              {slot.slotConfiguration.requiresApproval && (
                <Badge bg="info" size="sm">Requires Approval</Badge>
              )}
              {slot.slotConfiguration.canBeSkipped && (
                <Badge bg="secondary" size="sm">Optional</Badge>
              )}
              {slot.slotMetadata?.tags && slot.slotMetadata.tags.map(tag => (
                <Badge key={tag} bg="light" text="dark" size="sm">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
      </Card.Body>

      {!isSelectable && (
        <Card.Footer className="py-2 bg-light">
          <small className="text-muted">
            <FaLock className="me-1" />
            {statusConfig.description}
          </small>
        </Card.Footer>
      )}

      {isSelected && (
        <Card.Footer className="py-2 bg-primary text-white">
          <small>
            <FaCheckCircle className="me-1" />
            Selected for assignment
          </small>
        </Card.Footer>
      )}
    </Card>
  );
};

export default SlotOptionCard;