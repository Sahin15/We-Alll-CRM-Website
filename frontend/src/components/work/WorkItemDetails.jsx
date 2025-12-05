import { useState, useEffect } from "react";
import { Modal, Button, Badge, Row, Col, Form, Alert } from "react-bootstrap";
import { FaTimes, FaUser, FaCalendar, FaFlag, FaTasks, FaEdit, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";

const WorkItemDetails = ({ show, onHide, item, type, onUpdate, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (item) {
      if (type === 'slot') {
        // Support both new and legacy status fields
        setStatus(item.status || item.designStatus || 'Pending');
      } else {
        setStatus(item.status || 'todo');
      }
      setIsEditing(false);
    }
  }, [item, type]);

  if (!item) return null;

  // Check if assigned to current user (handle both string and ObjectId comparison)
  const isAssignedToMe = currentUser && item.assignedTo && (
    item.assignedTo._id === currentUser._id ||
    item.assignedTo._id === currentUser.id ||
    item.assignedTo._id?.toString() === currentUser._id?.toString() ||
    item.assignedTo._id?.toString() === currentUser.id?.toString()
  );
  
  const canEdit = isAssignedToMe || ['admin', 'superadmin', 'hod', 'hop'].includes(currentUser?.role);
  
  // Debug logging
  console.log('WorkItemDetails Debug:', {
    itemAssignedTo: item.assignedTo?._id,
    currentUserId: currentUser?._id || currentUser?.id,
    isAssignedToMe,
    canEdit,
    userRole: currentUser?.role
  });

  const getPriorityColor = (priority) => {
    const p = priority?.toLowerCase() || 'normal';
    if (p.includes('urgent') || p === 'urgent') return 'danger';
    if (p.includes('high') || p === 'high') return 'warning';
    if (p.includes('low') || p === 'low') return 'secondary';
    return 'info';
  };

  const getStatusColor = (status) => {
    // Slot statuses
    if (status === 'Approved' || status === 'Posted' || status === 'done') return 'success';
    if (status === 'In Design' || status === 'Ready for Review' || status === 'in-progress' || status === 'review') return 'primary';
    if (status === 'Revision Needed' || status === 'Needs Revision') return 'warning';
    if (status === 'Planned' || status === 'todo') return 'secondary';
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
      await onUpdate(item._id, status, type);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    if (type === 'slot') {
      setStatus(item.designStatus || 'Planned');
    } else {
      setStatus(item.status || 'todo');
    }
    setIsEditing(false);
  };

  // Render slot details
  if (type === 'slot') {
    // Determine available status options based on role and current status
    const isManager = ['admin', 'superadmin', 'hod', 'hop'].includes(currentUser?.role);
    const currentStatus = item.designStatus;
    
    // Employee workflow: Can only submit for review, cannot approve themselves
    const employeeStatusOptions = [
      { value: 'Pending', label: '📋 To Do', disabled: false },
      { value: 'Planned', label: '📋 To Do (Legacy)', disabled: false },
      { value: 'In Progress', label: '⚙️ Working On It', disabled: false },
      { value: 'In Design', label: '⚙️ Working On It (Legacy)', disabled: false },
      { value: 'Review', label: '✅ Submit for Approval', disabled: false },
      { value: 'Ready for Review', label: '✅ Submit for Approval (Legacy)', disabled: false }
    ];
    
    // Manager/HoP/HoD: Can approve or request revision
    const managerStatusOptions = [
      { value: 'Pending', label: '📋 To Do', disabled: false },
      { value: 'Planned', label: '📋 To Do (Legacy)', disabled: false },
      { value: 'In Progress', label: '⚙️ In Progress', disabled: false },
      { value: 'In Design', label: '⚙️ In Progress (Legacy)', disabled: false },
      { value: 'Review', label: '👀 Under Review', disabled: false },
      { value: 'Ready for Review', label: '👀 Under Review (Legacy)', disabled: false },
      { value: 'Revision', label: '🔄 Request Revision', disabled: false },
      { value: 'Revision Needed', label: '🔄 Request Revision (Legacy)', disabled: false },
      { value: 'Approved', label: '✅ Approve & Complete', disabled: false },
      { value: 'Completed', label: '✅ Mark as Completed', disabled: false }
    ];
    
    const statusOptions = isManager ? managerStatusOptions : employeeStatusOptions;
    
    return (
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Badge bg="success" className="me-2">{item.workType || 'Work Assignment'}</Badge>
            {item.title || item.brief || 'Untitled Task'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <div className="d-flex gap-2 mt-2 align-items-center flex-wrap">
              <Badge bg={getStatusColor(item.status || item.designStatus)}>
                {item.status || item.designStatus || 'Pending'}
              </Badge>
              <Badge bg={getPriorityColor(item.priority || item.contentBucket)}>
                {item.priority || item.contentBucket || 'Normal Priority'}
              </Badge>
              {item.approvalStatus && (
                <Badge bg={item.approvalStatus === 'Approved' ? 'success' : item.approvalStatus === 'Rejected' ? 'danger' : 'warning'}>
                  {item.approvalStatus === 'Approved' ? '✅ Approved' : item.approvalStatus === 'Rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
                </Badge>
              )}
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

          {isEditing && (
            <Alert variant="light" className="mb-4">
              <Form.Group className="mb-3">
                <Form.Label>
                  Update Status
                  {isManager && <small className="text-muted ms-2">(Manager: Can approve or request revision)</small>}
                  {!isManager && <small className="text-muted ms-2">(Employee: Submit for review when ready)</small>}
                </Form.Label>
                <Form.Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isUpdating}
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              
              {(status === 'Review' || status === 'Ready for Review') && !isManager && (
                <Alert variant="info" className="mb-3">
                  <small>
                    <strong>📤 Submitting for Approval:</strong> Your work will be sent to HoP/HoD for review. They will either approve it or request revisions.
                  </small>
                </Alert>
              )}
              
              {(status === 'Revision' || status === 'Revision Needed') && isManager && (
                <Alert variant="warning" className="mb-3">
                  <small>
                    <strong>🔄 Requesting Revision:</strong> This will send the work back to the employee with feedback for changes.
                  </small>
                </Alert>
              )}
              
              {(status === 'Approved' || status === 'Completed') && isManager && (
                <Alert variant="success" className="mb-3">
                  <small>
                    <strong>✅ Approving Work:</strong> This will mark the work as completed and update project progress.
                  </small>
                </Alert>
              )}
              
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

          {isAssignedToMe && (
            <Alert variant="info" className="mb-3">
              <small>
                <strong>This content task is assigned to you.</strong> Update the status as you progress.
              </small>
            </Alert>
          )}

          {item.caption && (
            <div className="mb-4">
              <h6 className="text-muted mb-2">Description</h6>
              <p className="mb-0">{item.caption}</p>
            </div>
          )}

          <Row className="g-3 mb-4">
            <Col md={6}>
              <div className="d-flex align-items-start">
                <FaUser className="me-2 mt-1 text-primary" />
                <div>
                  <small className="text-muted d-block">Assigned To</small>
                  <strong>{item.assignedTo?.name || 'Unassigned'}</strong>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div className="d-flex align-items-start">
                <FaTasks className="me-2 mt-1 text-info" />
                <div>
                  <small className="text-muted d-block">Project</small>
                  <strong>{item.project?.name || 'N/A'}</strong>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div className="d-flex align-items-start">
                <FaCalendar className="me-2 mt-1 text-success" />
                <div>
                  <small className="text-muted d-block">Due Date</small>
                  <strong>{formatDate(item.dueDate || item.designDeadline)}</strong>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div className="d-flex align-items-start">
                <FaCalendar className="me-2 mt-1 text-danger" />
                <div>
                  <small className="text-muted d-block">Posting Date</small>
                  <strong>{formatDate(item.postingDate)}</strong>
                  {new Date(item.postingDate) < new Date() && item.designStatus !== 'Approved' && (
                    <Badge bg="danger" className="ms-2">Overdue</Badge>
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {item.occasion && (
            <div className="mb-3">
              <small className="text-muted d-block">Occasion</small>
              <p className="mb-0">{item.occasion}</p>
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
  }

  // Render task details
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <Badge bg="primary" className="me-2">General Task</Badge>
          {item.title || 'Untitled Task'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <div className="d-flex gap-2 mt-2 align-items-center flex-wrap">
            <Badge bg={getStatusColor(item.status)}>
              {item.status === 'todo' ? 'To Do' : 
               item.status === 'in-progress' ? 'In Progress' :
               item.status === 'review' ? 'Review' : 'Done'}
            </Badge>
            <Badge bg={getPriorityColor(item.priority)}>
              {item.priority?.toUpperCase() || 'NORMAL'}
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

        {isEditing && (
          <Alert variant="light" className="mb-4">
            <Form.Group className="mb-3">
              <Form.Label>Update Status</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isUpdating}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
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

        {isAssignedToMe && (
          <Alert variant="info" className="mb-3">
            <small>
              <strong>This task is assigned to you.</strong> Update the status as you progress.
            </small>
          </Alert>
        )}

        {item.description && (
          <div className="mb-4">
            <h6 className="text-muted mb-2">Description</h6>
            <p className="mb-0">{item.description}</p>
          </div>
        )}

        <Row className="g-3 mb-4">
          <Col md={6}>
            <div className="d-flex align-items-start">
              <FaUser className="me-2 mt-1 text-primary" />
              <div>
                <small className="text-muted d-block">Assigned To</small>
                <strong>{item.assignedTo?.name || 'Unassigned'}</strong>
              </div>
            </div>
          </Col>

          <Col md={6}>
            <div className="d-flex align-items-start">
              <FaTasks className="me-2 mt-1 text-info" />
              <div>
                <small className="text-muted d-block">Project</small>
                <strong>{item.project?.name || 'N/A'}</strong>
              </div>
            </div>
          </Col>

          <Col md={6}>
            <div className="d-flex align-items-start">
              <FaCalendar className="me-2 mt-1 text-danger" />
              <div>
                <small className="text-muted d-block">Due Date</small>
                <strong>{formatDate(item.dueDate)}</strong>
                {new Date(item.dueDate) < new Date() && item.status !== 'done' && (
                  <Badge bg="danger" className="ms-2">Overdue</Badge>
                )}
              </div>
            </div>
          </Col>

          {item.estimatedHours > 0 && (
            <Col md={6}>
              <div className="d-flex align-items-start">
                <FaFlag className="me-2 mt-1 text-warning" />
                <div>
                  <small className="text-muted d-block">Estimated Hours</small>
                  <strong>{item.estimatedHours}h</strong>
                </div>
              </div>
            </Col>
          )}
        </Row>

        {item.tags && item.tags.length > 0 && (
          <div className="mb-3">
            <small className="text-muted d-block mb-2">Tags</small>
            <div className="d-flex gap-2 flex-wrap">
              {item.tags.map((tag, index) => (
                <Badge key={index} bg="secondary">{tag}</Badge>
              ))}
            </div>
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

export default WorkItemDetails;
