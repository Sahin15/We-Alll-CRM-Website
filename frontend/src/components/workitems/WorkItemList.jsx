import { Table, Badge, Button, Dropdown } from 'react-bootstrap';
import { FaEye, FaClock, FaExclamationTriangle, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import './WorkItemList.css';

const WorkItemList = ({ workItems, onViewItem, onStatusChange, currentUser, emptyMessage }) => {
  const onView = onViewItem;
  
  const canEdit = (workItem) => {
    return workItem.assignedTo?._id === currentUser?._id || 
           ['admin', 'superadmin', 'hr', 'manager', 'hod'].includes(currentUser?.role);
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

  if (workItems.length === 0) {
    return (
      <div className="empty-state-modern">
        <FaCalendarAlt className="empty-icon" />
        <h5 className="empty-title">{emptyMessage || 'No work items found'}</h5>
        <p className="empty-subtitle">Create your first work item to get started!</p>
      </div>
    );
  }

  return (
    <div className="modern-table-container">
      <Table hover className="modern-work-table">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>WORK ITEM</th>
            <th style={{ width: '20%' }}>DUE DATE</th>
            <th style={{ width: '15%' }}>STATUS</th>
            <th style={{ width: '15%' }}>PRIORITY</th>
            <th style={{ width: '10%' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {workItems.map((item) => {
            const daysUntilDue = getDaysUntilDue(item.dueDate);
            const overdueStatus = isOverdue(item);
            const dueTodayStatus = isDueToday(item);
            
            return (
              <tr 
                key={item._id}
                className={`modern-row ${overdueStatus ? 'row-overdue' : dueTodayStatus ? 'row-due-today' : ''}`}
                onClick={() => onView(item)}
              >
                {/* Work Item Column */}
                <td>
                  <div className="work-item-cell">
                    <Badge 
                      bg={item.type === 'content' ? 'success' : 'primary'} 
                      className="type-badge"
                    >
                      {item.type === 'content' ? '📱' : '📋'}
                    </Badge>
                    <div className="work-info">
                      <div className="work-title">{item.title}</div>
                      <div className="work-meta">
                        {item.project?.name && (
                          <span className="meta-tag">
                            <span className="meta-dot">•</span>
                            {item.project.name}
                          </span>
                        )}
                        {item.assignedTo?.name && (
                          <span className="meta-tag">
                            <span className="meta-dot">•</span>
                            {item.assignedTo.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Due Date Column */}
                <td>
                  <div className="due-date-cell">
                    <div className={`date-value ${overdueStatus ? 'text-danger' : dueTodayStatus ? 'text-warning' : ''}`}>
                      <FaClock className="date-icon" />
                      {formatDate(item.dueDate)}
                    </div>
                    <div className={`date-status ${overdueStatus ? 'text-danger' : dueTodayStatus ? 'text-warning' : 'text-muted'}`}>
                      {overdueStatus ? (
                        <>
                          <FaExclamationTriangle className="me-1" />
                          {Math.abs(daysUntilDue)}d overdue
                        </>
                      ) : dueTodayStatus ? (
                        'Due today!'
                      ) : daysUntilDue === 1 ? (
                        'Tomorrow'
                      ) : daysUntilDue > 0 ? (
                        `${daysUntilDue}d left`
                      ) : (
                        'Past due'
                      )}
                    </div>
                  </div>
                </td>

                {/* Status Column */}
                <td onClick={(e) => e.stopPropagation()}>
                  {canEdit(item) && onStatusChange ? (
                    <Dropdown align="end">
                      <Dropdown.Toggle
                        as={Badge}
                        bg={getStatusColor(item.status)}
                        className="status-badge-dropdown"
                        style={{ userSelect: 'none' }}
                      >
                        {item.status} ▼
                      </Dropdown.Toggle>

                      <Dropdown.Menu className="status-dropdown-modern">
                        {['To Do', 'In Progress', 'Review', 'Done'].map((status) => (
                          <Dropdown.Item
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (status !== item.status) {
                                onStatusChange(item._id, status, item.type);
                              }
                            }}
                            disabled={status === item.status}
                            className={status === item.status ? 'active' : ''}
                          >
                            <Badge 
                              bg={getStatusColor(status)} 
                              className="me-2"
                              style={{ minWidth: '90px' }}
                            >
                              {status}
                            </Badge>
                            {status === item.status && <FaCheckCircle className="text-success" />}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  ) : (
                    <Badge 
                      bg={getStatusColor(item.status)} 
                      className="status-badge"
                    >
                      {item.status}
                    </Badge>
                  )}
                </td>

                {/* Priority Column */}
                <td>
                  <div className="priority-cell">
                    <span className="priority-icon">{getPriorityIcon(item.priority)}</span>
                    <Badge 
                      bg={getPriorityColor(item.priority)}
                      className="priority-badge text-capitalize"
                    >
                      {item.priority}
                    </Badge>
                  </div>
                </td>

                {/* Actions Column */}
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(item);
                    }}
                  >
                    <FaEye className="me-1" />
                    View
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default WorkItemList;
