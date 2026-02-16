import { Table, Badge, Button, Dropdown } from 'react-bootstrap';
import { FaEye, FaClock, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import './WorkItemList.css';

const WorkItemList = ({ workItems, onViewItem, onStatusChange, currentUser, emptyMessage }) => {
  const onView = onViewItem; // Support both prop names for compatibility
  
  const canEdit = (workItem) => {
    return workItem.assignedTo?._id === currentUser?._id || 
           ['admin', 'superadmin', 'hod'].includes(currentUser?.role);
  };
  
  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
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

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="table-responsive">
      <Table hover className="mb-0 work-items-table">
        <thead className="table-light">
          <tr>
            <th style={{ width: '45%' }}>Work Item</th>
            <th style={{ width: '20%' }}>Due Date</th>
            <th style={{ width: '15%' }}>Status</th>
            <th style={{ width: '12%' }}>Priority</th>
            <th style={{ width: '8%' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {workItems.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-state">
                <div className="d-flex flex-column align-items-center">
                  <FaCalendarAlt className="empty-state-icon" />
                  <h5 className="empty-state-title">{emptyMessage || 'No work items found'}</h5>
                  <p className="empty-state-subtitle">Create your first work item to get started!</p>
                </div>
              </td>
            </tr>
          ) : (
            workItems.map((item) => {
              const daysUntilDue = getDaysUntilDue(item.dueDate);
              
              return (
                <tr 
                  key={item._id}
                  className={`work-item-row ${isOverdue(item) ? 'table-danger' : isDueToday(item) ? 'table-warning' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onView(item)}
                >
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
                        <div className="work-item-title">
                          {item.title}
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
                        <p className={`due-date-subtitle ${isOverdue(item) ? 'text-danger' : isDueToday(item) ? 'text-warning' : 'text-muted'}`}>
                          {isOverdue(item) ? (
                            <>
                              <FaExclamationTriangle className="me-1" />
                              {Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue
                            </>
                          ) : isDueToday(item) ? (
                            'Due today!'
                          ) : daysUntilDue === 1 ? (
                            'Due tomorrow'
                          ) : daysUntilDue > 0 ? (
                            `${daysUntilDue} days left`
                          ) : (
                            'Past due'
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status Column - Interactive status change */}
                  <td className="py-3">
                    {canEdit(item) && onStatusChange ? (
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          as={Badge}
                          bg={getStatusColor(item.status)}
                          className="status-table-dropdown"
                          style={{
                            cursor: 'pointer',
                            border: 'none',
                            fontSize: '0.75rem',
                            padding: '6px 10px',
                            minWidth: '80px',
                            textAlign: 'center'
                          }}
                        >
                          {item.status} ▼
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="status-table-dropdown-menu">
                          {['To Do', 'In Progress', 'Review', 'Done'].map((status) => (
                            <Dropdown.Item
                              key={status}
                              onClick={() => onStatusChange(item._id, status, item.type)}
                              disabled={status === item.status}
                              className={`status-table-dropdown-item ${status === item.status ? 'active' : ''}`}
                            >
                              <Badge 
                                bg={getStatusColor(status)} 
                                className="me-2"
                                style={{ fontSize: '0.7rem', minWidth: '60px', textAlign: 'center' }}
                              >
                                {status}
                              </Badge>
                              {status === item.status && <span className="text-success">✓</span>}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    ) : (
                      <Badge 
                        bg={getStatusColor(item.status)} 
                        className="work-item-status-badge"
                      >
                        {item.status}
                      </Badge>
                    )}
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
                        onView(item);
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
  );
};

export default WorkItemList;
