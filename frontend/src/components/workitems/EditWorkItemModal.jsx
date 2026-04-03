import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import workItemApi from '../../api/workItemApi';

/**
 * EditWorkItemModal - Reusable modal for editing work items
 * Used by both SlotHistory and UnifiedWorkTab for consistency
 * Only shows fields that are available in AssignWorkModal
 */
const EditWorkItemModal = ({ show, onHide, workItem, project, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium'
  });

  // Load work item data when modal opens
  useEffect(() => {
    if (show && workItem) {
      setFormData({
        title: workItem.title || '',
        description: workItem.description || '',
        assignedTo: workItem.assignedTo?._id || '',
        dueDate: workItem.dueDate ? new Date(workItem.dueDate).toISOString().split('T')[0] : '',
        priority: workItem.priority?.toLowerCase() || 'medium'
      });
    }
  }, [show, workItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.assignedTo || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await workItemApi.updateWorkItem(workItem._id, formData);
      toast.success('Work item updated successfully!');
      onHide();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating work item:', error);
      toast.error(error.response?.data?.message || 'Failed to update work item');
    } finally {
      setLoading(false);
    }
  };

  const getTeamMembers = () => {
    const members = project?.assignedUsers || [];
    if (project?.projectHead && !members.find(m => (m._id || m) === project.projectHead._id)) {
      members.unshift(project.projectHead);
    }
    return members;
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Work Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter work item title"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter work item description"
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Assigned To *</Form.Label>
                <Form.Select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  required
                >
                  <option value="">Select team member</option>
                  {getTeamMembers().map(user => (
                    <option key={user._id} value={user._id}>{user.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Due Date *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Priority *</Form.Label>
            <Form.Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              required
            >
              <option value="">Select priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Updating...
            </>
          ) : (
            'Update Work Item'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditWorkItemModal;
