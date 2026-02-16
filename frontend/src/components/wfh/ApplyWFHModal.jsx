import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { applyWFH } from '../../api/wfhApi';

const ApplyWFHModal = ({ show, onHide, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await applyWFH(formData.date, formData.reason.trim());
      toast.success('WFH request submitted successfully!');
      
      // Reset form
      setFormData({ date: '', reason: '' });
      setErrors({});
      
      if (onSuccess) {
        onSuccess();
      }
      onHide();
    } catch (error) {
      console.error('Error applying for WFH:', error);
      toast.error(error.response?.data?.message || 'Failed to submit WFH request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ date: '', reason: '' });
    setErrors({});
    onHide();
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal show={show} onHide={handleCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Apply for Work From Home</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <small>
              <strong>Note:</strong> You can apply for WFH on the same day before starting work. 
              All office rules apply - same clock-in/out times, same working hours.
            </small>
          </Alert>

          {/* Date */}
          <Form.Group className="mb-3">
            <Form.Label>
              Date <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              min={today}
              isInvalid={!!errors.date}
            />
            <Form.Control.Feedback type="invalid">
              {errors.date}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              You can select today or any future date
            </Form.Text>
          </Form.Group>

          {/* Reason */}
          <Form.Group className="mb-3">
            <Form.Label>
              Reason <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter reason for working from home (minimum 10 characters)"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              isInvalid={!!errors.reason}
            />
            <Form.Control.Feedback type="invalid">
              {errors.reason}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {formData.reason.length}/10 characters minimum
            </Form.Text>
          </Form.Group>

          <Alert variant="warning" className="mb-0">
            <small>
              <strong>Remember:</strong>
              <ul className="mb-0 mt-2">
                <li>Clock in and out at regular times</li>
                <li>Be available during working hours</li>
                <li>Attend all scheduled meetings</li>
                <li>Complete your assigned tasks</li>
              </ul>
            </small>
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ApplyWFHModal;
