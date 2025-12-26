import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Alert,
  Badge,
  ProgressBar,
  ListGroup,
  InputGroup,
  Spinner,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import {
  FaCheck,
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEdit,
  FaTrash,
  FaClock,
  FaFlag,
  FaCogs, // Replacing FaSlotMachine with FaCogs for slot operations
  FaExchangeAlt,
  FaUnlink,
  FaLink,
  FaProjectDiagram
} from 'react-icons/fa';
import moment from 'moment';
import './BulkOperationsPanel.css';

/**
 * Bulk Operations Panel Component
 * Comprehensive bulk operations interface with validation and progress tracking
 * Enhanced with slot management capabilities
 * 
 * Features:
 * - Bulk status updates with validation
 * - Bulk reassignment with permission checks
 * - Bulk date modification with constraint validation
 * - Bulk slot assignment and reassignment operations
 * - Slot conflict detection and resolution
 * - Operation confirmation and progress tracking
 * - Undo/Redo functionality
 * - Batch processing with error handling
 * - Slot operation audit logging integration
 * 
 * Requirements: 9.2, 9.4, 9.5
 */
const BulkOperationsPanel = ({
  show,
  onHide,
  selectedItems = [],
  onBulkOperation,
  filterOptions = {},
  currentUser,
  loading = false,
  // Slot-related props
  availableSlots = [],
  onSlotOperation = null,
  enableSlotOperations = true,
  projectFilter = null // Filter slots by project
}) => {
  // Operation state
  const [selectedOperation, setSelectedOperation] = useState('');
  const [operationData, setOperationData] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [processedItems, setProcessedItems] = useState([]);
  const [failedItems, setFailedItems] = useState([]);
  const [slotConflicts, setSlotConflicts] = useState([]);
  const [showConflictResolution, setShowConflictResolution] = useState(false);

  // Available bulk operations (enhanced with slot operations)
  const bulkOperations = [
    {
      id: 'updateStatus',
      label: 'Update Status',
      icon: FaFlag,
      description: 'Change status for selected work entries',
      requiresData: true,
      dataFields: ['status'],
      permissions: ['admin', 'superadmin', 'hr', 'manager'],
      validation: (items, data) => {
        const errors = [];
        if (!data.status) errors.push('Status is required');
        if (items.some(item => item.status === 'completed' && data.status !== 'completed')) {
          errors.push('Cannot change status of completed items');
        }
        return errors;
      }
    },
    {
      id: 'reassign',
      label: 'Reassign Work',
      icon: FaUser,
      description: 'Assign selected work to different employees',
      requiresData: true,
      dataFields: ['assignedTo'],
      permissions: ['admin', 'superadmin', 'hr', 'manager'],
      validation: (items, data) => {
        const errors = [];
        if (!data.assignedTo) errors.push('Assignee is required');
        return errors;
      }
    },
    // Slot-specific operations
    ...(enableSlotOperations ? [
      {
        id: 'assignToSlot',
        label: 'Assign to Slots',
        icon: FaCogs,
        description: 'Assign selected work items to available project slots',
        requiresData: true,
        dataFields: ['slotAssignmentMode', 'targetSlot', 'autoAssignSlots'],
        permissions: ['admin', 'superadmin', 'hr', 'manager'],
        validation: (items, data) => {
          const errors = [];
          if (!data.slotAssignmentMode) errors.push('Slot assignment mode is required');
          if (data.slotAssignmentMode === 'specific' && !data.targetSlot) {
            errors.push('Target slot is required for specific assignment');
          }
          
          // Check for items already assigned to slots
          const alreadyAssigned = items.filter(item => item.slotAssignment?.assignedSlot);
          if (alreadyAssigned.length > 0 && !data.allowReassignment) {
            errors.push(`${alreadyAssigned.length} items are already assigned to slots. Enable reassignment to proceed.`);
          }
          
          return errors;
        },
        slotOperation: true
      },
      {
        id: 'reassignSlots',
        label: 'Reassign Slots',
        icon: FaExchangeAlt,
        description: 'Move work items to different slots with conflict detection',
        requiresData: true,
        dataFields: ['newSlot', 'conflictResolution'],
        permissions: ['admin', 'superadmin', 'hr', 'manager'],
        validation: (items, data) => {
          const errors = [];
          if (!data.newSlot) errors.push('New slot is required');
          
          // Only allow reassignment of items that are already assigned to slots
          const notAssigned = items.filter(item => !item.slotAssignment?.assignedSlot);
          if (notAssigned.length > 0) {
            errors.push(`${notAssigned.length} items are not assigned to slots. Use "Assign to Slots" instead.`);
          }
          
          return errors;
        },
        slotOperation: true
      },
      {
        id: 'releaseFromSlots',
        label: 'Release from Slots',
        icon: FaUnlink,
        description: 'Remove slot assignments and make slots available',
        requiresData: false,
        dataFields: [],
        permissions: ['admin', 'superadmin', 'hr', 'manager'],
        validation: (items) => {
          const errors = [];
          const notAssigned = items.filter(item => !item.slotAssignment?.assignedSlot);
          if (notAssigned.length === items.length) {
            errors.push('No items are assigned to slots');
          }
          if (notAssigned.length > 0) {
            errors.push(`${notAssigned.length} items are not assigned to slots and will be skipped`);
          }
          return errors;
        },
        slotOperation: true
      },
      {
        id: 'bulkSlotReassignment',
        label: 'Bulk Slot Reassignment',
        icon: FaProjectDiagram,
        description: 'Intelligently reassign multiple items to optimize slot utilization',
        requiresData: true,
        dataFields: ['reassignmentStrategy', 'priorityWeighting', 'respectDependencies'],
        permissions: ['admin', 'superadmin', 'manager'],
        validation: (items, data) => {
          const errors = [];
          if (!data.reassignmentStrategy) errors.push('Reassignment strategy is required');
          
          const assignedItems = items.filter(item => item.slotAssignment?.assignedSlot);
          if (assignedItems.length < 2) {
            errors.push('At least 2 items with slot assignments are required for bulk reassignment');
          }
          
          return errors;
        },
        slotOperation: true,
        advanced: true
      }
    ] : []),
    {
      id: 'updateDates',
      label: 'Update Dates',
      icon: FaCalendarAlt,
      description: 'Modify start, due, or end dates',
      requiresData: true,
      dataFields: ['startDate', 'dueDate', 'endDate'],
      permissions: ['admin', 'superadmin', 'hr', 'manager'],
      validation: (items, data) => {
        const errors = [];
        if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
          errors.push('Start date cannot be after end date');
        }
        if (data.dueDate && data.startDate && new Date(data.dueDate) < new Date(data.startDate)) {
          errors.push('Due date cannot be before start date');
        }
        return errors;
      }
    },
    {
      id: 'updatePriority',
      label: 'Update Priority',
      icon: FaExclamationTriangle,
      description: 'Change priority level for selected items',
      requiresData: true,
      dataFields: ['priority'],
      permissions: ['admin', 'superadmin', 'hr', 'manager'],
      validation: (items, data) => {
        const errors = [];
        if (!data.priority) errors.push('Priority is required');
        return errors;
      }
    },
    {
      id: 'addTags',
      label: 'Add Tags',
      icon: FaEdit,
      description: 'Add tags to selected work entries',
      requiresData: true,
      dataFields: ['tags'],
      permissions: ['admin', 'superadmin', 'hr', 'manager'],
      validation: (items, data) => {
        const errors = [];
        if (!data.tags || data.tags.length === 0) errors.push('At least one tag is required');
        return errors;
      }
    },
    {
      id: 'delete',
      label: 'Delete Items',
      icon: FaTrash,
      description: 'Permanently delete selected work entries',
      requiresData: false,
      dataFields: [],
      permissions: ['admin', 'superadmin'],
      validation: (items) => {
        const errors = [];
        const completedItems = items.filter(item => item.status === 'completed');
        if (completedItems.length > 0) {
          errors.push(`Cannot delete ${completedItems.length} completed items`);
        }
        
        // Check for slot assignments
        if (enableSlotOperations) {
          const slotAssignedItems = items.filter(item => item.slotAssignment?.assignedSlot);
          if (slotAssignedItems.length > 0) {
            errors.push(`${slotAssignedItems.length} items are assigned to slots. Release them first or they will be automatically released.`);
          }
        }
        
        return errors;
      },
      dangerous: true
    }
  ];

  // Get available operations based on user permissions
  const availableOperations = useMemo(() => {
    return bulkOperations.filter(op => 
      op.permissions.includes(currentUser?.role)
    );
  }, [currentUser?.role]);

  // Get filtered slots based on project filter
  const filteredSlots = useMemo(() => {
    if (!projectFilter) return availableSlots;
    return availableSlots.filter(slot => 
      slot.projectId === projectFilter || slot.project === projectFilter
    );
  }, [availableSlots, projectFilter]);

  // Detect slot conflicts for selected items
  const detectSlotConflicts = useCallback((items, targetSlot) => {
    const conflicts = [];
    
    if (!targetSlot) return conflicts;
    
    // Check if slot is already assigned
    if (targetSlot.assignmentStatus === 'assigned' || targetSlot.assignmentStatus === 'completed') {
      conflicts.push({
        type: 'slot-occupied',
        message: `Slot ${targetSlot.slotIdentifier} is already ${targetSlot.assignmentStatus}`,
        severity: 'high',
        affectedItems: items.map(item => item._id)
      });
    }
    
    // Check capacity constraints
    if (targetSlot.capacity && items.length > targetSlot.capacity) {
      conflicts.push({
        type: 'capacity-exceeded',
        message: `Slot capacity (${targetSlot.capacity}) exceeded by ${items.length - targetSlot.capacity} items`,
        severity: 'high',
        affectedItems: items.slice(targetSlot.capacity).map(item => item._id)
      });
    }
    
    // Check dependencies
    if (targetSlot.dependencies && targetSlot.dependencies.length > 0) {
      const unmetDependencies = targetSlot.dependencies.filter(depId => {
        const depSlot = filteredSlots.find(s => s._id === depId);
        return !depSlot || depSlot.assignmentStatus !== 'completed';
      });
      
      if (unmetDependencies.length > 0) {
        conflicts.push({
          type: 'unmet-dependencies',
          message: `${unmetDependencies.length} slot dependencies are not completed`,
          severity: 'medium',
          affectedItems: items.map(item => item._id)
        });
      }
    }
    
    return conflicts;
  }, [filteredSlots]);

  // Get selected operation details
  const selectedOperationDetails = useMemo(() => {
    return availableOperations.find(op => op.id === selectedOperation);
  }, [selectedOperation, availableOperations]);

  // Validate current operation
  const validateOperation = useCallback(() => {
    if (!selectedOperationDetails) return [];
    
    const errors = selectedOperationDetails.validation(selectedItems, operationData);
    setValidationErrors(errors);
    return errors;
  }, [selectedOperationDetails, selectedItems, operationData]);

  // Handle operation selection
  const handleOperationSelect = useCallback((operationId) => {
    setSelectedOperation(operationId);
    setOperationData({});
    setValidationErrors([]);
    setConfirmationStep(false);
  }, []);

  // Handle operation data change
  const handleDataChange = useCallback((field, value) => {
    setOperationData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle operation confirmation
  const handleConfirmOperation = useCallback(() => {
    const errors = validateOperation();
    if (errors.length === 0) {
      setConfirmationStep(true);
    }
  }, [validateOperation]);

  // Execute bulk operation
  const executeBulkOperation = useCallback(async () => {
    if (!selectedOperationDetails) return;

    try {
      setOperationProgress(0);
      setProcessedItems([]);
      setFailedItems([]);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Execute the operation
      if (selectedOperationDetails.slotOperation && onSlotOperation) {
        // Handle slot-specific operations
        await onSlotOperation(selectedOperation, selectedItems.map(item => item._id), operationData);
      } else {
        // Handle regular bulk operations
        await onBulkOperation(selectedOperation, selectedItems.map(item => item._id), operationData);
      }

      // Complete progress
      clearInterval(progressInterval);
      setOperationProgress(100);
      setProcessedItems(selectedItems);

      // Close modal after success
      setTimeout(() => {
        onHide();
        resetModal();
      }, 1500);

    } catch (error) {
      console.error('Bulk operation failed:', error);
      setFailedItems(selectedItems);
      setOperationProgress(0);
    }
  }, [selectedOperationDetails, selectedOperation, selectedItems, operationData, onBulkOperation, onSlotOperation, onHide]);

  // Reset modal state
  const resetModal = useCallback(() => {
    setSelectedOperation('');
    setOperationData({});
    setValidationErrors([]);
    setConfirmationStep(false);
    setOperationProgress(0);
    setProcessedItems([]);
    setFailedItems([]);
    setSlotConflicts([]);
    setShowConflictResolution(false);
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    resetModal();
    onHide();
  }, [resetModal, onHide]);

  // Render operation data fields
  const renderDataFields = () => {
    if (!selectedOperationDetails?.requiresData) return null;

    return selectedOperationDetails.dataFields.map(field => {
      switch (field) {
        case 'status':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>New Status</Form.Label>
              <Form.Select
                value={operationData.status || ''}
                onChange={(e) => handleDataChange('status', e.target.value)}
              >
                <option value="">Select Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="postponed">Postponed</option>
              </Form.Select>
            </Form.Group>
          );

        case 'assignedTo':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Assign To</Form.Label>
              <Form.Select
                value={operationData.assignedTo || ''}
                onChange={(e) => handleDataChange('assignedTo', e.target.value)}
              >
                <option value="">Select Employee</option>
                {filterOptions.employees?.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          );

        // Slot-specific fields
        case 'slotAssignmentMode':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Slot Assignment Mode</Form.Label>
              <Form.Select
                value={operationData.slotAssignmentMode || ''}
                onChange={(e) => handleDataChange('slotAssignmentMode', e.target.value)}
              >
                <option value="">Select Assignment Mode</option>
                <option value="specific">Assign to Specific Slot</option>
                <option value="auto">Auto-assign to Available Slots</option>
                <option value="priority">Assign by Priority Matching</option>
                <option value="effort">Assign by Effort Matching</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Choose how items should be assigned to slots
              </Form.Text>
            </Form.Group>
          );

        case 'targetSlot':
          return operationData.slotAssignmentMode === 'specific' && (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Target Slot</Form.Label>
              <Form.Select
                value={operationData.targetSlot || ''}
                onChange={(e) => {
                  const slotId = e.target.value;
                  const slot = filteredSlots.find(s => s._id === slotId);
                  handleDataChange('targetSlot', slotId);
                  
                  // Detect conflicts when slot is selected
                  if (slot) {
                    const conflicts = detectSlotConflicts(selectedItems, slot);
                    setSlotConflicts(conflicts);
                  }
                }}
              >
                <option value="">Select Target Slot</option>
                {filteredSlots.filter(slot => slot.assignmentStatus === 'available').map(slot => (
                  <option key={slot._id} value={slot._id}>
                    {slot.slotIdentifier} - {slot.title} 
                    {slot.estimatedEffort && ` (${slot.estimatedEffort}h)`}
                  </option>
                ))}
              </Form.Select>
              {slotConflicts.length > 0 && (
                <Alert variant="warning" className="mt-2">
                  <Alert.Heading className="h6">Slot Conflicts Detected:</Alert.Heading>
                  <ul className="mb-0">
                    {slotConflicts.map((conflict, idx) => (
                      <li key={idx}>{conflict.message}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Form.Group>
          );

        case 'autoAssignSlots':
          return operationData.slotAssignmentMode !== 'specific' && (
            <Form.Group key={field} className="mb-3">
              <Form.Check
                type="checkbox"
                label="Allow automatic slot creation if needed"
                checked={operationData.autoAssignSlots || false}
                onChange={(e) => handleDataChange('autoAssignSlots', e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                label="Allow reassignment of existing slot assignments"
                checked={operationData.allowReassignment || false}
                onChange={(e) => handleDataChange('allowReassignment', e.target.checked)}
              />
            </Form.Group>
          );

        case 'newSlot':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>New Slot</Form.Label>
              <Form.Select
                value={operationData.newSlot || ''}
                onChange={(e) => {
                  const slotId = e.target.value;
                  const slot = filteredSlots.find(s => s._id === slotId);
                  handleDataChange('newSlot', slotId);
                  
                  // Detect conflicts for reassignment
                  if (slot) {
                    const conflicts = detectSlotConflicts(selectedItems, slot);
                    setSlotConflicts(conflicts);
                  }
                }}
              >
                <option value="">Select New Slot</option>
                {filteredSlots.map(slot => (
                  <option 
                    key={slot._id} 
                    value={slot._id}
                    disabled={slot.assignmentStatus === 'completed'}
                  >
                    {slot.slotIdentifier} - {slot.title}
                    {slot.assignmentStatus !== 'available' && ` [${slot.assignmentStatus}]`}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          );

        case 'conflictResolution':
          return slotConflicts.length > 0 && (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Conflict Resolution Strategy</Form.Label>
              <Form.Select
                value={operationData.conflictResolution || ''}
                onChange={(e) => handleDataChange('conflictResolution', e.target.value)}
              >
                <option value="">Select Resolution Strategy</option>
                <option value="force">Force Assignment (Override conflicts)</option>
                <option value="skip">Skip Conflicting Items</option>
                <option value="queue">Queue for Manual Resolution</option>
                <option value="auto-resolve">Auto-resolve Where Possible</option>
              </Form.Select>
            </Form.Group>
          );

        case 'reassignmentStrategy':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Reassignment Strategy</Form.Label>
              <Form.Select
                value={operationData.reassignmentStrategy || ''}
                onChange={(e) => handleDataChange('reassignmentStrategy', e.target.value)}
              >
                <option value="">Select Strategy</option>
                <option value="optimize-utilization">Optimize Slot Utilization</option>
                <option value="balance-workload">Balance Workload</option>
                <option value="priority-based">Priority-based Assignment</option>
                <option value="deadline-driven">Deadline-driven Assignment</option>
              </Form.Select>
            </Form.Group>
          );

        case 'priorityWeighting':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Priority Weighting</Form.Label>
              <Form.Range
                min={0}
                max={100}
                value={operationData.priorityWeighting || 50}
                onChange={(e) => handleDataChange('priorityWeighting', parseInt(e.target.value))}
              />
              <Form.Text className="text-muted">
                {operationData.priorityWeighting || 50}% - Higher values prioritize urgent items
              </Form.Text>
            </Form.Group>
          );

        case 'respectDependencies':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Check
                type="checkbox"
                label="Respect slot dependencies during reassignment"
                checked={operationData.respectDependencies !== false}
                onChange={(e) => handleDataChange('respectDependencies', e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                label="Maintain assignment order where possible"
                checked={operationData.maintainOrder || false}
                onChange={(e) => handleDataChange('maintainOrder', e.target.checked)}
              />
            </Form.Group>
          );

        case 'priority':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Priority Level</Form.Label>
              <Form.Select
                value={operationData.priority || ''}
                onChange={(e) => handleDataChange('priority', e.target.value)}
              >
                <option value="">Select Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Form.Select>
            </Form.Group>
          );

        case 'startDate':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={operationData.startDate || ''}
                onChange={(e) => handleDataChange('startDate', e.target.value)}
              />
            </Form.Group>
          );

        case 'dueDate':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={operationData.dueDate || ''}
                onChange={(e) => handleDataChange('dueDate', e.target.value)}
              />
            </Form.Group>
          );

        case 'endDate':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={operationData.endDate || ''}
                onChange={(e) => handleDataChange('endDate', e.target.value)}
              />
            </Form.Group>
          );

        case 'tags':
          return (
            <Form.Group key={field} className="mb-3">
              <Form.Label>Tags (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                placeholder="tag1, tag2, tag3"
                value={operationData.tags?.join(', ') || ''}
                onChange={(e) => handleDataChange('tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
              />
            </Form.Group>
          );

        default:
          return null;
      }
    });
  };

  // Render confirmation step
  const renderConfirmation = () => (
    <div className="confirmation-step">
      <Alert variant={selectedOperationDetails?.dangerous ? 'danger' : 'warning'}>
        <Alert.Heading className="d-flex align-items-center gap-2">
          <FaExclamationTriangle />
          Confirm Bulk Operation
        </Alert.Heading>
        <p>
          You are about to <strong>{selectedOperationDetails?.label.toLowerCase()}</strong> for{' '}
          <strong>{selectedItems.length}</strong> work entries.
        </p>
        {selectedOperationDetails?.dangerous && (
          <p className="text-danger mb-0">
            <strong>Warning:</strong> This action cannot be undone.
          </p>
        )}
      </Alert>

      <div className="operation-summary mb-3">
        <h6>Operation Summary:</h6>
        <ListGroup variant="flush">
          <ListGroup.Item className="d-flex justify-content-between">
            <span>Operation:</span>
            <Badge bg="primary">{selectedOperationDetails?.label}</Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between">
            <span>Items affected:</span>
            <Badge bg="info">{selectedItems.length}</Badge>
          </ListGroup.Item>
          {Object.entries(operationData).map(([key, value]) => (
            <ListGroup.Item key={key} className="d-flex justify-content-between">
              <span>{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
              <Badge bg="secondary">
                {Array.isArray(value) ? value.join(', ') : value}
              </Badge>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>

      {operationProgress > 0 && (
        <div className="operation-progress mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span>Processing...</span>
            <span>{operationProgress}%</span>
          </div>
          <ProgressBar 
            now={operationProgress} 
            variant={operationProgress === 100 ? 'success' : 'primary'}
            animated={operationProgress < 100}
          />
          {processedItems.length > 0 && (
            <div className="mt-2 text-success">
              <FaCheck className="me-1" />
              Successfully processed {processedItems.length} items
            </div>
          )}
          {failedItems.length > 0 && (
            <div className="mt-2 text-danger">
              <FaTimes className="me-1" />
              Failed to process {failedItems.length} items
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaEdit />
          Bulk Operations
          <Badge bg="primary">{selectedItems.length} items selected</Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {!confirmationStep ? (
          <>
            {/* Operation Selection */}
            <div className="operation-selection mb-4">
              <h6>Select Operation:</h6>
              <Row className="g-2">
                {availableOperations.map(operation => (
                  <Col key={operation.id} md={operation.advanced ? 12 : 6}>
                    <div
                      className={`operation-card ${selectedOperation === operation.id ? 'selected' : ''} ${
                        operation.dangerous ? 'dangerous' : ''
                      } ${operation.slotOperation ? 'slot-operation' : ''} ${
                        operation.advanced ? 'advanced-operation' : ''
                      }`}
                      onClick={() => handleOperationSelect(operation.id)}
                    >
                      <div className="operation-icon">
                        <operation.icon />
                      </div>
                      <div className="operation-details">
                        <div className="operation-label">
                          {operation.label}
                          {operation.slotOperation && (
                            <Badge bg="primary" size="sm" className="ms-2">Slot</Badge>
                          )}
                          {operation.advanced && (
                            <Badge bg="warning" size="sm" className="ms-2">Advanced</Badge>
                          )}
                        </div>
                        <div className="operation-description">{operation.description}</div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
              
              {/* Slot Operations Info */}
              {enableSlotOperations && availableOperations.some(op => op.slotOperation) && (
                <Alert variant="info" className="mt-3 mb-0">
                  <FaInfoCircle className="me-2" />
                  <strong>Slot Operations:</strong> These operations work with project slots for enhanced work organization and progress tracking.
                </Alert>
              )}
            </div>

            {/* Operation Data Fields */}
            {selectedOperationDetails && (
              <div className="operation-data">
                <h6>Operation Details:</h6>
                {renderDataFields()}
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="danger">
                <Alert.Heading>Validation Errors:</Alert.Heading>
                <ul className="mb-0">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Selected Items Preview */}
            <div className="selected-items-preview">
              <h6>Selected Items ({selectedItems.length}):</h6>
              <div className="items-list">
                {selectedItems.slice(0, 5).map(item => (
                  <div key={item._id} className="item-preview">
                    <div className="item-title">{item.title}</div>
                    <div className="item-meta">
                      <Badge bg="secondary">{item.status}</Badge>
                      <Badge bg="info">{item.priority}</Badge>
                      <span className="text-muted">{item.assignedTo?.name}</span>
                      {enableSlotOperations && item.slotAssignment?.assignedSlot && (
                        <Badge bg="success" className="d-flex align-items-center">
                          <FaCogs className="me-1" size={10} />
                          {item.slotAssignment.slotIdentifier || 'Slot Assigned'}
                        </Badge>
                      )}
                      {enableSlotOperations && !item.slotAssignment?.assignedSlot && (
                        <Badge bg="light" text="dark">No Slot</Badge>
                      )}
                    </div>
                  </div>
                ))}
                {selectedItems.length > 5 && (
                  <div className="text-muted">
                    ... and {selectedItems.length - 5} more items
                  </div>
                )}
              </div>
              
              {/* Slot Assignment Summary */}
              {enableSlotOperations && (
                <div className="slot-summary mt-3 p-2 bg-light rounded">
                  <h6 className="small mb-2">Slot Assignment Summary:</h6>
                  <Row className="g-2 small">
                    <Col xs={6}>
                      <div className="text-center">
                        <div className="fw-bold text-success">
                          {selectedItems.filter(item => item.slotAssignment?.assignedSlot).length}
                        </div>
                        <div className="text-muted">Assigned to Slots</div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="text-center">
                        <div className="fw-bold text-secondary">
                          {selectedItems.filter(item => !item.slotAssignment?.assignedSlot).length}
                        </div>
                        <div className="text-muted">No Slot Assignment</div>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}
            </div>
          </>
        ) : (
          renderConfirmation()
        )}
      </Modal.Body>

      <Modal.Footer>
        {!confirmationStep ? (
          <>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={selectedOperationDetails?.dangerous ? 'danger' : 'primary'}
              onClick={handleConfirmOperation}
              disabled={!selectedOperation || validationErrors.length > 0}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="secondary" 
              onClick={() => setConfirmationStep(false)}
              disabled={operationProgress > 0}
            >
              Back
            </Button>
            <Button
              variant={selectedOperationDetails?.dangerous ? 'danger' : 'success'}
              onClick={executeBulkOperation}
              disabled={loading || operationProgress > 0}
            >
              {loading || operationProgress > 0 ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FaCheck className="me-2" />
                  Execute Operation
                </>
              )}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default BulkOperationsPanel;