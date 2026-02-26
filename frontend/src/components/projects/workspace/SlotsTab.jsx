import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, ListGroup, Modal, Form, Alert, ProgressBar, Table } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaUser, FaCalendar, FaClock, FaCheckCircle, FaExclamationTriangle, FaLink } from 'react-icons/fa';
import { toast } from 'react-toastify';
import projectApi from '../../../api/projectApi';
import workItemApi from '../../../api/workItemApi';
import AssignWorkModal from '../../work/AssignWorkModal';
import userApi from '../../../api/userApi';
import { useAuth } from '../../../context/AuthContext';

/**
 * SlotsTab Component
 * Comprehensive slot management interface
 */
const SlotsTab = ({ project, onRefresh }) => {
  console.log('🎬 SlotsTab component mounted for project:', project?._id);
  
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Slot form data
  const [slotFormData, setSlotFormData] = useState({
    slotNumber: '',
    title: '',
    description: '',
    workType: 'Other',
    priority: 'Medium',
    estimatedEffort: '',
    deliverables: '',
    acceptanceCriteria: '',
    dependencies: []
  });

  // Assignment form data
  const [assignmentData, setAssignmentData] = useState({
    assignedTo: '',
    dueDate: '',
    notes: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSlots();
    loadTeamMembers();
  }, [project._id]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading slots for project:', project._id);
      const response = await projectApi.getAvailableSlots(project._id, { includeAll: true });
      console.log('📦 Slots response:', response);
      if (response.success) {
        const slotsData = response.data?.slots || [];
        console.log('✅ Loaded slots:', slotsData.length, 'slots');
        console.log('📊 First slot sample:', slotsData[0]);
        setSlots(slotsData);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const members = project.assignedUsers || [];
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleOpenSlotModal = (slot = null) => {
    if (slot) {
      // Edit existing slot
      setSelectedSlot(slot);
      setSlotFormData({
        slotNumber: slot.slotNumber,
        title: slot.title || '',
        description: slot.description || '',
        workType: slot.workType || 'Other',
        priority: slot.priority || 'Medium',
        estimatedEffort: slot.slotConfiguration?.estimatedEffort || '',
        deliverables: slot.slotMetadata?.deliverables?.join('\n') || '',
        acceptanceCriteria: slot.slotMetadata?.acceptanceCriteria?.join('\n') || '',
        dependencies: slot.slotConfiguration?.dependencies || []
      });
    } else {
      // Create new slot
      setSelectedSlot(null);
      const nextSlotNumber = slots.length > 0 ? Math.max(...slots.map(s => s.slotNumber)) + 1 : 1;
      setSlotFormData({
        slotNumber: nextSlotNumber,
        title: '',
        description: '',
        workType: 'Other',
        priority: 'Medium',
        estimatedEffort: '',
        deliverables: '',
        acceptanceCriteria: '',
        dependencies: []
      });
    }
    setShowSlotModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    
    if (!slotFormData.title || !slotFormData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      
      const slotData = {
        project: project._id,
        slotNumber: slotFormData.slotNumber,
        slotIdentifier: `Slot ${slotFormData.slotNumber}`,
        title: slotFormData.title,
        description: slotFormData.description,
        workType: slotFormData.workType,
        priority: slotFormData.priority,
        slotConfiguration: {
          estimatedEffort: slotFormData.estimatedEffort ? parseFloat(slotFormData.estimatedEffort) : 0,
          dependencies: slotFormData.dependencies
        },
        slotMetadata: {
          deliverables: slotFormData.deliverables.split('\n').filter(d => d.trim()),
          acceptanceCriteria: slotFormData.acceptanceCriteria.split('\n').filter(a => a.trim())
        }
      };

      if (selectedSlot) {
        // Update existing slot
        await projectApi.updateSlot(selectedSlot._id, slotData);
        toast.success('Slot updated successfully!');
      } else {
        // Create new slot
        await projectApi.createSlot(project._id, slotData);
        toast.success('Slot created successfully!');
      }

      setShowSlotModal(false);
      loadSlots();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving slot:', error);
      toast.error(error.response?.data?.message || 'Failed to save slot');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAssignModal = (slot) => {
    setSelectedSlot(slot);
    setShowAssignModal(true);
  };

  const handleAssignWorkSuccess = async () => {
    // Refresh slots after work is assigned
    toast.success('✅ Work assigned to slot! The slot table will update now.');
    await loadSlots();
    if (onRefresh) onRefresh();
    setShowAssignModal(false);
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Are you sure you want to delete Slot ${slot.slotNumber}?`)) {
      return;
    }

    try {
      await projectApi.deleteSlot(slot._id);
      toast.success('Slot deleted successfully!');
      loadSlots();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete slot');
    }
  };

  const handleDeleteAllSlots = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL ${slots.length} slots? This action cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);
      // Delete all slots one by one
      for (const slot of slots) {
        await projectApi.deleteSlot(slot._id);
      }
      toast.success(`Successfully deleted ${slots.length} slots!`);
      loadSlots();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting slots:', error);
      toast.error('Failed to delete all slots');
    } finally {
      setSaving(false);
    }
  };

  // Check if user can manage slots
  const canManageSlots = 
    user?.role === 'admin' || 
    user?.role === 'superadmin' || 
    user?.role === 'hr' ||
    user?.role === 'manager' ||
    user?.role === 'hod' ||
    user?._id === project.projectHead?._id;

  // Filter slots
  const filteredSlots = slots.filter(slot => {
    if (filterStatus === 'all') return true;
    return slot.assignmentStatus === filterStatus;
  });

  // Calculate statistics
  const stats = {
    total: slots.length,
    available: slots.filter(s => s.assignmentStatus === 'available').length,
    assigned: slots.filter(s => s.assignmentStatus === 'assigned' || s.assignmentStatus === 'in-progress').length,
    completed: slots.filter(s => s.assignmentStatus === 'completed').length
  };

  const completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const getStatusBadge = (status) => {
    const badges = {
      'available': { bg: 'secondary', text: 'Available' },
      'assigned': { bg: 'primary', text: 'Assigned' },
      'in-progress': { bg: 'warning', text: 'In Progress' },
      'completed': { bg: 'success', text: 'Completed' },
      'blocked': { bg: 'danger', text: 'Blocked' },
      'cancelled': { bg: 'dark', text: 'Cancelled' }
    };
    return badges[status] || badges['available'];
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      'Low': 'secondary',
      'Medium': 'info',
      'High': 'warning',
      'Urgent': 'danger'
    };
    return badges[priority] || 'secondary';
  };

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
      {/* Slot System Info Banner */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card.Body className="text-white p-3">
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center">
                <div className="me-3" style={{ fontSize: '2rem' }}>🎯</div>
                <div>
                  <h6 className="mb-1" style={{ fontWeight: '600' }}>Slot-Based Project Management</h6>
                  <small style={{ opacity: 0.9 }}>
                    {canManageSlots 
                      ? 'Manage project slots, define work, and assign to team members.'
                      : 'View project slots and their progress.'}
                  </small>
                </div>
              </div>
            </Col>
            {canManageSlots && (
              <Col xs="auto">
                <div className="d-flex gap-2">
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => handleOpenSlotModal()}
                    className="d-flex align-items-center"
                    style={{ fontWeight: '500' }}
                  >
                    <FaPlus className="me-2" />
                    Create Slot
                  </Button>
                  {slots.length > 0 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={handleDeleteAllSlots}
                      className="d-flex align-items-center"
                      style={{ fontWeight: '500' }}
                    >
                      <FaTrash className="me-2" />
                      Delete All Slots
                    </Button>
                  )}
                </div>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">Total Slots</small>
                  <h3 className="mb-0">{stats.total}</h3>
                </div>
                <div className="text-primary" style={{ fontSize: '2rem' }}>🎯</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">Available</small>
                  <h3 className="mb-0">{stats.available}</h3>
                </div>
                <div className="text-secondary" style={{ fontSize: '2rem' }}>⚪</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">In Progress</small>
                  <h3 className="mb-0">{stats.assigned}</h3>
                </div>
                <div className="text-warning" style={{ fontSize: '2rem' }}>🟡</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">Completed</small>
                  <h3 className="mb-0">{stats.completed}</h3>
                </div>
                <div className="text-success" style={{ fontSize: '2rem' }}>✅</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Progress Bar */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Overall Progress</h6>
            <span className="fw-bold">{completionPercentage}%</span>
          </div>
          <ProgressBar 
            now={completionPercentage} 
            variant={completionPercentage === 100 ? 'success' : 'primary'}
            style={{ height: '20px' }}
          />
          <small className="text-muted mt-2 d-block">
            {stats.completed} of {stats.total} slots completed
          </small>
        </Card.Body>
      </Card>

      {/* Filters */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">Slots ({filteredSlots.length})</h5>
            </Col>
            <Col xs="auto">
              <Form.Select
                size="sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Slots List */}
      <Card className="border-0 shadow-sm">
        <ListGroup variant="flush">
          {filteredSlots.length === 0 ? (
            <ListGroup.Item className="text-center py-5 text-muted">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p className="mb-0">No slots found</p>
              {canManageSlots && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleOpenSlotModal()}
                >
                  <FaPlus className="me-2" />
                  Create First Slot
                </Button>
              )}
            </ListGroup.Item>
          ) : (
            filteredSlots.map((slot) => {
              const statusBadge = getStatusBadge(slot.assignmentStatus);
              
              return (
                <ListGroup.Item key={slot._id}>
                  <Row className="align-items-center">
                    <Col md={1}>
                      <div className="text-center">
                        <Badge bg="light" text="dark" style={{ fontSize: '1rem', padding: '8px 12px' }}>
                          #{slot.slotNumber}
                        </Badge>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div>
                        <h6 className="mb-1">{slot.title}</h6>
                        <small className="text-muted">{slot.description}</small>
                      </div>
                    </Col>
                    <Col md={2}>
                      <Badge bg={statusBadge.bg}>{statusBadge.text}</Badge>
                      <br />
                      <Badge bg={getPriorityBadge(slot.priority)} className="mt-1">
                        {slot.priority}
                      </Badge>
                    </Col>
                    <Col md={2}>
                      {/* Show assignedTo from either slot directly or from assignedWorkItem */}
                      {(slot.assignedTo || slot.assignedWorkItem?.assignedTo) ? (
                        <div>
                          <div className="d-flex align-items-center mb-1">
                            <FaUser className="me-2 text-muted" />
                            <small>{slot.assignedTo?.name || slot.assignedWorkItem?.assignedTo?.name}</small>
                          </div>
                          {(slot.dueDate || slot.assignedWorkItem?.dueDate) && (
                            <div className="d-flex align-items-center">
                              <FaCalendar className="me-2 text-muted" />
                              <small>
                                {new Date(slot.dueDate || slot.assignedWorkItem.dueDate).toLocaleDateString()}
                              </small>
                            </div>
                          )}
                        </div>
                      ) : (
                        <small className="text-muted">Unassigned</small>
                      )}
                    </Col>
                    <Col md={3} className="text-end">
                      {canManageSlots && (
                        <div className="d-flex gap-2 justify-content-end">
                          {slot.assignmentStatus === 'available' && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleOpenAssignModal(slot)}
                            >
                              <FaUser className="me-1" />
                              Assign
                            </Button>
                          )}
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenSlotModal(slot)}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteSlot(slot)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      )}
                    </Col>
                  </Row>
                </ListGroup.Item>
              );
            })
          )}
        </ListGroup>
      </Card>

      {/* Create/Edit Slot Modal */}
      <Modal show={showSlotModal} onHide={() => !saving && setShowSlotModal(false)} size="lg" centered>
        <Modal.Header closeButton={!saving}>
          <Modal.Title>
            {selectedSlot ? `Edit Slot ${selectedSlot.slotNumber}` : 'Create New Slot'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveSlot}>
          <Modal.Body>
            <Row>
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Slot Number *</Form.Label>
                  <Form.Control
                    type="number"
                    value={slotFormData.slotNumber}
                    onChange={(e) => setSlotFormData({ ...slotFormData, slotNumber: parseInt(e.target.value) })}
                    required
                    min="1"
                    disabled={!!selectedSlot}
                  />
                </Form.Group>
              </Col>
              <Col md={9} className="mb-3">
                <Form.Group>
                  <Form.Label>Title *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Homepage Design"
                    value={slotFormData.title}
                    onChange={(e) => setSlotFormData({ ...slotFormData, title: e.target.value })}
                    required
                    maxLength={200}
                  />
                </Form.Group>
              </Col>
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Detailed description of the work to be done..."
                    value={slotFormData.description}
                    onChange={(e) => setSlotFormData({ ...slotFormData, description: e.target.value })}
                    required
                    maxLength={2000}
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Work Type</Form.Label>
                  <Form.Select
                    value={slotFormData.workType}
                    onChange={(e) => setSlotFormData({ ...slotFormData, workType: e.target.value })}
                  >
                    <option value="Feature Development">Feature Development</option>
                    <option value="Bug Fix">Bug Fix</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Content Writing">Content Writing</option>
                    <option value="Testing">Testing</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={slotFormData.priority}
                    onChange={(e) => setSlotFormData({ ...slotFormData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Estimated Hours</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="8"
                    value={slotFormData.estimatedEffort}
                    onChange={(e) => setSlotFormData({ ...slotFormData, estimatedEffort: e.target.value })}
                    min="0"
                    step="0.5"
                  />
                </Form.Group>
              </Col>
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Deliverables (one per line)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Design file&#10;Specifications document&#10;Asset exports"
                    value={slotFormData.deliverables}
                    onChange={(e) => setSlotFormData({ ...slotFormData, deliverables: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Acceptance Criteria (one per line)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Responsive design&#10;Brand guidelines followed&#10;Client approved"
                    value={slotFormData.acceptanceCriteria}
                    onChange={(e) => setSlotFormData({ ...slotFormData, acceptanceCriteria: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSlotModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <FaCheckCircle className="me-2" />
                  {selectedSlot ? 'Update Slot' : 'Create Slot'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Assign Work Modal - Use unified modal */}
      <AssignWorkModal
        show={showAssignModal}
        onHide={() => setShowAssignModal(false)}
        onSuccess={handleAssignWorkSuccess}
        defaultProject={project._id}
        slotInfo={selectedSlot ? {
          slotId: selectedSlot._id,
          slotNumber: selectedSlot.slotNumber,
          slotIdentifier: selectedSlot.slotIdentifier
        } : null}
      />
    </div>
  );
};

export default SlotsTab;
