import React, { useState, useEffect } from 'react';
import { Badge, Spinner, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { 
  FaCheckCircle, 
  FaClock, 
  FaUser, 
  FaExclamationTriangle,
  FaLock,
  FaBan,
  FaSync
} from 'react-icons/fa';

/**
 * SlotAvailabilityIndicator Component
 * 
 * Real-time indicator showing slot availability status with live updates
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1
 */
const SlotAvailabilityIndicator = ({
  slotId,
  projectId,
  slot = null, // Optional: pass slot data to avoid API call
  realTimeUpdates = true,
  refreshInterval = 30000, // 30 seconds
  showText = true,
  showIcon = true,
  size = 'md',
  variant = 'badge', // 'badge', 'text', 'icon-only'
  className = '',
  onStatusChange = null
}) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (slot) {
      // Use provided slot data
      const calculatedStatus = calculateSlotStatus(slot);
      setStatus(calculatedStatus);
      setLastUpdated(new Date());
    } else if (slotId && projectId) {
      // Fetch slot data
      fetchSlotStatus();
    }
  }, [slotId, projectId, slot]);

  useEffect(() => {
    if (realTimeUpdates && refreshInterval > 0 && slotId && projectId && !slot) {
      const interval = setInterval(() => {
        fetchSlotStatus(true); // Silent refresh
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [realTimeUpdates, refreshInterval, slotId, projectId, slot]);

  const fetchSlotStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual slot status API
      const mockSlotData = {
        _id: slotId,
        assignmentStatus: 'available',
        assignedTo: null,
        dependencies: [],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        slotConfiguration: {
          isRequired: true,
          canBeSkipped: false,
          requiresApproval: false
        },
        completionStatus: {
          isCompleted: false
        }
      };

      // Simulate different statuses for demo
      const statuses = ['available', 'assigned', 'in-progress', 'completed', 'blocked'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      mockSlotData.assignmentStatus = randomStatus;

      if (randomStatus === 'assigned' || randomStatus === 'in-progress') {
        mockSlotData.assignedTo = { _id: 'user1', name: 'John Doe' };
      }

      const calculatedStatus = calculateSlotStatus(mockSlotData);
      
      // Check if status changed
      if (status && status.status !== calculatedStatus.status && onStatusChange) {
        onStatusChange(calculatedStatus, status);
      }

      setStatus(calculatedStatus);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching slot status:', err);
      setError('Failed to load status');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const calculateSlotStatus = (slotData) => {
    if (!slotData) {
      return {
        status: 'unknown',
        message: 'Slot data not available',
        color: 'secondary',
        icon: FaExclamationTriangle,
        priority: 0
      };
    }

    // Check completion status
    if (slotData.assignmentStatus === 'completed' || slotData.completionStatus?.isCompleted) {
      return {
        status: 'completed',
        message: 'Slot completed',
        color: 'success',
        icon: FaCheckCircle,
        priority: 5
      };
    }

    // Check if blocked
    if (slotData.assignmentStatus === 'blocked') {
      return {
        status: 'blocked',
        message: 'Slot is blocked',
        color: 'danger',
        icon: FaLock,
        priority: 1
      };
    }

    // Check if cancelled
    if (slotData.assignmentStatus === 'cancelled') {
      return {
        status: 'cancelled',
        message: 'Slot cancelled',
        color: 'dark',
        icon: FaBan,
        priority: 0
      };
    }

    // Check dependencies
    if (slotData.dependencies && slotData.dependencies.length > 0) {
      // In a real implementation, you'd check if dependencies are completed
      const hasUnmetDependencies = Math.random() > 0.7; // Mock check
      if (hasUnmetDependencies) {
        return {
          status: 'dependencies',
          message: `Waiting for ${slotData.dependencies.length} dependency(ies)`,
          color: 'warning',
          icon: FaExclamationTriangle,
          priority: 2
        };
      }
    }

    // Check if overdue
    if (slotData.dueDate && new Date(slotData.dueDate) < new Date()) {
      return {
        status: 'overdue',
        message: 'Past due date',
        color: 'danger',
        icon: FaClock,
        priority: 1
      };
    }

    // Check assignment status
    if (slotData.assignmentStatus === 'in-progress') {
      return {
        status: 'in-progress',
        message: `In progress${slotData.assignedTo ? ` by ${slotData.assignedTo.name}` : ''}`,
        color: 'primary',
        icon: FaClock,
        priority: 4
      };
    }

    if (slotData.assignmentStatus === 'assigned') {
      return {
        status: 'assigned',
        message: `Assigned${slotData.assignedTo ? ` to ${slotData.assignedTo.name}` : ''}`,
        color: 'info',
        icon: FaUser,
        priority: 3
      };
    }

    // Available
    return {
      status: 'available',
      message: 'Available for assignment',
      color: 'success',
      icon: FaCheckCircle,
      priority: 4
    };
  };

  const renderTooltip = (props) => (
    <Tooltip id={`slot-status-tooltip-${slotId}`} {...props}>
      <div>
        <strong>Status:</strong> {status?.message}<br/>
        <strong>Last Updated:</strong> {lastUpdated.toLocaleTimeString()}<br/>
        {error && <span className="text-danger">Error: {error}</span>}
      </div>
    </Tooltip>
  );

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 12;
      case 'lg': return 20;
      default: return 16;
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'sm': return 'sm';
      case 'lg': return 'lg';
      default: return undefined;
    }
  };

  if (loading && !status) {
    return (
      <div className={`d-inline-flex align-items-center ${className}`}>
        <Spinner size="sm" className="me-1" />
        {showText && <span className="small text-muted">Loading...</span>}
      </div>
    );
  }

  if (error && !status) {
    return (
      <Badge bg="danger" className={className}>
        <FaExclamationTriangle className="me-1" />
        {showText && 'Error'}
      </Badge>
    );
  }

  if (!status) {
    return (
      <Badge bg="secondary" className={className}>
        <FaExclamationTriangle className="me-1" />
        {showText && 'Unknown'}
      </Badge>
    );
  }

  const StatusIcon = status.icon;
  const iconElement = showIcon && (
    <StatusIcon 
      size={getIconSize()} 
      className={variant === 'icon-only' ? '' : 'me-1'} 
    />
  );

  const textElement = showText && status.message;

  const content = (
    <>
      {iconElement}
      {textElement}
      {loading && (
        <Spinner size="sm" className="ms-1" />
      )}
    </>
  );

  const indicator = (() => {
    switch (variant) {
      case 'text':
        return (
          <span className={`text-${status.color} ${className}`}>
            {content}
          </span>
        );
      
      case 'icon-only':
        return (
          <span className={`text-${status.color} ${className}`}>
            {iconElement}
          </span>
        );
      
      case 'badge':
      default:
        return (
          <Badge bg={status.color} className={className} size={getBadgeSize()}>
            {content}
          </Badge>
        );
    }
  })();

  return (
    <OverlayTrigger
      placement="top"
      delay={{ show: 250, hide: 400 }}
      overlay={renderTooltip}
    >
      <span className="d-inline-block">
        {indicator}
      </span>
    </OverlayTrigger>
  );
};

export default SlotAvailabilityIndicator;