import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { FaUser, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import './WorkloadCard.css';

const WorkloadCard = ({ 
  employee, 
  workload, 
  showDetails = false, 
  onClick = null,
  isSelected = false 
}) => {
  // Determine capacity color and icon
  const getCapacityConfig = (capacity) => {
    switch (capacity) {
      case 'available':
        return {
          color: 'success',
          icon: <FaCheckCircle />,
          label: 'Available',
          bgClass: 'capacity-available'
        };
      case 'busy':
        return {
          color: 'warning',
          icon: <FaExclamationTriangle />,
          label: 'Busy',
          bgClass: 'capacity-busy'
        };
      case 'overloaded':
        return {
          color: 'danger',
          icon: <FaTimesCircle />,
          label: 'Overloaded',
          bgClass: 'capacity-overloaded'
        };
      default:
        return {
          color: 'secondary',
          icon: <FaUser />,
          label: 'Unknown',
          bgClass: ''
        };
    }
  };

  const capacityConfig = getCapacityConfig(workload?.capacity);
  const isClickable = onClick !== null;

  return (
    <Card 
      className={`workload-card ${capacityConfig.bgClass} ${isClickable ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={isClickable ? onClick : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <Card.Body className="p-3">
        {/* Employee Info */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center gap-2">
            {employee?.avatar ? (
              <img loading="lazy" src={employee.avatar} 
                alt={employee.name}
                className="rounded-circle"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              />
            ) : (
              <div 
                className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
              >
                <FaUser />
              </div>
            )}
            <div>
              <h6 className="mb-0" style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                {employee?.name || 'Unknown'}
              </h6>
              {employee?.designation && (
                <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {employee.designation}
                </small>
              )}
            </div>
          </div>
          <Badge 
            bg={capacityConfig.color}
            className="d-flex align-items-center gap-1"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
          >
            {capacityConfig.icon}
            <span>{capacityConfig.label}</span>
          </Badge>
        </div>

        {/* Workload Metrics */}
        <div className="workload-metrics">
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">Active Tasks</span>
              <span className="metric-value">{workload?.totalActive || 0}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Due This Week</span>
              <span className="metric-value text-warning">{workload?.dueThisWeek || 0}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Overdue</span>
              <span className={`metric-value ${workload?.overdue > 0 ? 'text-danger' : ''}`}>
                {workload?.overdue || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Task List (Optional) */}
        {showDetails && workload?.tasks && workload.tasks.length > 0 && (
          <div className="task-details mt-3 pt-3 border-top">
            <small className="text-muted d-block mb-2" style={{ fontWeight: '600' }}>
              Recent Tasks:
            </small>
            <div className="task-list">
              {workload.tasks.slice(0, 3).map((task, index) => (
                <div key={task._id || index} className="task-item">
                  <small className="task-title">{task.title}</small>
                  <Badge 
                    bg={task.status === 'done' || task.status === 'Approved' ? 'success' : 'secondary'}
                    className="task-status"
                  >
                    {task.status}
                  </Badge>
                </div>
              ))}
              {workload.tasks.length > 3 && (
                <small className="text-muted">
                  +{workload.tasks.length - 3} more tasks
                </small>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default WorkloadCard;

