import React, { useState, useEffect } from 'react';
import { Form, Spinner, Badge, Alert } from 'react-bootstrap';
import { FaCogs, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

/**
 * SlotSelectionDropdown Component
 * 
 * Dropdown for selecting available slots with filtering and real-time status
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1
 */
const SlotSelectionDropdown = ({
  projectId,
  selectedSlot = null,
  onSlotSelect,
  onSlotChange,
  disabled = false,
  required = false,
  showAvailabilityIndicator = true,
  filterByAvailability = true,
  size = 'md',
  placeholder = 'Select a slot...',
  className = ''
}) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availabilityStatus, setAvailabilityStatus] = useState({});

  useEffect(() => {
    if (projectId) {
      fetchSlots();
    } else {
      setSlots([]);
      setError(null);
    }
  }, [projectId, filterByAvailability]);

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace with actual slot API
      const mockSlots = [
        {
          _id: 'slot1',
          slotNumber: 1,
          slotIdentifier: 'Slot 1',
          title: 'Initial Setup',
          description: 'Project setup and configuration',
          assignmentStatus: 'available',
          priority: 'High',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedEffort: 8,
          dependencies: [],
          slotConfiguration: {
            isRequired: true,
            canBeSkipped: false,
            requiresApproval: false
          }
        },
        {
          _id: 'slot2',
          slotNumber: 2,
          slotIdentifier: 'Slot 2',
          title: 'Development Phase 1',
          description: 'Core functionality development',
          assignmentStatus: 'assigned',
          assignedTo: { _id: 'user1', name: 'John Doe' },
          priority: 'High',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedEffort: 16,
          dependencies: ['slot1'],
          slotConfiguration: {
            isRequired: true,
            canBeSkipped: false,
            requiresApproval: true
          }
        },
        {
          _id: 'slot3',
          slotNumber: 3,
          slotIdentifier: 'Slot 3',
          title: 'Testing Phase',
          description: 'Quality assurance and testing',
          assignmentStatus: 'available',
          priority: 'Medium',
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedEffort: 12,
          dependencies: ['slot2'],
          slotConfiguration: {
            isRequired: false,
            canBeSkipped: true,
            requiresApproval: false
          }
        },
        {
          _id: 'slot4',
          slotNumber: 4,
          slotIdentifier: 'Slot 4',
          title: 'Documentation',
          description: 'Project documentation and user guides',
          assignmentStatus: 'blocked',
          priority: 'Low',
          dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedEffort: 6,
          dependencies: ['slot3'],
          slotConfiguration: {
            isRequired: false,
            canBeSkipped: true,
            requiresApproval: false
          }
        }
      ];

      // Filter slots based on availability if required
      let filteredSlots = mockSlots;
      if (filterByAvailability) {
        filteredSlots = mockSlots.filter(slot => 
          slot.assignmentStatus === 'available' || 
          slot.assignmentStatus === 'assigned' // Show assigned slots for reassignment
        );
      }

      setSlots(filteredSlots);
      
      // Calculate availability status for each slot
      const statusMap = {};
      filteredSlots.forEach(slot => {
        statusMap[slot._id] = calculateAvailabilityStatus(slot, filteredSlots);
      });
      setAvailabilityStatus(statusMap);

    } catch (err) {
      console.error('Error fetching slots:', err);
      setError('Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  const calculateAvailabilityStatus = (slot, allSlots) => {
    // Check if slot is available
    if (slot.assignmentStatus === 'completed') {
      return { status: 'completed', message: 'Already completed' };
    }
    
    if (slot.assignmentStatus === 'blocked') {
      return { status: 'blocked', message: 'Currently blocked' };
    }

    if (slot.assignmentStatus === 'assigned') {
      return { 
        status: 'assigned', 
        message: `Assigned to ${slot.assignedTo?.name || 'Unknown'}` 
      };
    }

    // Check dependencies
    if (slot.dependencies && slot.dependencies.length > 0) {
      const unmetDependencies = slot.dependencies.filter(depId => {
        const depSlot = allSlots.find(s => s._id === depId);
        return !depSlot || depSlot.assignmentStatus !== 'completed';
      });

      if (unmetDependencies.length > 0) {
        return { 
          status: 'dependencies', 
          message: `Waiting for ${unmetDependencies.length} dependency(ies)` 
        };
      }
    }

    // Check if overdue
    if (slot.dueDate && new Date(slot.dueDate) < new Date()) {
      return { status: 'overdue', message: 'Past due date' };
    }

    return { status: 'available', message: 'Available for assignment' };
  };

  const getStatusBadge = (slot) => {
    const status = availabilityStatus[slot._id];
    if (!status) return null;

    const badgeConfig = {
      'available': { bg: 'success', icon: FaCheckCircle, text: 'Available' },
      'assigned': { bg: 'primary', icon: FaCogs, text: 'Assigned' },
      'completed': { bg: 'secondary', icon: FaCheckCircle, text: 'Completed' },
      'blocked': { bg: 'danger', icon: FaExclamationTriangle, text: 'Blocked' },
      'dependencies': { bg: 'warning', icon: FaExclamationTriangle, text: 'Dependencies' },
      'overdue': { bg: 'danger', icon: FaExclamationTriangle, text: 'Overdue' }
    };

    const config = badgeConfig[status.status] || badgeConfig['available'];
    const IconComponent = config.icon;

    return (
      <Badge bg={config.bg} className="ms-2">
        <IconComponent className="me-1" size={10} />
        {config.text}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'Low': { bg: 'info', text: 'Low' },
      'Medium': { bg: 'warning', text: 'Medium' },
      'High': { bg: 'danger', text: 'High' },
      'Urgent': { bg: 'danger', text: 'Urgent' }
    };

    const config = priorityConfig[priority] || priorityConfig['Medium'];
    return <Badge bg={config.bg} size="sm">{config.text}</Badge>;
  };

  const handleSlotChange = (e) => {
    const slotId = e.target.value;
    const slot = slots.find(s => s._id === slotId);
    
    if (onSlotSelect) {
      onSlotSelect(slot);
    }
    if (onSlotChange) {
      onSlotChange(slotId);
    }
  };

  const isSlotSelectable = (slot) => {
    const status = availabilityStatus[slot._id];
    return status && (
      status.status === 'available' || 
      status.status === 'assigned' // Allow reassignment
    );
  };

  if (!projectId) {
    return (
      <Alert variant="info" className="mb-0">
        <FaExclamationTriangle className="me-2" />
        Please select a project first to view available slots
      </Alert>
    );
  }

  return (
    <div className={`slot-selection-dropdown ${className}`}>
      <Form.Group>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <Form.Label className="mb-0">
            <FaCogs className="me-2" />
            Select Slot {required && <span className="text-danger">*</span>}
          </Form.Label>
          {loading && <Spinner size="sm" />}
        </div>
        
        <Form.Select
          value={selectedSlot?._id || selectedSlot || ''}
          onChange={handleSlotChange}
          disabled={disabled || loading}
          size={size}
          className={error ? 'is-invalid' : ''}
        >
          <option value="">{loading ? 'Loading slots...' : placeholder}</option>
          {slots.map(slot => (
            <option 
              key={slot._id} 
              value={slot._id}
              disabled={!isSlotSelectable(slot)}
            >
              {slot.slotIdentifier} - {slot.title}
              {slot.estimatedEffort && ` (${slot.estimatedEffort}h)`}
              {!isSlotSelectable(slot) && ' [Not Available]'}
            </option>
          ))}
        </Form.Select>
        
        {error && (
          <div className="invalid-feedback d-block">
            {error}
          </div>
        )}
      </Form.Group>

      {/* Selected Slot Details */}
      {selectedSlot && (
        <div className="mt-3 p-3 bg-light rounded">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="mb-0">
              {typeof selectedSlot === 'object' ? selectedSlot.slotIdentifier : 
               slots.find(s => s._id === selectedSlot)?.slotIdentifier}
            </h6>
            <div className="d-flex gap-2">
              {typeof selectedSlot === 'object' && getPriorityBadge(selectedSlot.priority)}
              {showAvailabilityIndicator && getStatusBadge(
                typeof selectedSlot === 'object' ? selectedSlot : 
                slots.find(s => s._id === selectedSlot)
              )}
            </div>
          </div>
          
          {typeof selectedSlot === 'object' && (
            <>
              <p className="text-muted mb-2 small">{selectedSlot.description}</p>
              <div className="row g-2 small">
                <div className="col-md-6">
                  <strong>Due Date:</strong> {' '}
                  {selectedSlot.dueDate ? 
                    new Date(selectedSlot.dueDate).toLocaleDateString() : 
                    'Not set'
                  }
                </div>
                <div className="col-md-6">
                  <strong>Estimated Effort:</strong> {' '}
                  {selectedSlot.estimatedEffort ? `${selectedSlot.estimatedEffort} hours` : 'Not specified'}
                </div>
                {selectedSlot.dependencies && selectedSlot.dependencies.length > 0 && (
                  <div className="col-12">
                    <strong>Dependencies:</strong> {' '}
                    <span className="text-warning">
                      {selectedSlot.dependencies.length} slot(s) must be completed first
                    </span>
                  </div>
                )}
                {selectedSlot.slotConfiguration?.requiresApproval && (
                  <div className="col-12">
                    <Badge bg="info" className="me-2">Requires Approval</Badge>
                  </div>
                )}
              </div>
            </>
          )}
          
          {availabilityStatus[selectedSlot._id || selectedSlot] && (
            <div className="mt-2">
              <small className="text-muted">
                Status: {availabilityStatus[selectedSlot._id || selectedSlot].message}
              </small>
            </div>
          )}
        </div>
      )}

      {/* No Slots Available Message */}
      {!loading && slots.length === 0 && !error && (
        <Alert variant="warning" className="mt-3 mb-0">
          <FaExclamationTriangle className="me-2" />
          No {filterByAvailability ? 'available ' : ''}slots found for this project
        </Alert>
      )}
    </div>
  );
};

export default SlotSelectionDropdown;