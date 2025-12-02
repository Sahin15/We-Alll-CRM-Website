import { useState, useEffect } from "react";
import { Modal, Button, Badge, Row, Col, Form, Alert } from "react-bootstrap";
import { FaTimes, FaUser, FaCalendar, FaFlag, FaTasks, FaEdit, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";

const SimpleTaskDetails = ({ show, onHide, slot, onUpdate, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(slot?.designStatus || 'Planned');
  const [isUpdating, setIsUpdating] = useState(false);

  // Update status when slot changes
  useEffect(() => {
    if (slot) {
      setStatus(slot.designStatus || 'Planned');
      setIsEditing(false);
    }
  }, [slot]);

  if (!slot) return null;

  const isAssignedToMe = currentUser && slot.assignedTo?._id === currentUser._id;
  const canEdit = isAssignedToMe || ['admin', 'superadmin', 'hod'].includes(currentUser?.role);

  const getPriorityColor = (priority) => {
    const p = priority?.toLowerCase() || 'normal';
    if (p.includes('urgent')) return 'danger';
    if (p.includes('high')) return 'warning';
    if (p.includes('low')) return 'secondary';
    return 'info';
  };

  const getStatusColor = (status) => {
    if (status === 'Approved' || status === 'Posted') return 'success';
    if (status === 'In Design' || status === 'Ready for Review') return 'primary';
    if (status === 'Needs Revision') return 'warning';
    return 'secondary';
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleStatusUpdate = async () => {
    if (!onUpdate) {
      toast.error('Update function not available');
      return;
    }

    setIsUpdating(true);
    try {
      const updatedSlot = {
        ...slot,
        designStatus: status,
        postingStatus: status === 'Approved' ? 'Posted' : 'Scheduled'
      };
      
      await onUpdate(updatedSlot);
      setIsEditing(false);
      // Success toast is shown by parent component
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update task status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setStatus(slot.designStatus || 'Planned');
    setIsEditing(false);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Task Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Task Title */}
        <div className="mb-4">
          <h4>{slot.brief || 'Untitled Task'}</h4>
          <div className="d-flex gap-2 mt-2 align-items-center flex-wrap">
            <Badge bg={getStatusColor(slot.designStatus)}>
              {slot.designStatus || 'Planned'}
            </Badge>
            <Badge bg={getPriorityColor(slot.contentBucket)}>
              {slot.contentBucket || 'Normal Priority'}
            </Badge>
            {canEdit && !isEditing && (
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <FaEdit className="me-1" />
                Update Status
              </Button>
            )}
          </div>
        </div>

        {/* Status Update Section */}
        {isEditing && (
          <Alert variant="light" className="mb-4">
            <Form.Group className="mb-3">
              <Form.Label>Update Task Status</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isUpdating}
              >
                <option value="Planned">To Do</option>
                <option value="In Design">In Progress</option>
                <option value="Ready for Review">Ready for Review</option>
                <option value="Needs Revision">Needs Revision</option>
                <option value="Approved">Completed</option>
              </Form.Select>
            </Form.Group>
            <div className="d-flex gap-2">
              <Button 
                variant="success" 
                size="sm"
                onClick={handleStatusUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FaSave className="me-1" />
                    Save
                  </>
                )}
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                Cancel
              </Button>
            </div>
          </Alert>
        )}

        {/* Info for assigned user */}
        {isAssignedToMe && (
          <Alert variant="info" className="mb-3">
            <small>
              <strong>This task is assigned to you.</strong> You can update the status as you progress.
            </small>
          </Alert>
        )}

        {/* Description */}
        {slot.caption && (
          <div className="mb-4">
            <h6 className="text-muted mb-2">Description</h6>
            <p className="mb-0">{slot.caption}</p>
          </div>
        )}

        {/* Task Info */}
        <Row className="g-3 mb-4">
          <Col md={6}>
            <div className="d-flex align-items-start">
              <FaUser className="me-2 mt-1 text-primary" />
              <div>
                <small className="text-muted d-block">Assigned To</small>
                <strong>{slot.assignedTo?.name || 'Unassigned'}</strong>
                {slot.assignedTo?.designation && (
                  <div>
                    <small className="text-muted">{slot.assignedTo.designation}</small>
                  </div>
                )}
              </div>
            </div>
          </Col>

          <Col md={6}>
            <div className="d-flex align-items-start">
              <FaTasks className="me-2 mt-1 text-info" />
              <div>
                <small className="text-muted d-block">Project</small>
                <strong>{slot.project?.name || 'N/A'}</strong>
              </div>
            </div>
          </Col>

          <Col md={6}>
            <div className="d-flex align-items-start">
              <FaCalendar className="me-2 mt-1 text-success" />
              <div>
                <small className="text-muted d-block">Start Date</small>
                <strong>{formatDate(slot.designDeadline)}</strong>
              </div>
            </div>
          </Col>

          <Col md={6}>
            <div className="d-flex align-items-start">
              <FaCalendar className="me-2 mt-1 text-danger" />
              <div>
                <small className="text-muted d-block">Due Date</small>
                <strong>{formatDate(slot.postingDate)}</strong>
                {new Date(slot.postingDate) < new Date() && slot.designStatus !== 'Approved' && (
                  <Badge bg="danger" className="ms-2">Overdue</Badge>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* Additional Info */}
        {slot.occasion && (
          <div className="mb-3">
            <small className="text-muted d-block">Notes</small>
            <p className="mb-0">{slot.occasion}</p>
          </div>
        )}

        {/* Created By */}
        {slot.createdBy && (
          <div className="mt-4 pt-3 border-top">
            <small className="text-muted">
              Created by {slot.createdBy.name} on {formatDate(slot.createdAt)}
            </small>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <FaTimes className="me-2" />
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SimpleTaskDetails;
