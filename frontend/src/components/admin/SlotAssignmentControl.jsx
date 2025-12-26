import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Button, 
  Spinner, 
  Badge, 
  OverlayTrigger, 
  Tooltip,
  Dropdown,
  ButtonGroup
} from 'react-bootstrap';
import { 
  FaCheck, 
  FaTimes, 
  FaEdit, 
  FaTrash,
  FaExclamationTriangle,
  FaProjectDiagram
} from 'react-icons/fa';
import projectApi from '../../api/projectApi';

/**
 * Inline Slot Assignment Control Component
 * Provides inline slot assignment functionality within the data table
 */
const SlotAssignmentControl = ({
  workItem,
  onSlotAssignment,
  onSlotRelease,
  loading = false,
  disabled = false,
  compact = false
}) => {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  // Load available slots when editing starts
  useEffect(() => {
    if (isEditing && workItem.project?._id) {
      loadAvailableSlots();
    }
  }, [isEditing, workItem.project?._id]);

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      const response = await projectApi.getAvailableSlots(workItem.project._id);
      
      if (response.success) {
        setAvailableSlots(response.data?.slots || []);
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleAssignSlot = async () => {
    if (!selectedSlot) return;
    
    try {
      await onSlotAssignment(workItem._id, selectedSlot);
      setIsEditing(false);
      setSelectedSlot('');
    } catch (error) {
      console.error('Error assigning slot:', error);
    }
  };

  const handleReleaseSlot = async () => {
    try {
      await onSlotRelease(workItem._id, 'Manual release from admin panel');
      setIsEditing(false);
    } catch (error) {
      console.error('Error releasing slot:', error);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSelectedSlot('');
  };

  // Current slot assignment display
  const currentSlot = workItem.slotAssignment;
  const hasSlotAssignment = currentSlot?.slotNumber;

  if (compact) {
    // Compact view for mobile or small spaces
    return (
      <div className="slot-assignment-control compact">
        {hasSlotAssignment ? (
          <Badge bg="info" className="slot-number-badge">
            {currentSlot.slotNumber}
          </Badge>
        ) : (
          <Badge bg="light" className="text-muted">
            No Slot
          </Badge>
        )}
      </div>
    );
  }

  if (isEditing) {
    // Editing mode
    return (
      <div className="slot-assignment-control editing">
        <div className="d-flex align-items-center gap-2">
          {loadingSlots ? (
            <Spinner size="sm" />
          ) : (
            <Form.Select
              size="sm"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="slot-assignment-dropdown"
              disabled={loading}
            >
              <option value="">Select Slot...</option>
              {availableSlots.map(slot => (
                <option key={slot._id} value={slot._id}>
                  Slot {slot.slotNumber}
                </option>
              ))}
            </Form.Select>
          )}
          
          <ButtonGroup size="sm">
            <Button
              variant="success"
              onClick={handleAssignSlot}
              disabled={!selectedSlot || loading || loadingSlots}
              className="slot-assignment-button"
            >
              {loading ? <Spinner size="sm" /> : <FaCheck />}
            </Button>
            <Button
              variant="secondary"
              onClick={cancelEdit}
              disabled={loading}
              className="slot-assignment-button"
            >
              <FaTimes />
            </Button>
          </ButtonGroup>
        </div>
        
        {availableSlots.length === 0 && !loadingSlots && (
          <small className="text-warning d-block mt-1">
            <FaExclamationTriangle size={10} /> No available slots
          </small>
        )}
      </div>
    );
  }

  // Display mode
  return (
    <div className="slot-assignment-control display">
      <div className="d-flex align-items-center gap-2">
        {hasSlotAssignment ? (
          <>
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip>
                  Slot {currentSlot.slotNumber}
                  <br />Status: {currentSlot.slotStatus}
                  {currentSlot.assignedAt && (
                    <>
                      <br />Assigned: {new Date(currentSlot.assignedAt).toLocaleDateString()}
                    </>
                  )}
                </Tooltip>
              }
            >
              <Badge bg="info" className="slot-number-badge">
                {currentSlot.slotNumber}
              </Badge>
            </OverlayTrigger>
            
            <Dropdown size="sm">
              <Dropdown.Toggle 
                variant="outline-secondary" 
                size="sm"
                className="slot-assignment-button"
                disabled={loading}
              >
                <FaProjectDiagram size={10} />
              </Dropdown.Toggle>
              
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setIsEditing(true)}>
                  <FaEdit size={10} className="me-1" /> Reassign
                </Dropdown.Item>
                <Dropdown.Item onClick={handleReleaseSlot}>
                  <FaTrash size={10} className="me-1" /> Release
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </>
        ) : (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={loading || !workItem.project?._id}
            className="slot-assignment-button"
          >
            <FaProjectDiagram size={10} className="me-1" />
            Assign Slot
          </Button>
        )}
      </div>
    </div>
  );
};

export default SlotAssignmentControl;