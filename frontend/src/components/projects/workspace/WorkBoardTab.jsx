import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Form, Dropdown } from 'react-bootstrap';
import { FaFilter, FaUser, FaTasks, FaCalendar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import projectApi from '../../../api/projectApi';
import workItemApi from '../../../api/workItemApi';
import WorkItemDetailsModal from '../../workitems/WorkItemDetailsModal';
import { useAuth } from '../../../context/AuthContext';

/**
 * WorkBoardTab Component
 * Kanban board with 4 columns for work item status management
 * Requirements: 4.2
 */
const WorkBoardTab = ({ project, onRefresh }) => {
  const { user } = useAuth();
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    assignee: 'all',
    type: 'all',
    priority: 'all'
  });
  const [draggedItem, setDraggedItem] = useState(null);

  const statuses = ['To Do', 'In Progress', 'Done'];

  useEffect(() => {
    loadWorkItems();
  }, [project._id]);

  const loadWorkItems = async () => {
    try {
      setLoading(true);
      // Use the correct endpoint to get all work items for this project
      const response = await projectApi.getWorkBoard(project._id);
      
      // The response has structure: { data: { board, counts } }
      // We need to flatten the board object into an array
      if (response.data?.board) {
        const allItems = [
          ...(response.data.board['To Do'] || []),
          ...(response.data.board['In Progress'] || []),
          ...(response.data.board['Review'] || []),
          ...(response.data.board['Done'] || [])
        ];
        setWorkItems(allItems);
      } else {
        setWorkItems([]);
      }
    } catch (error) {
      console.error('Error loading work items:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load work items');
      setWorkItems([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Filter work items
  const filteredItems = workItems.filter((item) => {
    if (filters.assignee !== 'all' && item.assignedTo?._id !== filters.assignee) {
      return false;
    }
    if (filters.type !== 'all' && item.type !== filters.type) {
      return false;
    }
    if (filters.priority !== 'all' && item.priority !== filters.priority) {
      return false;
    }
    return true;
  });

  // Group by status
  const groupedItems = statuses.reduce((acc, status) => {
    acc[status] = filteredItems.filter((item) => item.status === status);
    return acc;
  }, {});

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

    try {
      await workItemApi.updateStatus(draggedItem._id, newStatus);
      toast.success('Status updated successfully!');
      loadWorkItems();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setDraggedItem(null);
    }
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus);
      toast.success('Status updated successfully!');
      loadWorkItems();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      throw error;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      Review: 'warning',
      Done: 'success'
    };
    return colors[status] || 'secondary';
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

  const uniqueAssignees = [...new Set(workItems.map((item) => item.assignedTo?._id))].filter(Boolean);

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
      {/* Work Board Info Banner */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card.Body className="text-white p-3">
          <div className="d-flex align-items-center">
            <div className="me-3" style={{ fontSize: '2rem' }}>📋</div>
            <div>
              <h6 className="mb-1" style={{ fontWeight: '600' }}>Kanban Work Board</h6>
              <small style={{ opacity: 0.9 }}>
                Drag and drop work items between columns to update their status. Click on any card to view details or edit.
                {workItems.length > 0 && ` Managing ${workItems.length} work items across 4 stages.`}
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Filters */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <Card.Body>
          <Row className="g-3 align-items-center">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small text-muted mb-1">
                  <FaUser className="me-1" />
                  Assignee
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={filters.assignee}
                  onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                >
                  <option value="all">All Assignees</option>
                  {project.teamMembers?.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small text-muted mb-1">
                  <FaTasks className="me-1" />
                  Type
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <option value="all">All Types</option>
                  <option value="task">Tasks</option>
                  <option value="content">Content</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small text-muted mb-1">
                  <FaFilter className="me-1" />
                  Priority
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setFilters({ assignee: 'all', type: 'all', priority: 'all' })}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Kanban Board */}
      <Row className="g-3">
        {statuses.map((status) => (
          <Col key={status} lg={3} md={6}>
            <Card
              className="h-100"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
              style={{ minHeight: '500px' }}
            >
              <Card.Header className={`bg-${getStatusColor(status)} text-white`}>
                <div className="d-flex justify-content-between align-items-center">
                  <strong>{status}</strong>
                  <Badge bg="light" text="dark">
                    {groupedItems[status]?.length || 0}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-2" style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                {groupedItems[status]?.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <small>No items</small>
                  </div>
                ) : (
                  groupedItems[status]?.map((item) => (
                    <Card
                      key={item._id}
                      className="mb-2 shadow-sm"
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      style={{
                        cursor: 'grab',
                        opacity: draggedItem?._id === item._id ? 0.5 : 1
                      }}
                      onClick={() => handleViewItem(item)}
                    >
                      <Card.Body className="p-2">
                        {/* Type Badge */}
                        <Badge
                          bg={item.type === 'content' ? 'success' : 'primary'}
                          className="mb-2"
                          style={{ fontSize: '0.7rem' }}
                        >
                          {item.type === 'content' ? 'Content' : 'Task'}
                        </Badge>

                        {/* Title */}
                        <div className="fw-bold mb-1" style={{ fontSize: '0.9rem' }}>
                          {item.title}
                        </div>

                        {/* Content Details */}
                        {item.type === 'content' && (item.platform || item.postType) && (
                          <div className="mb-2">
                            <small className="text-muted">
                              {item.platform && `${item.platform}`}
                              {item.platform && item.postType && ' • '}
                              {item.postType && `${item.postType}`}
                            </small>
                          </div>
                        )}

                        {/* Priority */}
                        <Badge
                          bg={getPriorityColor(item.priority)}
                          className="me-1"
                          style={{ fontSize: '0.65rem' }}
                        >
                          {item.priority?.charAt(0).toUpperCase() + item.priority?.slice(1)}
                        </Badge>

                        {/* Assignee */}
                        {item.assignedTo && (
                          <div className="mt-2 d-flex align-items-center">
                            <FaUser className="me-1" style={{ fontSize: '0.7rem' }} />
                            <small className="text-muted">{item.assignedTo.name}</small>
                          </div>
                        )}

                        {/* Due Date */}
                        {item.dueDate && (
                          <div className="mt-1 d-flex align-items-center">
                            <FaCalendar className="me-1" style={{ fontSize: '0.7rem' }} />
                            <small className="text-muted">
                              {new Date(item.dueDate).toLocaleDateString()}
                            </small>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Work Item Details Modal */}
      {selectedItem && (
        <WorkItemDetailsModal
          show={showModal}
          onHide={() => {
            setShowModal(false);
            setSelectedItem(null);
          }}
          workItem={selectedItem}
          onUpdate={handleUpdateStatus}
          onRefresh={loadWorkItems}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default WorkBoardTab;
