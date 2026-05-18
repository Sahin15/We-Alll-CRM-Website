import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Modal, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import projectApi from '../../../api/projectApi';
import workItemApi from '../../../api/workItemApi';
import WorkItemDetailsModal from '../../workitems/WorkItemDetailsModal';

/**
 * KanbanTab - Dedicated Kanban board view for project work items
 */
const KanbanTab = ({ project, onRefresh }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workItems, setWorkItems] = useState([]);
  const [groupedWorkItems, setGroupedWorkItems] = useState({ slotted: {}, unassigned: [] });
  const [slots, setSlots] = useState([]);
  const [selectedSlotFilter, setSelectedSlotFilter] = useState('all'); // 'all', 'unassigned', or slotId
  const [draggedItem, setDraggedItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetItem, setCancelTargetItem] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const statuses = ['To Do', 'In Progress', 'Done', 'Cancelled'];
  const isSlotBased = project.slotConfiguration?.enableSlotSystem;

  useEffect(() => {
    loadData();
  }, [project._id]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (isSlotBased) {
        // Load slots and grouped work items
        const [slotsResponse, groupedResponse] = await Promise.all([
          projectApi.getProjectSlots(project._id),
          projectApi.getWorkItemsGroupedBySlots(project._id)
        ]);
        
        const loadedSlots = slotsResponse.data || [];
        const grouped = groupedResponse.data || { slotted: {}, unassigned: [] };
        
        setSlots(loadedSlots);
        setGroupedWorkItems(grouped);
        
        // Flatten all work items for Kanban display
        const allItems = [];
        Object.values(grouped.slotted || {}).forEach(group => {
          group.workItems.forEach(item => {
            allItems.push({ ...item, slotInfo: group.slot });
          });
        });
        (grouped.unassigned || []).forEach(item => {
          allItems.push({ ...item, slotInfo: null });
        });
        
        setWorkItems(allItems);
      } else {
        // Load regular work items
        const response = await workItemApi.getWorkItemsByProject(project._id);
        const items = response.data || response || [];
        setWorkItems(items);
      }
    } catch (error) {
      toast.error('Failed to load work items');
    } finally {
      setLoading(false);
    }
  };

  // Kanban board drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.status === newStatus) {
      setDraggedItem(null);
      return;
    }

    if (newStatus === 'Cancelled') {
      setCancelTargetItem(draggedItem);
      setCancellationReason('');
      setShowCancelModal(true);
      setDraggedItem(null);
      return;
    }

    try {
      await workItemApi.updateStatus(draggedItem._id, newStatus);
      toast.success('Status updated successfully!');
      loadData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setDraggedItem(null);
    }
  };

  const handleViewDetails = async (item) => {
    try {
      const response = await workItemApi.getWorkItemById(item._id);
      setSelectedWorkItem(response.data || response);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading work item details:', error);
      toast.error('Failed to load work item details');
    }
  };

  const handleUpdateStatus = async (itemId, newStatus, backDate = null, cancellationReason = null) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus, backDate, cancellationReason);
      toast.success('Status updated successfully!');
      loadData();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
      throw error;
    }
  };

  const handleConfirmCancellation = async () => {
    const trimmedReason = cancellationReason.trim();
    if (!cancelTargetItem || trimmedReason.length < 25) {
      return;
    }

    try {
      await workItemApi.updateStatus(cancelTargetItem._id, 'Cancelled', null, trimmedReason);
      toast.success('Work cancelled successfully!');
      setShowCancelModal(false);
      setCancelTargetItem(null);
      setCancellationReason('');
      loadData();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error cancelling work item:', error);
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to cancel work item');
    }
  };

  const handleAddComment = async (workItemId, commentText) => {
    try {
      const result = await workItemApi.addComment(workItemId, commentText);
      loadData();
      return result.data || result;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  // Group work items by status for Kanban view
  const getFilteredWorkItems = () => {
    if (!isSlotBased || selectedSlotFilter === 'all') {
      return workItems;
    }
    
    if (selectedSlotFilter === 'unassigned') {
      return workItems.filter(item => !item.slotInfo);
    }
    
    // Filter by specific slot
    return workItems.filter(item => item.slotInfo?._id === selectedSlotFilter);
  };

  const filteredWorkItems = getFilteredWorkItems();
  
  const groupedByStatus = statuses.reduce((acc, status) => {
    acc[status] = filteredWorkItems.filter((item) => item.status === status);
    return acc;
  }, {});

  const getStatusBadge = (status) => {
    const variants = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
      'available': 'secondary',
      'assigned': 'primary',
      'in-progress': 'warning',
      'completed': 'success',
      'Cancelled': 'danger'
    };
    return variants[status] || 'secondary';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'danger',
      high: 'warning',
      medium: 'info',
      low: 'secondary'
    };
    return colors[priority] || 'secondary';
  };

  const canManageWork = ['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) ||
    user?._id === project.projectHead?._id ||
    project.assignedUsers?.some(u => (u._id || u) === user?._id);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Info Banner */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card.Body className="text-white p-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="me-3" style={{ fontSize: '2rem' }}>📋</div>
              <div>
                <h6 className="mb-1" style={{ fontWeight: '600' }}>Kanban Board</h6>
                <small style={{ opacity: 0.9 }}>
                  Drag and drop work items between columns to update their status.
                  {workItems.length > 0 && ` Managing ${workItems.length} work items across 4 stages.`}
                </small>
              </div>
            </div>
            
            {/* Slot Filter - Only show if project has slots */}
            {isSlotBased && slots.length > 0 && (
              <div style={{ minWidth: '200px' }}>
                <select
                  className="form-select form-select-sm"
                  value={selectedSlotFilter}
                  onChange={(e) => setSelectedSlotFilter(e.target.value)}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                >
                  <option value="all" style={{ color: 'black' }}>All Slots</option>
                  <option value="unassigned" style={{ color: 'black' }}>Unassigned</option>
                  {slots
                    .sort((a, b) => a.slotNumber - b.slotNumber)
                    .map(slot => (
                      <option key={slot._id} value={slot._id} style={{ color: 'black' }}>
                        Slot {slot.slotNumber}{slot.title ? ` - ${slot.title}` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* KANBAN BOARD */}
      <Row className="g-3">
        {statuses.map((status) => {
          // Get items for this column
          const columnItems = groupedByStatus[status] || [];

          return (
            <Col key={status} lg={3} md={6}>
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                style={{ 
                  height: '600px',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.075)'
                }}
              >
                <div 
                  className={`bg-${getStatusBadge(status)} text-white`}
                  style={{
                    padding: '0.75rem 1rem',
                    borderTopLeftRadius: '0.375rem',
                    borderTopRightRadius: '0.375rem'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>{status}</strong>
                    <Badge bg="light" text="dark">
                      {columnItems.length}
                    </Badge>
                  </div>
                </div>
                <div 
                  className="p-2" 
                  style={{ 
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    flex: 1,
                    minHeight: 0
                  }}
                >
                  {columnItems.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      <small>No items</small>
                    </div>
                  ) : (
                    columnItems.map((item) => (
                      <Card
                        key={item._id}
                        className="mb-2 shadow-sm"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, item)}
                        style={{
                          cursor: 'grab',
                          opacity: draggedItem?._id === item._id ? 0.5 : 1,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        <Card.Body className="p-2">
                          {/* Slot Badge - Only show if project has slots and item has slot assignment */}
                          {isSlotBased && item.slotInfo && (
                            <Badge
                              bg="info"
                              className="mb-2 me-1"
                              style={{ fontSize: '0.7rem' }}
                            >
                              📦 Slot {item.slotInfo.slotNumber}
                            </Badge>
                          )}

                          {/* Visibility Badge */}
                          {item.visibility === 'draft' && (
                            <Badge
                              bg="secondary"
                              className="mb-2 me-1"
                              style={{ fontSize: '0.7rem' }}
                            >
                              📝 Draft
                            </Badge>
                          )}
                          {item.visibility === 'scheduled' && (
                            <Badge
                              bg="warning"
                              className="mb-2 me-1"
                              style={{ fontSize: '0.7rem' }}
                            >
                              ⏰ Scheduled
                            </Badge>
                          )}
                          {(!item.visibility || item.visibility === 'active') && (
                            <Badge
                              bg="success"
                              className="mb-2 me-1"
                              style={{ fontSize: '0.7rem' }}
                            >
                              ✓ Active
                            </Badge>
                          )}

                          {/* Priority Badge */}
                          <Badge
                            bg={getPriorityColor(item.priority)}
                            className="mb-2"
                            style={{ fontSize: '0.7rem' }}
                          >
                            {item.priority?.charAt(0).toUpperCase() + item.priority?.slice(1) || 'Medium'}
                          </Badge>

                          {/* Title - Clickable */}
                          <div 
                            className="fw-bold mb-1" 
                            style={{ 
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s ease'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(item);
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                            onMouseLeave={(e) => e.target.style.opacity = '1'}
                          >
                            {item.title || 'Untitled'}
                          </div>

                          {/* Description */}
                          {item.description && (
                            <div className="mb-2">
                              <small className="text-muted">
                                {item.description.length > 60 
                                  ? `${item.description.substring(0, 60)}...` 
                                  : item.description}
                              </small>
                            </div>
                          )}

                          {/* Assignee */}
                          {item.assignedTo && (
                            <div className="mt-2 d-flex align-items-center">
                              <small className="text-muted">
                                👤 {item.assignedTo.name}
                              </small>
                            </div>
                          )}

                          {/* Due Date */}
                          {item.dueDate && (
                            <div className="mt-1 d-flex align-items-center">
                              <small className="text-muted">
                                📅 {new Date(item.dueDate).toLocaleDateString()}
                              </small>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Work Item Details Modal */}
      {selectedWorkItem && (
        <WorkItemDetailsModal
          show={showDetailsModal}
          onHide={() => {
            setShowDetailsModal(false);
            setSelectedWorkItem(null);
          }}
          workItem={selectedWorkItem}
          onUpdate={handleUpdateStatus}
          onRefresh={loadData}
          onAddComment={handleAddComment}
          currentUser={user}
          onEdit={() => {
            // For now, just close the modal
            // Edit functionality can be added later if needed
            setShowDetailsModal(false);
          }}
        />
      )}

      <Modal
        show={showCancelModal}
        onHide={() => {
          setShowCancelModal(false);
          setCancelTargetItem(null);
          setCancellationReason('');
        }}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title style={{ fontSize: '1.1rem' }}>Confirm Work Cancellation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            Are you sure you want to cancel <strong>{cancelTargetItem?.title}</strong>?
            This requires a reason and cannot be changed back later.
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
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowCancelModal(false);
              setCancelTargetItem(null);
              setCancellationReason('');
            }}
          >
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

export default KanbanTab;
