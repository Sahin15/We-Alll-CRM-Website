import { useState } from 'react';
import { Table, Badge, Button, Form } from 'react-bootstrap';
import { FaEye, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import BulkActionsToolbar from './BulkActionsToolbar';

/**
 * WorkItemListWithBulk Component
 * Work item list with checkbox selection for bulk operations
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
const WorkItemListWithBulk = ({ workItems, onViewItem, onBulkAction, emptyMessage }) => {
  const [selectedItems, setSelectedItems] = useState([]);

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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(workItems.map((item) => item._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleBulkAction = async (action, data) => {
    if (onBulkAction) {
      await onBulkAction(action, selectedItems, data);
      setSelectedItems([]);
    }
  };

  const allSelected = workItems.length > 0 && selectedItems.length === workItems.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < workItems.length;

  return (
    <div>
      {selectedItems.length > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedItems.length}
          onAction={handleBulkAction}
          onCancel={() => setSelectedItems([])}
        />
      )}

      <div className="table-responsive">
        <Table hover className="mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: '3%' }}>
                <Form.Check
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={{ width: '5%' }}>Type</th>
              <th style={{ width: '27%' }}>Title</th>
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
                <td colSpan="9" className="text-center py-4 text-muted">
                  {emptyMessage || 'No work items found'}
                </td>
              </tr>
            ) : (
              workItems.map((item) => (
                <tr 
                  key={item._id}
                  className={isOverdue(item) ? 'table-danger' : isDueToday(item) ? 'table-warning' : ''}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <Form.Check
                      type="checkbox"
                      checked={selectedItems.includes(item._id)}
                      onChange={() => handleSelectItem(item._id)}
                    />
                  </td>
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
                      onClick={() => onViewItem(item)}
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
    </div>
  );
};

export default WorkItemListWithBulk;
