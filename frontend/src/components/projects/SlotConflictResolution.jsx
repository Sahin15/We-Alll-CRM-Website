import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Alert, 
  Button, 
  Modal, 
  Form, 
  Table, 
  Badge, 
  Row, 
  Col,
  Spinner,
  ListGroup
} from 'react-bootstrap';
import { 
  FaExclamationTriangle, 
  FaTools, 
  FaUserCheck, 
  FaExchangeAlt,
  FaTrash,
  FaCheck,
  FaTimes,
  FaClock
} from 'react-icons/fa';
import { toast } from 'react-toastify';

/**
 * SlotConflictResolution Component
 * 
 * Handles slot conflicts and provides resolution options
 * Requirements: 7.1, 7.2, 7.3
 */
const SlotConflictResolution = ({ 
  project, 
  conflicts = [], 
  onResolveConflict, 
  onRefreshConflicts,
  availableUsers = [],
  isProjectHead = false 
}) => {
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolutionType, setResolutionType] = useState('');
  const [resolutionData, setResolutionData] = useState({});
  const [loading, setLoading] = useState(false);
  const [autoResolving, setAutoResolving] = useState(false);

  // Conflict types and their descriptions
  const conflictTypes = {
    'double-assignment': {
      title: 'Double Assignment',
      description: 'Multiple work items assigned to the same slot',
      severity: 'high',
      icon: FaUserCheck,
      color: 'danger'
    },
    'overdue-assignment': {
      title: 'Overdue Assignment',
      description: 'Slot assignment is past due date',
      severity: 'medium',
      icon: FaClock,
      color: 'warning'
    },
    'capacity-exceeded': {
      title: 'Capacity Exceeded',
      description: 'More slots assigned than project capacity',
      severity: 'high',
      icon: FaExclamationTriangle,
      color: 'danger'
    },
    'invalid-assignment': {
      title: 'Invalid Assignment',
      description: 'Slot assigned to unavailable user',
      severity: 'medium',
      icon: FaUserCheck,
      color: 'warning'
    },
    'dependency-violation': {
      title: 'Dependency Violation',
      description: 'Slot assigned before dependencies are completed',
      severity: 'medium',
      icon: FaExchangeAlt,
      color: 'warning'
    }
  };

  // Resolution strategies
  const resolutionStrategies = {
    'reassign': {
      title: 'Reassign Slot',
      description: 'Assign slot to a different user',
      icon: FaExchangeAlt,
      requiresUser: true
    },
    'release': {
      title: 'Release Slot',
      description: 'Release slot back to available status',
      icon: FaTimes,
      requiresUser: false
    },
    'merge': {
      title: 'Merge Work Items',
      description: 'Combine multiple work items into one',
      icon: FaCheck,
      requiresUser: false
    },
    'split': {
      title: 'Split Slot',
      description: 'Create additional slots to resolve capacity issues',
      icon: FaTools,
      requiresUser: false
    },
    'extend-deadline': {
      title: 'Extend Deadline',
      description: 'Extend the due date for overdue assignments',
      icon: FaClock,
      requiresUser: false
    }
  };

  useEffect(() => {
    if (conflicts.length === 0 && onRefreshConflicts) {
      onRefreshConflicts();
    }
  }, []);

  const getConflictConfig = (type) => {
    return conflictTypes[type] || {
      title: 'Unknown Conflict',
      description: 'Unknown conflict type',
      severity: 'low',
      icon: FaExclamationTriangle,
      color: 'secondary'
    };
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      'high': { bg: 'danger', text: 'High' },
      'medium': { bg: 'warning', text: 'Medium' },
      'low': { bg: 'info', text: 'Low' }
    };
    
    const config = severityConfig[severity] || severityConfig['low'];
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const getAvailableResolutions = (conflict) => {
    switch (conflict.type) {
      case 'double-assignment':
        return ['reassign', 'release', 'merge'];
      case 'overdue-assignment':
        return ['reassign', 'extend-deadline', 'release'];
      case 'capacity-exceeded':
        return ['split', 'release'];
      case 'invalid-assignment':
        return ['reassign', 'release'];
      case 'dependency-violation':
        return ['reassign', 'release'];
      default:
        return ['reassign', 'release'];
    }
  };

  const handleResolveConflict = async () => {
    if (!selectedConflict || !resolutionType) {
      toast.error('Please select a resolution strategy');
      return;
    }

    const strategy = resolutionStrategies[resolutionType];
    if (strategy.requiresUser && !resolutionData.selectedUser) {
      toast.error('Please select a user for reassignment');
      return;
    }

    setLoading(true);
    try {
      await onResolveConflict(selectedConflict.id, {
        type: resolutionType,
        data: resolutionData
      });

      setShowResolutionModal(false);
      setSelectedConflict(null);
      setResolutionType('');
      setResolutionData({});
      toast.success('Conflict resolved successfully');
      
      // Refresh conflicts list
      if (onRefreshConflicts) {
        onRefreshConflicts();
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('Failed to resolve conflict');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoResolve = async () => {
    if (conflicts.length === 0) return;

    setAutoResolving(true);
    try {
      // Auto-resolve simple conflicts
      const simpleConflicts = conflicts.filter(c => 
        c.type === 'overdue-assignment' || c.type === 'invalid-assignment'
      );

      for (const conflict of simpleConflicts) {
        await onResolveConflict(conflict.id, {
          type: 'release',
          data: { reason: 'Auto-resolved by system' }
        });
      }

      toast.success(`Auto-resolved ${simpleConflicts.length} conflicts`);
      
      if (onRefreshConflicts) {
        onRefreshConflicts();
      }
    } catch (error) {
      console.error('Error auto-resolving conflicts:', error);
      toast.error('Failed to auto-resolve conflicts');
    } finally {
      setAutoResolving(false);
    }
  };

  const openResolutionModal = (conflict) => {
    setSelectedConflict(conflict);
    setResolutionType('');
    setResolutionData({});
    setShowResolutionModal(true);
  };

  if (!isProjectHead) {
    return (
      <Alert variant="info">
        <FaExclamationTriangle className="me-2" />
        Only project heads can resolve slot conflicts.
      </Alert>
    );
  }

  return (
    <div className="slot-conflict-resolution">
      {/* Header */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaTools className="me-2" />
            Slot Conflicts
            {conflicts.length > 0 && (
              <Badge bg="danger" className="ms-2">
                {conflicts.length}
              </Badge>
            )}
          </h5>
          
          {conflicts.length > 0 && (
            <div>
              <Button 
                variant="outline-primary" 
                size="sm" 
                className="me-2"
                onClick={onRefreshConflicts}
              >
                Refresh
              </Button>
              <Button 
                variant="warning" 
                size="sm"
                onClick={handleAutoResolve}
                disabled={autoResolving}
              >
                {autoResolving ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Auto-Resolving...
                  </>
                ) : (
                  'Auto-Resolve Simple'
                )}
              </Button>
            </div>
          )}
        </Card.Header>

        <Card.Body>
          {conflicts.length === 0 ? (
            <div className="text-center py-4">
              <FaCheck className="text-success mb-3" size={48} />
              <h6 className="text-success">No Conflicts Detected</h6>
              <p className="text-muted mb-0">All slots are properly configured and assigned.</p>
            </div>
          ) : (
            <div>
              {/* Conflict Summary */}
              <Row className="g-3 mb-4">
                <Col md={3}>
                  <div className="text-center p-3 bg-danger bg-opacity-10 rounded">
                    <div className="h4 mb-1 text-danger">
                      {conflicts.filter(c => getConflictConfig(c.type).severity === 'high').length}
                    </div>
                    <div className="small text-muted">High Priority</div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-warning bg-opacity-10 rounded">
                    <div className="h4 mb-1 text-warning">
                      {conflicts.filter(c => getConflictConfig(c.type).severity === 'medium').length}
                    </div>
                    <div className="small text-muted">Medium Priority</div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                    <div className="h4 mb-1 text-info">
                      {conflicts.filter(c => getConflictConfig(c.type).severity === 'low').length}
                    </div>
                    <div className="small text-muted">Low Priority</div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <div className="h4 mb-1">{conflicts.length}</div>
                    <div className="small text-muted">Total Conflicts</div>
                  </div>
                </Col>
              </Row>

              {/* Conflicts List */}
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Description</th>
                      <th>Affected Slots</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflicts.map((conflict) => {
                      const config = getConflictConfig(conflict.type);
                      const IconComponent = config.icon;
                      
                      return (
                        <tr key={conflict.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <IconComponent className={`text-${config.color} me-2`} />
                              <div>
                                <div className="fw-semibold">{config.title}</div>
                                <div className="small text-muted">{config.description}</div>
                              </div>
                            </div>
                          </td>
                          <td>{getSeverityBadge(config.severity)}</td>
                          <td>
                            <div className="small">
                              {conflict.description || 'No additional details'}
                            </div>
                          </td>
                          <td>
                            <div className="small">
                              {conflict.affectedSlots?.map(slotId => (
                                <Badge key={slotId} bg="secondary" className="me-1">
                                  Slot {slotId}
                                </Badge>
                              )) || 'Unknown'}
                            </div>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openResolutionModal(conflict)}
                            >
                              Resolve
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Resolution Modal */}
      <Modal show={showResolutionModal} onHide={() => setShowResolutionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Resolve Conflict</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedConflict && (
            <div>
              {/* Conflict Details */}
              <Alert variant={getConflictConfig(selectedConflict.type).color} className="mb-4">
                <div className="d-flex align-items-center">
                  <FaExclamationTriangle className="me-2" />
                  <div>
                    <strong>{getConflictConfig(selectedConflict.type).title}</strong>
                    <div className="small mt-1">
                      {selectedConflict.description || getConflictConfig(selectedConflict.type).description}
                    </div>
                  </div>
                </div>
              </Alert>

              {/* Resolution Strategies */}
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Resolution Strategy</Form.Label>
                  <ListGroup>
                    {getAvailableResolutions(selectedConflict).map(strategyKey => {
                      const strategy = resolutionStrategies[strategyKey];
                      const IconComponent = strategy.icon;
                      
                      return (
                        <ListGroup.Item
                          key={strategyKey}
                          action
                          active={resolutionType === strategyKey}
                          onClick={() => setResolutionType(strategyKey)}
                          className="d-flex align-items-center"
                        >
                          <IconComponent className="me-3" />
                          <div>
                            <div className="fw-semibold">{strategy.title}</div>
                            <div className="small text-muted">{strategy.description}</div>
                          </div>
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </Form.Group>

                {/* Additional Resolution Data */}
                {resolutionType && resolutionStrategies[resolutionType].requiresUser && (
                  <Form.Group className="mb-3">
                    <Form.Label>Assign To</Form.Label>
                    <Form.Select
                      value={resolutionData.selectedUser || ''}
                      onChange={(e) => setResolutionData(prev => ({
                        ...prev,
                        selectedUser: e.target.value
                      }))}
                    >
                      <option value="">Select a user...</option>
                      {availableUsers.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name} - {user.email}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}

                {resolutionType === 'extend-deadline' && (
                  <Form.Group className="mb-3">
                    <Form.Label>New Due Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={resolutionData.newDueDate || ''}
                      onChange={(e) => setResolutionData(prev => ({
                        ...prev,
                        newDueDate: e.target.value
                      }))}
                    />
                  </Form.Group>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>Resolution Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={resolutionData.notes || ''}
                    onChange={(e) => setResolutionData(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    placeholder="Optional notes about this resolution..."
                  />
                </Form.Group>
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResolutionModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleResolveConflict}
            disabled={loading || !resolutionType}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Resolving...
              </>
            ) : (
              'Apply Resolution'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SlotConflictResolution;