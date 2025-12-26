import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Form, 
  Modal, 
  Table, 
  Badge, 
  Alert,
  Dropdown,
  ButtonGroup,
  Spinner
} from 'react-bootstrap';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaCog, 
  FaUsers, 
  FaExchangeAlt,
  FaCheck,
  FaTimes,
  FaEllipsisV
} from 'react-icons/fa';
import { toast } from 'react-toastify';

/**
 * SlotManagementInterface Component
 * 
 * Provides comprehensive slot management capabilities for project managers
 * Requirements: 7.1, 7.2, 7.3
 */
const SlotManagementInterface = ({ 
  project, 
  slots = [], 
  onSlotUpdate, 
  onSlotCreate, 
  onSlotDelete,
  onSlotAssign,
  onSlotRelease,
  onSlotComplete,
  isProjectHead = false,
  availableUsers = []
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Configuration state
  const [slotConfig, setSlotConfig] = useState({
    totalSlots: project?.slotConfiguration?.totalSlots || 10,
    slotType: project?.slotConfiguration?.slotType || 'generic',
    allowDynamicSlots: project?.slotConfiguration?.allowDynamicSlots || true,
    slotNamingPattern: project?.slotConfiguration?.slotNamingPattern || 'Slot {number}',
    autoCreateSlots: project?.slotConfiguration?.autoCreateSlots || true
  });

  // Assignment state
  const [assignmentData, setAssignmentData] = useState({
    selectedUser: '',
    assignmentNotes: '',
    dueDate: '',
    priority: 'Medium'
  });

  useEffect(() => {
    if (project?.slotConfiguration) {
      setSlotConfig({
        totalSlots: project.slotConfiguration.totalSlots || 10,
        slotType: project.slotConfiguration.slotType || 'generic',
        allowDynamicSlots: project.slotConfiguration.allowDynamicSlots || true,
        slotNamingPattern: project.slotConfiguration.slotNamingPattern || 'Slot {number}',
        autoCreateSlots: project.slotConfiguration.autoCreateSlots || true
      });
    }
  }, [project]);

  const handleConfigUpdate = async () => {
    if (!isProjectHead) {
      toast.error('Only project heads can modify slot configuration');
      return;
    }

    setLoading(true);
    try {
      // Update project slot configuration
      await onSlotUpdate(project._id, { slotConfiguration: slotConfig });
      setShowConfigModal(false);
      toast.success('Slot configuration updated successfully');
    } catch (error) {
      console.error('Error updating slot configuration:', error);
      toast.error('Failed to update slot configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotAssignment = async () => {
    if (!selectedSlot || !assignmentData.selectedUser) {
      toast.error('Please select a user to assign');
      return;
    }

    setLoading(true);
    try {
      await onSlotAssign(selectedSlot._id, {
        assignedTo: assignmentData.selectedUser,
        notes: assignmentData.assignmentNotes,
        dueDate: assignmentData.dueDate,
        priority: assignmentData.priority
      });
      
      setShowAssignModal(false);
      setSelectedSlot(null);
      setAssignmentData({
        selectedUser: '',
        assignmentNotes: '',
        dueDate: '',
        priority: 'Medium'
      });
      toast.success('Slot assigned successfully');
    } catch (error) {
      console.error('Error assigning slot:', error);
      toast.error('Failed to assign slot');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotRelease = async (slotId) => {
    if (!window.confirm('Are you sure you want to release this slot? This will make it available for reassignment.')) {
      return;
    }

    setLoading(true);
    try {
      await onSlotRelease(slotId);
      toast.success('Slot released successfully');
    } catch (error) {
      console.error('Error releasing slot:', error);
      toast.error('Failed to release slot');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotCompletion = async (slotId) => {
    if (!window.confirm('Are you sure you want to mark this slot as completed? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await onSlotComplete(slotId);
      toast.success('Slot marked as completed');
    } catch (error) {
      console.error('Error completing slot:', error);
      toast.error('Failed to complete slot');
    } finally {
      setLoading(false);
    }
  };

  const getSlotStatusBadge = (slot) => {
    const statusConfig = {
      'available': { bg: 'secondary', text: 'Available' },
      'assigned': { bg: 'primary', text: 'Assigned' },
      'in-progress': { bg: 'warning', text: 'In Progress' },
      'completed': { bg: 'success', text: 'Completed' },
      'blocked': { bg: 'danger', text: 'Blocked' },
      'cancelled': { bg: 'dark', text: 'Cancelled' }
    };

    const config = statusConfig[slot.assignmentStatus] || statusConfig['available'];
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'Low': { bg: 'info', text: 'Low' },
      'Medium': { bg: 'warning', text: 'Medium' },
      'High': { bg: 'danger', text: 'High' },
      'Urgent': { bg: 'danger', text: 'Urgent' }
    };

    const config = priorityConfig[priority] || priorityConfig['Medium'];
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const canManageSlot = (slot) => {
    return isProjectHead || slot.assignedTo?._id === project.projectHead?._id;
  };

  return (
    <div className="slot-management-interface">
      {/* Header with Actions */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaCog className="me-2" />
            Slot Management
          </h5>
          {isProjectHead && (
            <ButtonGroup>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => setShowConfigModal(true)}
              >
                <FaCog className="me-2" />
                Configure
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                <FaPlus className="me-2" />
                Create Slots
              </Button>
            </ButtonGroup>
          )}
        </Card.Header>

        <Card.Body>
          {/* Slot Configuration Summary */}
          <Row className="g-3 mb-3">
            <Col md={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="h5 mb-1">{slotConfig.totalSlots}</div>
                <div className="small text-muted">Total Slots</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="h5 mb-1">{slots.length}</div>
                <div className="small text-muted">Created</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="h5 mb-1">
                  {slots.filter(s => s.assignmentStatus === 'assigned' || s.assignmentStatus === 'in-progress').length}
                </div>
                <div className="small text-muted">Assigned</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="h5 mb-1">
                  {slots.filter(s => s.assignmentStatus === 'completed').length}
                </div>
                <div className="small text-muted">Completed</div>
              </div>
            </Col>
          </Row>

          {/* Slot Management Table */}
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No slots created yet. {isProjectHead && "Click 'Create Slots' to get started."}
                    </td>
                  </tr>
                ) : (
                  slots.map((slot) => (
                    <tr key={slot._id}>
                      <td>
                        <div>
                          <div className="fw-semibold">
                            {slot.slotIdentifier || `Slot ${slot.slotNumber}`}
                          </div>
                          <div className="small text-muted">
                            {slot.title || 'No title'}
                          </div>
                        </div>
                      </td>
                      <td>{getSlotStatusBadge(slot)}</td>
                      <td>
                        {slot.assignedTo ? (
                          <div>
                            <div className="fw-semibold">{slot.assignedTo.name}</div>
                            <div className="small text-muted">{slot.assignedTo.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td>{getPriorityBadge(slot.priority || 'Medium')}</td>
                      <td>
                        {slot.dueDate ? (
                          <div className="small">
                            {new Date(slot.dueDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted">No due date</span>
                        )}
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle 
                            variant="outline-secondary" 
                            size="sm"
                            disabled={!canManageSlot(slot)}
                          >
                            <FaEllipsisV />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            {slot.assignmentStatus === 'available' && (
                              <Dropdown.Item 
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  setShowAssignModal(true);
                                }}
                              >
                                <FaUsers className="me-2" />   
                                Assign
                              </Dropdown.Item>
                            )}
                            {(slot.assignmentStatus === 'assigned' || slot.   assignmentStatus === 'in-progress') && (
                              <>
                                <Dropdown.Item 
                                  onClick={() => {
                                    setSelectedSlot(slot);
                                    setShowAssignModal(true);
                                  }}
                                >
                                  <FaExchangeAlt className="me-2" />
                                  Reassign
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => handleSlotRelease(slot._id)}
                                >
                                  <FaTimes className="me-2" />
                                  Release
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => handleSlotCompletion(slot._id)}
                                >
                                  <FaCheck className="me-2" />
                                  Mark Complete
                                </Dropdown.Item>
                              </>
                            )}
                            <Dropdown.Divider />
                            <Dropdown.Item 
                              onClick={() => onSlotDelete && onSlotDelete(slot._id)}
                              className="text-danger"
                            >
                              <FaTrash className="me-2" />
                              Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Slot Configuration Modal */}
      <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Slot Configuration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Total Slots</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="1000"
                    value={slotConfig.totalSlots}
                    onChange={(e) => setSlotConfig(prev => ({
                      ...prev,
                      totalSlots: parseInt(e.target.value) || 1
                    }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Slot Type</Form.Label>
                  <Form.Select
                    value={slotConfig.slotType}
                    onChange={(e) => setSlotConfig(prev => ({
                      ...prev,
                      slotType: e.target.value
                    }))}
                  >
                    <option value="generic">Generic</option>
                    <option value="milestone">Milestone</option>
                    <option value="deliverable">Deliverable</option>
                    <option value="custom">Custom</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Slot Naming Pattern</Form.Label>
                  <Form.Control
                    type="text"
                    value={slotConfig.slotNamingPattern}
                    onChange={(e) => setSlotConfig(prev => ({
                      ...prev,
                      slotNamingPattern: e.target.value
                    }))}
                    placeholder="e.g., Slot {number}, Task {number}, Milestone {number}"
                  />
                  <Form.Text className="text-muted">
                    Use {'{number}'} as placeholder for slot number
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  label="Allow Dynamic Slots"
                  checked={slotConfig.allowDynamicSlots}
                  onChange={(e) => setSlotConfig(prev => ({
                    ...prev,
                    allowDynamicSlots: e.target.checked
                  }))}
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  label="Auto Create Slots"
                  checked={slotConfig.autoCreateSlots}
                  onChange={(e) => setSlotConfig(prev => ({
                    ...prev,
                    autoCreateSlots: e.target.checked
                  }))}
                />
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfigModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfigUpdate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Updating...
              </>
            ) : (
              'Update Configuration'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Slot Assignment Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedSlot?.assignmentStatus === 'available' ? 'Assign Slot' : 'Reassign Slot'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSlot && (
            <Alert variant="info" className="mb-3">
              <strong>Slot:</strong> {selectedSlot.slotIdentifier || `Slot ${selectedSlot.slotNumber}`}
              <br />
              <strong>Current Status:</strong> {selectedSlot.assignmentStatus}
            </Alert>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Assign To</Form.Label>
              <Form.Select
                value={assignmentData.selectedUser}
                onChange={(e) => setAssignmentData(prev => ({
                  ...prev,
                  selectedUser: e.target.value
                }))}
                required
              >
                <option value="">Select a user...</option>
                {availableUsers.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={assignmentData.priority}
                    onChange={(e) => setAssignmentData(prev => ({
                      ...prev,
                      priority: e.target.value
                    }))}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={assignmentData.dueDate}
                    onChange={(e) => setAssignmentData(prev => ({
                      ...prev,
                      dueDate: e.target.value
                    }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3">
              <Form.Label>Assignment Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={assignmentData.assignmentNotes}
                onChange={(e) => setAssignmentData(prev => ({
                  ...prev,
                  assignmentNotes: e.target.value
                }))}
                placeholder="Optional notes about this assignment..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSlotAssignment}
            disabled={loading || !assignmentData.selectedUser}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Assigning...
              </>
            ) : (
              'Assign Slot'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SlotManagementInterface;