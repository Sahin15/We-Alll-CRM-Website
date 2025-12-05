import React from 'react';
import { Alert } from 'react-bootstrap';
import { FaExclamationTriangle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import './WorkloadWarning.css';

const WorkloadWarning = ({ 
  employee, 
  workload, 
  severity = 'warning',
  onProceed = null,
  onCancel = null,
  showActions = false
}) => {
  // Determine warning configuration based on severity
  const getWarningConfig = (severity) => {
    switch (severity) {
      case 'info':
        return {
          variant: 'info',
          icon: <FaInfoCircle />,
          title: 'Employee is Busy',
          className: 'workload-warning-info'
        };
      case 'warning':
        return {
          variant: 'warning',
          icon: <FaExclamationTriangle />,
          title: 'Employee Has High Workload',
          className: 'workload-warning-warning'
        };
      case 'error':
        return {
          variant: 'danger',
          icon: <FaTimesCircle />,
          title: 'Employee is Overloaded',
          className: 'workload-warning-error'
        };
      default:
        return {
          variant: 'secondary',
          icon: <FaInfoCircle />,
          title: 'Workload Notice',
          className: ''
        };
    }
  };

  const config = getWarningConfig(severity);

  // Generate warning message based on workload
  const getMessage = () => {
    const { totalActive, dueThisWeek, overdue, capacity } = workload || {};
    
    let message = `${employee?.name || 'This employee'} currently has `;
    const parts = [];
    
    if (totalActive > 0) {
      parts.push(`${totalActive} active task${totalActive !== 1 ? 's' : ''}`);
    }
    
    if (dueThisWeek > 0) {
      parts.push(`${dueThisWeek} due this week`);
    }
    
    if (overdue > 0) {
      parts.push(`${overdue} overdue`);
    }
    
    message += parts.join(', ') + '.';
    
    // Add recommendation based on capacity
    if (capacity === 'overloaded') {
      message += ' Consider redistributing work or adjusting the deadline.';
    } else if (capacity === 'busy') {
      message += ' Please ensure the deadline is realistic.';
    }
    
    return message;
  };

  return (
    <Alert 
      variant={config.variant} 
      className={`workload-warning ${config.className} mb-3`}
    >
      <div className="d-flex align-items-start">
        <div className="warning-icon me-3">
          {config.icon}
        </div>
        <div className="flex-grow-1">
          <Alert.Heading as="h6" className="mb-2">
            {config.icon} {config.title}
          </Alert.Heading>
          <p className="mb-2">{getMessage()}</p>
          
          {workload && (
            <div className="workload-summary">
              <div className="summary-row">
                <span className="summary-label">Active Tasks:</span>
                <strong className="summary-value">{workload.totalActive || 0}</strong>
              </div>
              <div className="summary-row">
                <span className="summary-label">Due This Week:</span>
                <strong className="summary-value text-warning">{workload.dueThisWeek || 0}</strong>
              </div>
              {workload.overdue > 0 && (
                <div className="summary-row">
                  <span className="summary-label">Overdue:</span>
                  <strong className="summary-value text-danger">{workload.overdue}</strong>
                </div>
              )}
            </div>
          )}
          
          {showActions && (onProceed || onCancel) && (
            <div className="warning-actions mt-3">
              {onCancel && (
                <button 
                  className="btn btn-sm btn-outline-secondary me-2"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              )}
              {onProceed && (
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={onProceed}
                >
                  Proceed Anyway
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default WorkloadWarning;
