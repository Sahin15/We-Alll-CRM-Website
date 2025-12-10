import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { FaCalendar, FaTasks, FaClock, FaUser } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import {
  getStatusAriaLabel,
  getTypeAriaLabel,
  getDueDateAriaLabel,
  handleKeyboardNavigation,
} from '../../utils/accessibility';

const WorkItemCard = ({ workItem, onView, onStatusChange }) => {
  const isOverdue = workItem.isOverdue || (
    workItem.dueDate && 
    new Date(workItem.dueDate) < new Date() && 
    workItem.status !== 'Done'
  );
  
  const isDueToday = workItem.isDueToday || (
    workItem.dueDate && 
    new Date(workItem.dueDate).toDateString() === new Date().toDateString() &&
    workItem.status !== 'Done'
  );

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
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
  
  return (
    <Card 
      className={`h-100 ${isOverdue ? 'border-danger' : isDueToday ? 'border-warning' : ''}`}
      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      onClick={handleClick}
      onKeyDown={(e) => handleKeyboardNavigation(e, handleClick, handleClick)}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      tabIndex={0}
      role="button"
      aria-label={`Work item: ${workItem.title}. ${getStatusAriaLabel(workItem.status)}. ${getDueDateAriaLabel(workItem.dueDate, isOverdue, isDueToday)}`}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Badge 
            bg={getTypeColor(workItem.type)} 
            className="me-2"
            aria-label={getTypeAriaLabel(workItem.type)}
          >
            {getTypeIcon(workItem.type)} 
            <span aria-hidden="true">{workItem.type === 'content' ? 'Content' : 'Task'}</span>
          </Badge>
          <Badge 
            bg={getStatusColor(workItem.status)}
            aria-label={getStatusAriaLabel(workItem.status)}
            className="text-capitalize"
          >
            <span aria-hidden="true">{workItem.status}</span>
          </Badge>
        </div>

        <h6 className="mb-2">{workItem.title}</h6>
        
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
            <span aria-label={`Assigned to: ${workItem.assignedTo?.name || 'Unassigned'}`}>
              {workItem.assignedTo?.name || 'Unassigned'}
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
  );
};

export default WorkItemCard;
