import { useState } from 'react';
import { Button, ButtonGroup, Modal, Form, Alert } from 'react-bootstrap';
import { FaTimes, FaEdit, FaUserEdit, FaCalendar, FaTrash } from 'react-icons/fa';

/**
 * BulkActionsToolbar Component
 * Toolbar for bulk operations on work items
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
const BulkActionsToolbar = ({ selectedCount, onAction, onCancel }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [formData, setFormData] = useState({});

  const handleOpenModal = (type) => {
    setModalType(type);
    setFormData({});
    setShowModal(true);
  };

  const handleConfirm = () => {
    onAction(modalType, formData);
    setShowModal(false);
    setModalType(null);
    setFormData({});
  };

  const getModalContent = () => {
    switch (modalType) {
      case 'status':
        return (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Update Status</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="info">
                You are about to update the status of {selectedCount} work item{selectedCount > 1 ? 's' : ''}.
              </Alert>
              <Form.Group>
                <Form.Label>New Status</Form.Label>
                <Form.Select
                  value={formData.status || ''}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="">Select status...</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </Form.Select>
              </Form.Group>
            </Modal.Body>
          </>
        );

      case 'assignee':
        return (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Reassign Work Items</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="info">
                You are about to reassign {selectedCount} work item{selectedCount > 1 ? 's' : ''}.
              </Alert>
              <Form.Group>
                <Form.Label>New Assignee</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter user ID or email"
                  value={formData.assignee || ''}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                />
                <Form.Text className="text-muted">
                  Note: In production, this would be a user selector dropdown
                </Form.Text>
              </Form.Group>
            </Modal.Body>
          </>
        );

      case 'dueDate':
        return (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Change Due Date</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="info">
                You are about to change the due date of {selectedCount} work item{selectedCount > 1 ? 's' : ''}.
              </Alert>
              <Form.Group>
                <Form.Label>New Due Date</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </Form.Group>
            </Modal.Body>
          </>
        );

      case 'delete':
        return (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Delete Work Items</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="danger">
                <strong>Warning!</strong> You are about to permanently delete {selectedCount} work item{selectedCount > 1 ? 's' : ''}. This action cannot be undone.
              </Alert>
              <Form.Group>
                <Form.Check
                  type="checkbox"
                  label="I understand this action is permanent"
                  checked={formData.confirmed || false}
                  onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                />
              </Form.Group>
            </Modal.Body>
          </>
        );

      default:
        return null;
    }
  };

  const isConfirmDisabled = () => {
    switch (modalType) {
      case 'status':
        return !formData.status;
      case 'assignee':
        return !formData.assignee;
      case 'dueDate':
        return !formData.dueDate;
      case 'delete':
        return !formData.confirmed;
      default:
        return false;
    }
  };

  return (
    <>
      <div className="bg-primary text-white p-3 mb-3 rounded d-flex justify-content-between align-items-center">
        <div>
          <strong>{selectedCount}</strong> item{selectedCount > 1 ? 's' : ''} selected
        </div>
        <div className="d-flex gap-2">
          <ButtonGroup size="sm">
            <Button
              variant="light"
              onClick={() => handleOpenModal('status')}
              title="Update Status"
            >
              <FaEdit className="me-1" />
              Status
            </Button>
            <Button
              variant="light"
              onClick={() => handleOpenModal('assignee')}
              title="Reassign"
            >
              <FaUserEdit className="me-1" />
              Reassign
            </Button>
            <Button
              variant="light"
              onClick={() => handleOpenModal('dueDate')}
              title="Change Due Date"
            >
              <FaCalendar className="me-1" />
              Due Date
            </Button>
            <Button
              variant="danger"
              onClick={() => handleOpenModal('delete')}
              title="Delete"
            >
              <FaTrash className="me-1" />
              Delete
            </Button>
          </ButtonGroup>
          <Button
            variant="light"
            size="sm"
            onClick={onCancel}
            title="Cancel Selection"
          >
            <FaTimes />
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        {getModalContent()}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant={modalType === 'delete' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BulkActionsToolbar;
