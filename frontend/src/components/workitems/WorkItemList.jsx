import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Table, Badge, Button, Dropdown, Modal, Form } from 'react-bootstrap';
import { FaEye, FaClock, FaExclamationTriangle, FaCalendarAlt, FaCheckCircle, FaEdit } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import {
  getEffectiveStatusForUser,
  getDueDateLabel,
  isWorkItemDueToday,
  isWorkItemOverdue,
} from '../../utils/workItemUtils';
import AssigneeStatusDisplay from './AssigneeStatusDisplay';
import './WorkItemList.css';

const STATUS_MENU_GAP = 8;
const STATUS_MENU_ITEM_HEIGHT = 52;
const STATUS_MENU_ITEM_COUNT = 4;

const StatusSelector = ({ status, onStatusChange, getStatusColor }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);

  const computeMenuPosition = useCallback((triggerEl, menuEl) => {
    const rect = triggerEl.getBoundingClientRect();
    const menuHeight = menuEl?.getBoundingClientRect().height
      ?? STATUS_MENU_ITEM_COUNT * STATUS_MENU_ITEM_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom - STATUS_MENU_GAP;
    const spaceAbove = rect.top - STATUS_MENU_GAP;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    let top = openUp
      ? rect.top - menuHeight - STATUS_MENU_GAP
      : rect.bottom + STATUS_MENU_GAP;

    top = Math.max(
      STATUS_MENU_GAP,
      Math.min(top, window.innerHeight - menuHeight - STATUS_MENU_GAP)
    );

    return {
      top,
      left: rect.left,
      width: Math.max(rect.width, 140),
      openUp,
    };
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!wrapperRef.current) return;
    setMenuPosition(computeMenuPosition(wrapperRef.current, menuRef.current));
  }, [computeMenuPosition]);

  // Close menu when clicking outside; reposition on scroll/resize
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (
        wrapperRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setShowMenu(false);
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [showMenu, updateMenuPosition]);

  useLayoutEffect(() => {
    if (showMenu) {
      updateMenuPosition();
    }
  }, [showMenu, updateMenuPosition]);
  
  // Cancelled is a terminal state — cannot change from it
  if (status === 'Cancelled') {
    return (
      <span className="status-badge-cancelled">
        🚫 Cancelled
      </span>
    );
  }

  const statuses = ['To Do', 'In Progress', 'Done', 'Cancelled'];
  const statusEmojis = {
    'To Do': '📋',
    'In Progress': '⚙️',
    'Done': '✅',
    'Cancelled': '🚫',
  };

  const handleSelectStatus = (newStatus) => {
    if (newStatus === status) {
      setShowMenu(false);
      return;
    }

    if (newStatus === 'Cancelled') {
      setShowMenu(false);
      setCancellationReason('');
      setShowCancelModal(true);
      return;
    }

    onStatusChange(newStatus);
    setShowMenu(false);
  };

  const handleConfirmCancellation = () => {
    const trimmedReason = cancellationReason.trim();
    if (trimmedReason.length < 25) {
      return;
    }

    onStatusChange('Cancelled', trimmedReason);
    setCancellationReason('');
    setShowCancelModal(false);
  };

  const handleToggleMenu = (event) => {
    event.stopPropagation();
    if (showMenu) {
      setShowMenu(false);
      setMenuPosition(null);
      return;
    }
    if (wrapperRef.current) {
      setMenuPosition(computeMenuPosition(wrapperRef.current, null));
    }
    setShowMenu(true);
  };

  const menuPortal = showMenu && menuPosition
    ? createPortal(
        <div
          ref={menuRef}
          className={`status-selector-menu status-selector-menu-portal${menuPosition.openUp ? ' opens-up' : ''}`}
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            zIndex: 10500,
          }}
        >
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-menu-item ${s === status ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                handleSelectStatus(s);
              }}
            >
              <span className="menu-emoji">{statusEmojis[s] || 'Cancel'}</span>
              <span className="menu-text">{s}</span>
              {s === status && <span className="menu-check">✓</span>}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`status-selector-wrapper${showMenu ? ' is-open' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className={`status-selector-btn status-${status.toLowerCase().replace(' ', '-')}`}
        onClick={handleToggleMenu}
      >
        <span className="status-emoji">{statusEmojis[status]}</span>
        <span className="status-text">{status}</span>
        <span className="status-arrow">▼</span>
      </button>

      {menuPortal}

      <Modal
        show={showCancelModal}
        onHide={() => setShowCancelModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title style={{ fontSize: '1.1rem' }}>Confirm Work Cancellation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            Please confirm this work should be cancelled and provide a reason.
          </p>
          <Form.Group>
            <Form.Label className="fw-semibold">Cancellation Reason</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Explain why this work is being cancelled..."
              isInvalid={cancellationReason.trim().length > 0 && cancellationReason.trim().length < 25}
            />
            <Form.Control.Feedback type="invalid">
              Please enter at least 25 characters.
            </Form.Control.Feedback>
            <div className="text-end mt-1">
              <small className={cancellationReason.trim().length < 25 ? 'text-danger' : 'text-success'}>
                {cancellationReason.trim().length}/25 characters
              </small>
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowCancelModal(false)}>
            Go Back
          </Button>
          <Button
            variant="danger"
            disabled={cancellationReason.trim().length < 25}
            onClick={handleConfirmCancellation}
          >
            Confirm Cancellation
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

const WorkItemList = React.memo(({ workItems, onViewItem, onStatusChange, currentUser, emptyMessage, showAssigneeStatus = false, onEdit }) => {
  const onView = onViewItem;
  
  const getUserStatus = (workItem) =>
    getEffectiveStatusForUser(workItem, currentUser?._id);
  const canEdit = (workItem) => {
    return workItem.assignedTo?._id === currentUser?._id || 
           ['admin', 'superadmin', 'hr', 'manager', 'hod'].includes(currentUser?.role);
  };

  // Helper function to check if user can edit a work item
  const canEditWorkItem = (workItem) => {
    const userId = currentUser?._id?.toString();
    const isCreator = workItem.createdBy?._id?.toString() === userId;
    const isAssigned = workItem.assignedTo?._id?.toString() === userId;
    const isAssignedMultiple = workItem.assignedToMultiple?.some(id => (id._id || id).toString() === userId);
    const isAdmin = ['admin', 'superadmin', 'hod', 'manager'].includes(currentUser?.role);
    
    return isCreator || isAssigned || isAssignedMultiple || isAdmin;
  };
  
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

  const isOverdue = (workItem) =>
    isWorkItemOverdue(workItem, currentUser?._id);

  const isDueToday = (workItem) =>
    isWorkItemDueToday(workItem, currentUser?._id);

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
            <th style={{ width: '35%' }}>WORK ITEM</th>
            <th style={{ width: '8%' }}>SLOT</th>
            <th style={{ width: '15%' }}>DUE DATE</th>
            <th style={{ width: '20%' }}>STATUS</th>
            <th style={{ width: '12%' }}>PRIORITY</th>
            <th style={{ width: '10%' }}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {workItems.map((item) => {
            const dueLabel = getDueDateLabel(item, currentUser?._id);
            const overdueStatus = isOverdue(item);
            const dueTodayStatus = isDueToday(item);
            const isCancelled = getUserStatus(item) === 'Cancelled';
            
            return (
              <tr 
                key={item._id}
                className={`modern-row ${isCancelled ? 'row-cancelled' : overdueStatus ? 'row-overdue' : dueTodayStatus ? 'row-due-today' : ''}`}
                onClick={() => onView(item)}
              >
                {/* Work Item Column */}
                <td>
                  <div className="work-item-cell">
                    <Badge 
                      bg={item.type === 'content' ? 'success' : 'primary'} 
                      className="type-badge"
                      style={isCancelled ? { opacity: 0.5 } : {}}
                    >
                      {item.type === 'content' ? '📱' : '📋'}
                    </Badge>
                    <div className="work-info">
                      <div className="d-flex align-items-center gap-2">
                        <div className={`work-title${isCancelled ? ' work-title-cancelled' : ''}`}>{item.title}</div>
                        {isCancelled && (
                          <Badge bg="danger" style={{ fontSize: '0.7rem', padding: '2px 6px', flexShrink: 0 }}>
                            🚫 Cancelled
                          </Badge>
                        )}
                        {item.isEdited && !isCancelled && (
                          <Badge bg="warning" style={{ fontSize: '0.7rem', padding: '2px 6px' }} title="This work item has been edited">
                            ✏️ Edited
                          </Badge>
                        )}
                      </div>
                      {isCancelled && item.cancellationReason && (
                        <div className="cancelled-reason-preview">
                          <span className="cancelled-reason-label">Reason:</span> {item.cancellationReason}
                        </div>
                      )}
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

                {/* Slot Column */}
                <td>
                  <div className="slot-cell">
                    {item.slotAssignment?.slotNumber ? (
                      <Badge bg="info" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                        {item.slotAssignment.slotNumber}
                      </Badge>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>—</span>
                    )}
                  </div>
                </td>

                {/* Due Date Column */}
                <td>
                  <div className="due-date-cell">
                    <div className={`date-value ${isCancelled ? 'text-muted' : overdueStatus ? 'text-danger' : dueTodayStatus ? 'text-warning' : ''}`}>
                      <FaClock className="date-icon" />
                      {formatDate(item.dueDate)}
                    </div>
                    {!isCancelled && dueLabel && (
                      <div className={`date-status text-${dueLabel.tone}`}>
                        {dueLabel.overdue ? (
                          <>
                            <FaExclamationTriangle className="me-1" />
                            {dueLabel.text}
                          </>
                        ) : (
                          dueLabel.text
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* Status Column */}
                <td className="status-cell" onClick={(e) => e.stopPropagation()}>
                  {showAssigneeStatus && item.assignedToMultiple && item.assignedToMultiple.length > 1 ? (
                    <AssigneeStatusDisplay workItem={item} />
                  ) : canEdit(item) && onStatusChange ? (
                    <StatusSelector
                      status={getUserStatus(item)}
                      onStatusChange={(newStatus, cancellationReason) => onStatusChange(item._id, newStatus, null, cancellationReason)}
                      getStatusColor={getStatusColor}
                    />
                  ) : (
                    <Badge 
                      bg={getStatusColor(getUserStatus(item))} 
                      className="status-badge"
                    >
                      {getUserStatus(item)}
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
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-info"
                      size="sm"
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(item);
                      }}
                      title="View details and activity"
                    >
                      <FaEye style={{ fontSize: '0.9rem' }} />
                    </Button>
                    {canEditWorkItem(item) && onEdit && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        title="Edit work item"
                      >
                        <FaEdit style={{ fontSize: '0.9rem' }} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
});

WorkItemList.displayName = 'WorkItemList';

export default WorkItemList;
