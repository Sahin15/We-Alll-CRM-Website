import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import workItemApi from '../../api/workItemApi';

/**
 * EditWorkItemModal - Reusable modal for editing work items with change tracking
 * Used by both SlotHistory and UnifiedWorkTab for consistency
 * Tracks all changes and sends notifications to team
 */
const EditWorkItemModal = ({ show, onHide, workItem, project, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    estimatedHours: '',
    editReason: ''
  });
  const [editSummary, setEditSummary] = useState(null);

  // Load work item data when modal opens
  useEffect(() => {
    if (show && workItem) {
      setFormData({
        title: workItem.title || '',
        description: workItem.description || '',
        priority: workItem.priority?.toLowerCase() || 'medium',
        dueDate: workItem.dueDate ? new Date(workItem.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: workItem.estimatedHours || '',
        editReason: ''
      });
      setEditSummary(null);
    }
  }, [show, workItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.dueDate) {
      toast.error('Please fill in title and due date');
      return;
    }

    try {
      setLoading(true);
      
      // Use the new edit endpoint with change tracking
      const response = await workItemApi.editWorkItem(workItem._id, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
        editReason: formData.editReason || undefined
      });
      
      // Show edit summary
      if (response?.editSummary) {
        setEditSummary(response.editSummary);
        toast.success(`✏️ Work item updated! ${response.editSummary.changeCount} field(s) changed`);
      } else {
        toast.success('Work item updated successfully!');
      }
      
      // Close modal after a short delay to show the summary
      setTimeout(() => {
        onHide();
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);
    } catch (error) {
      console.error('Error updating work item:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update work item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
        <Modal.Title>✏️ Edit Work Item</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '1.5rem' }}>
        {editSummary && (
          <Alert variant="success" className="mb-3">
            <strong>✓ Changes Tracked!</strong>
            <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
              Fields changed: {editSummary.fieldsChanged.join(', ')}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
              Notifications sent to team members
            </div>
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Title *</strong></Form.Label>
            <Form.Control
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter work item title"
              required
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Description</strong></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter work item description"
              disabled={loading}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><strong>Priority *</strong></Form.Label>
                <Form.Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  required
                  disabled={loading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><strong>Due Date *</strong></Form.Label>
                <Form.Control
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label><strong>Estimated Hours</strong></Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              placeholder="Enter estimated hours"
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Why are you editing this?</strong> <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>(Optional)</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={formData.editReason}
              onChange={(e) => setFormData({ ...formData, editReason: e.target.value })}
              placeholder="e.g., Client requested changes, Updated based on feedback, etc."
              disabled={loading}
            />
            <Form.Text className="text-muted">
              💡 This reason will be visible in the edit history to all team members
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer style={{ background: '#f8f9fa', borderTop: '2px solid #e9ecef' }}>
        <Button variant="secondary" onClick={onHide} disabled={loading} style={{ borderRadius: '6px', padding: '8px 20px' }}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading} style={{ borderRadius: '6px', padding: '8px 20px' }}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" style={{ width: '12px', height: '12px' }} />
              Saving Changes...
            </>
          ) : (
            '✓ Save Changes'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditWorkItemModal;
