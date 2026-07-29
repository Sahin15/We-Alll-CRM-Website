import { useState } from 'react';
import { Table, Badge, Button, Form } from 'react-bootstrap';
import { FaEye, FaClock, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import {
  getDueDateLabel,
  getEffectiveStatusForUser,
  isWorkItemDueToday,
  isWorkItemOverdue,
} from '../../utils/workItemUtils';
import BulkActionsToolbar from './BulkActionsToolbar';
import './WorkItemList.css';

/**
 * WorkItemListWithBulk Component
 * Work item list with checkbox selection for bulk operations
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
const WorkItemListWithBulk = ({ workItems, onViewItem, onBulkAction, emptyMessage, currentUser }) => {
  const [selectedItems, setSelectedItems] = useState([]);

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

  const getPriorityColor = (priority) => {
    const colors = {
      'urgent': 'danger',
      'high': 'warning',
      'medium': 'info',
      'low': 'secondary'
    };
    return colors[priority] || 'secondary';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent') return '🔴';
    if (priority === 'high') return '🟠';
    if (priority === 'medium') return '🔵';
    return '⚪';
  };

  const getUserStatus = (workItem) =>
    getEffectiveStatusForUser(workItem, currentUser?._id);

  const isOverdue = (workItem) =>
    isWorkItemOverdue(workItem, currentUser?._id);

  const isDueToday = (workItem) =>
    isWorkItemDueToday(workItem, currentUser?._id);

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
        <Table hover className="mb-0 work-items-table">
          <thead className="table-light">
            <tr>
              <th style={{ width: '4%' }}>
                <Form.Check
                  type="checkbox"
                  className="bulk-selection-checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={{ width: '42%' }}>Work Item</th>
              <th style={{ width: '20%' }}>Due Date</th>
              <th style={{ width: '15%' }}>Status</th>
              <th style={{ width: '12%' }}>Priority</th>
              <th style={{ width: '7%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  <div className="d-flex flex-column align-items-center">
                    <FaCalendarAlt className="empty-state-icon" />
                    <h5 className="empty-state-title">{emptyMessage || 'No work items found'}</h5>
                    <p className="empty-state-subtitle">Create your first work item to get started!</p>
                  </div>
                </td>
              </tr>
            ) : (
              workItems.map((item) => {
                const dueLabel = getDueDateLabel(item, currentUser?._id);
                
                return (
                  <tr 
                    key={item._id}
                    className={`work-item-row ${isOverdue(item) ? 'table-danger' : isDueToday(item) ? 'table-warning' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewItem(item)}
                  >
                    {/* Checkbox Column */}
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      <Form.Check
                        type="checkbox"
                        className="bulk-selection-checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={() => handleSelectItem(item._id)}
                      />
                    </td>

                    {/* Work Item Column - Combined Type, Title, and Project */}
                    <td className="py-3">
                      <div className="work-item-content">
                        <div className="work-item-badge-container">
                          <Badge 
                            bg={item.type === 'content' ? 'success' : 'primary'} 
                            className="work-item-type-badge"
                          >
                            {item.type === 'content' ? '📱 Content' : '📋 Task'}
                          </Badge>
                        </div>
                        <div className="work-item-info-container">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <div className="work-item-title">
                              {item.title}
                            </div>
                            {item.slotAssignment?.slotNumber && (
                              <Badge bg="info" className="small">
                                Slot {item.slotAssignment.slotNumber}
                              </Badge>
                            )}
                          </div>
                          <div className="work-item-details">
                            {item.project?.name && (
                              <span className="work-item-detail">
                                📁 {item.project.name}
                              </span>
                            )}
                            {item.type === 'content' && item.platform && (
                              <span className="work-item-detail">
                                📱 {item.platform} • {item.postType}
                              </span>
                            )}
                            {item.assignedTo?.name && (
                              <span className="work-item-detail">
                                👤 {item.assignedTo.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Due Date Column - Enhanced with urgency indicators */}
                    <td className="py-3">
                      <div className="due-date-container">
                        <FaClock 
                          className={`${isOverdue(item) ? 'text-danger' : isDueToday(item) ? 'text-warning' : 'text-muted'}`}
                          style={{ fontSize: '0.85rem' }}
                        />
                        <div>
                          <div className={`due-date-text ${isOverdue(item) ? 'text-danger' : isDueToday(item) ? 'text-warning' : ''}`}>
                            {formatDate(item.dueDate)}
                          </div>
                          <p className={`due-date-subtitle text-${dueLabel?.tone || 'muted'}`}>
                            {dueLabel?.overdue ? (
                              <>
                                <FaExclamationTriangle className="me-1" />
                                {dueLabel.text}
                              </>
                            ) : (
                              dueLabel?.text
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status Column - Clean badge design */}
                    <td className="py-3">
                      <Badge 
                        bg={getStatusColor(getUserStatus(item))} 
                        className="work-item-status-badge"
                      >
                        {getUserStatus(item)}
                      </Badge>
                    </td>

                    {/* Priority Column - Visual priority indicators */}
                    <td className="py-3">
                      <div className="d-flex align-items-center">
                        <span className="priority-icon">
                          {getPriorityIcon(item.priority)}
                        </span>
                        <Badge 
                          bg={getPriorityColor(item.priority)}
                          className="work-item-priority-badge text-capitalize"
                        >
                          {item.priority}
                        </Badge>
                      </div>
                    </td>

                    {/* Actions Column - Larger, more accessible button */}
                    <td className="py-3">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="work-item-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewItem(item);
                        }}
                        title="View details"
                      >
                        <FaEye className="me-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>
      

    </div>
  );
};

export default WorkItemListWithBulk;
