import React from 'react';
import { Table, Badge, Button } from 'react-bootstrap';
import { FaEye, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';

const WorkItemList = ({ workItems, onViewItem, emptyMessage }) => {
  const onView = onViewItem; // Support both prop names for compatibility
  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
    };
    return colors[status] || 'secondary';
  };

  const isOverdue = (workItem) => {
    return workItem.dueDate && 
      new Date(workItem.dueDate) < new Date() && 
      workItem.status !== 'Done';
  };

  const isDueToday = (workItem) => {
    return workItem.dueDate && 
      new Date(workItem.dueDate).toDateString() === new Date().toDateString() &&
      workItem.status !== 'Done';
  };

  return (
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th style={{ width: '5%' }}>Type</th>
            <th style={{ width: '30%' }}>Title</th>
            <th style={{ width: '15%' }}>Project</th>
            <th style={{ width: '15%' }}>Assigned To</th>
            <th style={{ width: '12%' }}>Due Date</th>
            <th style={{ width: '10%' }}>Status</th>
            <th style={{ width: '8%' }}>Priority</th>
            <th style={{ width: '5%' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {workItems.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-4 text-muted">
                {emptyMessage || 'No work items found'}
              </td>
            </tr>
          ) : (
            workItems.map((item) => (
              <tr 
                key={item._id}
                className={isOverdue(item) ? 'table-danger' : isDueToday(item) ? 'table-warning' : ''}
                style={{ cursor: 'pointer' }}
                onClick={() => onView(item)}
              >
                <td>
                  <Badge bg={item.type === 'content' ? 'success' : 'primary'}>
                    {item.type === 'content' ? 'Content' : 'Task'}
                  </Badge>
                </td>
                <td>
                  <div className="fw-bold">{item.title}</div>
                  {item.type === 'content' && item.platform && (
                    <small className="text-muted">{item.platform} • {item.postType}</small>
                  )}
                </td>
                <td>{item.project?.name || 'N/A'}</td>
                <td>{item.assignedTo?.name || 'Unassigned'}</td>
                <td>
                  <div className={isDueToday(item) ? 'fw-bold text-warning' : isOverdue(item) ? 'fw-bold text-danger' : ''}>
                    <FaClock className="me-1" style={{ fontSize: '0.75rem' }} />
                    {formatDate(item.dueDate)}
                  </div>
                  {isDueToday(item) && (
                    <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>Due Today!</Badge>
                  )}
                  {isOverdue(item) && (
                    <Badge bg="danger" style={{ fontSize: '0.7rem' }}>
                      <FaExclamationTriangle className="me-1" style={{ fontSize: '0.65rem' }} />
                      Overdue
                    </Badge>
                  )}
                </td>
                <td>
                  <Badge bg={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </td>
                <td>
                  <Badge 
                    bg={
                      item.priority === 'urgent' ? 'danger' :
                      item.priority === 'high' ? 'warning' :
                      item.priority === 'medium' ? 'info' : 'secondary'
                    }
                    className="text-capitalize"
                  >
                    {item.priority}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(item);
                    }}
                  >
                    <FaEye />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default WorkItemList;
