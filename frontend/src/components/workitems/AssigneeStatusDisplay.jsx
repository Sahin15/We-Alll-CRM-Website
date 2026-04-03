import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaUsers } from 'react-icons/fa';

const AssigneeStatusDisplay = ({ workItem }) => {
  // Only show for multiple assignees
  if (!workItem.assignedToMultiple || workItem.assignedToMultiple.length <= 1) {
    return null;
  }

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
    };
    return colors[status] || 'secondary';
  };

  const getStatusCount = () => {
    const counts = {
      'To Do': 0,
      'In Progress': 0,
      'Review': 0,
      'Done': 0,
    };

    workItem.assignedToMultiple.forEach((assignee) => {
      const assigneeStatus = workItem.assigneeStatuses?.find(
        as => as.assigneeId?._id === assignee._id || as.assigneeId === assignee._id
      );
      const status = assigneeStatus?.status || workItem.status;
      counts[status]++;
    });

    return counts;
  };

  const statusCounts = getStatusCount();
  const totalAssignees = workItem.assignedToMultiple.length;

  // Create tooltip showing all assignees and their statuses
  const renderTooltip = (props) => (
    <Tooltip id="assignee-status-tooltip" {...props}>
      <div style={{ textAlign: 'left' }}>
        <strong>Assignee Status:</strong>
        {workItem.assignedToMultiple.map((assignee) => {
          const assigneeStatus = workItem.assigneeStatuses?.find(
            as => as.assigneeId?._id === assignee._id || as.assigneeId === assignee._id
          );
          const status = assigneeStatus?.status || workItem.status;
          return (
            <div key={assignee._id} style={{ marginTop: '4px' }}>
              <span>{assignee.name}: </span>
              <Badge bg={getStatusColor(status)} style={{ marginLeft: '4px' }}>
                {status}
              </Badge>
            </div>
          );
        })}
      </div>
    </Tooltip>
  );

  return (
    <OverlayTrigger placement="top" overlay={renderTooltip}>
      <div className="assignee-status-display">
        <div className="assignee-status-content">
          <FaUsers size={14} className="assignee-icon" />
          <span className="assignee-count">
            {statusCounts['Done']}/{totalAssignees}
          </span>
          <div className="assignee-badges">
            {statusCounts['Done'] > 0 && (
              <Badge bg="success" className="assignee-badge">
                {statusCounts['Done']}
              </Badge>
            )}
            {statusCounts['In Progress'] > 0 && (
              <Badge bg="primary" className="assignee-badge">
                {statusCounts['In Progress']}
              </Badge>
            )}
            {statusCounts['Review'] > 0 && (
              <Badge bg="warning" className="assignee-badge">
                {statusCounts['Review']}
              </Badge>
            )}
            {statusCounts['To Do'] > 0 && (
              <Badge bg="secondary" className="assignee-badge">
                {statusCounts['To Do']}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </OverlayTrigger>
  );
};

export default AssigneeStatusDisplay;
