import { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Modal, Form, Row, Col, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaEye, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from "../../../context/AuthContext";
import { checkPageAccess, PAGE_ACCESS } from "../../../constants/pageAccess";
import workItemApi from '../../../api/workItemApi';
import moment from 'moment';

/**
 * SimplifiedWorkTab - Single unified view for ALL work items
 * Shows all work assigned in the project with full CRUD operations
 */
const SimplifiedWorkTab = ({ project, onRefresh }) => {
  const { user, canAccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workItems, setWorkItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium',
    status: 'To Do'
  });

  // Check if user can manage work (project head or team member)
  const canManageWork =
    checkPageAccess(canAccess, PAGE_ACCESS.workManage) ||
    user?._id === project.projectHead?._id ||
    project.assignedUsers?.some(u => (u._id || u) === user?._id);

  const canDeleteWork = checkPageAccess(canAccess, PAGE_ACCESS.workManage);

  useEffect(() => {
    loadWorkItems();
    loadTeamMembers();
  }, [project._id]);

  const loadWorkItems = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading work items for project:', project._id);
      
      const response = await workItemApi.getWorkItemsByProject(project._id);
      const items = response.data || response || [];
      
      console.log('✅ Loaded work items:', items.length);
      setWorkItems(items);
    } catch (error) {
      console.error('❌ Error loading work items:', error);
      toast.error('Failed to load work items');
      setWorkItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = () => {
    const members = project.assignedUsers || [];
    if (project.projectHead && !members.find(m => (m._id || m) === (project.projectHead._id || project.projectHead))) {
      members.unshift(project.projectHead);
    }
    setTeamMembers(members);
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      // Edit mode
      setIsEditMode(true);
      setSelectedItem(item);
      setFormData({
        title: item.title || '',
        description: item.description || '',
        assignedTo: item.assignedTo?._id || '',
        dueDate: item.dueDate ? moment(item.dueDate).format('YYYY-MM-DD') : '',
        priority: item.priority || 'medium',
        status: item.status || 'To Do'
      });
    } else {
      // Create mode
      setIsEditMode(false);
      setSelectedItem(null);
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
        status: 'To Do'
      });
    }
    setShowModal(true);
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.assignedTo || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      console.log('💾 Submitting work item:', formData);
      
      if (isEditMode && selectedItem) {
        // Update existing work item
        await workItemApi.updateWorkItem(selectedItem._id, formData);
        toast.success('Work item updated successfully!');
      } else {
        // Create new work item
        const workItemData = {
          ...formData,
          project: project._id,
          type: 'task' // Always task type for simplicity
        };
        
        await workItemApi.createWorkItem(workItemData);
        toast.success('Work assigned successfully!');
      }

      setShowModal(false);
      await loadWorkItems();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('❌ Error saving work item:', error);
      toast.error(error.response?.data?.message || 'Failed to save work item');
    }
  };

  const handleDelete = async (item) => {
    if (!canDeleteWork) {
      toast.error('Only HR, Manager, Admin, or SuperAdmin can delete work items');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      await workItemApi.deleteWorkItem(item._id);
      toast.success('Work item deleted successfully!');
      await loadWorkItems();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('❌ Error deleting work item:', error);
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to delete work item';
      toast.error(errorMessage);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success'
    };
    return variants[status] || 'secondary';
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      'urgent': 'danger',
      'high': 'warning',
      'medium': 'info',
      'low': 'secondary'
    };
    return variants[priority] || 'info';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading work items...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">Work Items ({workItems.length})</h5>
              <small className="text-muted">
                All work assigned in this project
              </small>
            </div>
            {canManageWork && (
              <Button 
                variant="primary" 
                onClick={() => handleOpenModal()}
                className="d-flex align-items-center"
              >
                <FaPlus className="me-2" />
                Assign Work
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Work Items Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th style={{ width: '5%' }}>#</th>
                <th style={{ width: '25%' }}>Title</th>
                <th style={{ width: '15%' }}>Assigned To</th>
                <th style={{ width: '12%' }}>Due Date</th>
                <th style={{ width: '10%' }}>Priority</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '23%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <div>
                      <p className="mb-2">No work items yet</p>
                      {canManageWork && (
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleOpenModal()}
                        >
                          <FaPlus className="me-2" />
                          Assign First Work Item
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                workItems.map((item, index) => (
                  <tr key={item._id}>
                    <td className="fw-bold">{index + 1}</td>
                    <td>
                      <div>
                        <div className="fw-semibold">{item.title}</div>
                        {item.description && (
                          <small className="text-muted">
                            {item.description.substring(0, 50)}
                            {item.description.length > 50 ? '...' : ''}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FaUser className="me-2 text-muted" size={12} />
                        {item.assignedTo?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td>
                      {item.dueDate ? (
                        <span className={moment(item.dueDate).isBefore(moment(), 'day') && item.status !== 'Done' ? 'text-danger' : ''}>
                          {moment(item.dueDate).format('MMM DD, YYYY')}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <Badge bg={getPriorityBadge(item.priority)}>
                        {item.priority || 'medium'}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={getStatusBadge(item.status)}>
                        {item.status || 'To Do'}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                          title="View Details"
                        >
                          <FaEye />
                        </Button>
                        {canManageWork && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenModal(item)}
                            title="Edit"
                          >
                            <FaEdit />
                          </Button>
                        )}
                        {canDeleteWork && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            title="Delete"
                          >
                            <FaTrash />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {isEditMode ? 'Edit Work Item' : 'Assign Work'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter work title"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter work description"
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Assign To <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    required
                  >
                    <option value="">Select team member...</option>
                    {teamMembers.map(member => (
                      <option key={member._id || member} value={member._id || member}>
                        {member.name || 'Unknown'}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Due Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Priority <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    required
                  >
                    <option value="">Select priority...</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {isEditMode && (
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Done">Done</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {isEditMode ? 'Update' : 'Assign Work'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Work Item Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <Row className="mb-3">
                <Col md={12}>
                  <h5 className="mb-3">{selectedItem.title}</h5>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Assigned To:</strong>
                  <p className="mb-0">{selectedItem.assignedTo?.name || 'Unassigned'}</p>
                </Col>
                <Col md={6}>
                  <strong>Due Date:</strong>
                  <p className="mb-0">
                    {selectedItem.dueDate ? moment(selectedItem.dueDate).format('MMMM DD, YYYY') : '-'}
                  </p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Priority:</strong>
                  <p className="mb-0">
                    <Badge bg={getPriorityBadge(selectedItem.priority)}>
                      {selectedItem.priority || 'medium'}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  <strong>Status:</strong>
                  <p className="mb-0">
                    <Badge bg={getStatusBadge(selectedItem.status)}>
                      {selectedItem.status || 'To Do'}
                    </Badge>
                  </p>
                </Col>
              </Row>

              {selectedItem.description && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Description:</strong>
                    <p className="mb-0 mt-2">{selectedItem.description}</p>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Created By:</strong>
                  <p className="mb-0">{selectedItem.createdBy?.name || '-'}</p>
                </Col>
                <Col md={6}>
                  <strong>Created At:</strong>
                  <p className="mb-0">
                    {selectedItem.createdAt ? moment(selectedItem.createdAt).format('MMMM DD, YYYY') : '-'}
                  </p>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SimplifiedWorkTab;
