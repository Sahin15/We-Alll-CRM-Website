import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import './WorkloadIndicator.css';

const WorkloadIndicator = ({ 
  capacity, 
  taskCount = 0, 
  overdueCount = 0,
  dueThisWeek = 0,
  size = 'md', 
  showTooltip = true,
  showIcon = true,
  showLabel = true
}) => {
  // Determine capacity configuration
  const getCapacityConfig = (capacity) => {
    switch (capacity) {
      case 'available':
        return {
          color: 'success',
          icon: <FaCheckCircle />,
          label: 'Available',
          className: 'workload-indicator-available'
        };
      case 'busy':
        return {
          color: 'warning',
          icon: <FaExclamationTriangle />,
          label: 'Busy',
          className: 'workload-indicator-busy'
        };
      case 'overloaded':
        return {
          color: 'danger',
          icon: <FaTimesCircle />,
          label: 'Overloaded',
          className: 'workload-indicator-overloaded'
        };
      default:
        return {
          color: 'secondary',
          icon: <FaExclamationCircle />,
          label: 'Unknown',
          className: 'workload-indicator-unknown'
        };
    }
  };

  const config = getCapacityConfig(capacity);

  // Size classes
  const sizeClasses = {
    sm: 'workload-indicator-sm',
    md: 'workload-indicator-md',
    lg: 'workload-indicator-lg'
  };

  // Tooltip content
  const tooltipContent = (
    <div className="workload-tooltip">
      <div className="tooltip-header">
        <strong>{config.label}</strong>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-row">
          <span>Active Tasks:</span>
          <strong>{taskCount}</strong>
        </div>
        <div className="tooltip-row">
          <span>Due This Week:</span>
          <strong className="text-warning">{dueThisWeek}</strong>
        </div>
        {overdueCount > 0 && (
          <div className="tooltip-row">
            <span>Overdue:</span>
            <strong className="text-danger">{overdueCount}</strong>
          </div>
        )}
      </div>
    </div>
  );

  // Badge content
  const badgeContent = (
    <Badge 
      bg={config.color}
      className={`workload-indicator ${config.className} ${sizeClasses[size]} d-inline-flex align-items-center gap-1`}
    >
      {showIcon && <span className="indicator-icon">{config.icon}</span>}
      {showLabel && <span className="indicator-label">{config.label}</span>}
      {overdueCount > 0 && (
        <span className="overdue-badge">
          <FaExclamationCircle className="me-1" />
          {overdueCount}
        </span>
      )}
    </Badge>
  );

  // Return with or without tooltip
  if (showTooltip) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`workload-tooltip-${capacity}`}>{tooltipContent}</Tooltip>}
      >
        {badgeContent}
      </OverlayTrigger>
    );
  }

  return badgeContent;
};

export default WorkloadIndicator;
