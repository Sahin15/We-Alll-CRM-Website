import { useState } from 'react';
import { Modal, Button, Form, Row, Col, Badge, Alert } from 'react-bootstrap';
import { FaClock, FaPlus } from 'react-icons/fa';
import toast from '../../utils/toast';
import { addOvertimeEntry } from '../../api/overtimeApi';

const LogOvertimeModal = ({ show, onHide, attendanceData, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    reason: '',
    taskReference: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleQuickPreset = (hours) => {
    if (!attendanceData?.clockOut) return;

    const clockOutTime = new Date(attendanceData.clockOut);
    const startTime = new Date(clockOutTime.getTime() + 30 * 60000); // 30 min after clock out
    const endTime = new Date(startTime.getTime() + hours * 60 * 60000);

    setFormData({
      ...formData,
      startTime: formatDateTimeLocal(startTime),
      endTime: formatDateTimeLocal(endTime),
    });
  };

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    const hours = (end - start) / (1000 * 60 * 60);
    return hours > 0 ? hours.toFixed(2) : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.startTime || !formData.endTime || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const duration = calculateDuration();
    if (duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    if (duration > 12) {
      toast.error('Overtime duration cannot exceed 12 hours');
      return;
    }

    setLoading(true);
    try {
      await addOvertimeEntry({
        date: attendanceData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        reason: formData.reason,
        taskReference: formData.taskReference,
      });

      toast.success('Overtime logged successfully! Pending approval.');
      setFormData({
        startTime: '',
        endTime: '',
        reason: '',
        taskReference: '',
      });
      onHide();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error logging overtime:', error);
      toast.error(error.response?.data?.message || 'Failed to log overtime');
    } finally {
      setLoading(false);
    }
  };

  const clockOutTime = attendanceData?.clockOut
    ? new Date(attendanceData.clockOut).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaClock className="me-2 text-primary" />
          Log Overtime
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="mb-3">
          <strong>Clock Out Time:</strong> {clockOutTime}
          <br />
          <small>Log any work done after your clock out time. This requires approval from your manager.</small>
        </Alert>

        <Form onSubmit={handleSubmit}>
          {/* Quick Presets */}
          <div className="mb-3">
            <Form.Label className="fw-bold">Quick Presets</Form.Label>
            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleQuickPreset(0.5)}
                type="button"
              >
                30 min
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleQuickPreset(1)}
                type="button"
              >
                1 hour
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleQuickPreset(2)}
                type="button"
              >
                2 hours
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleQuickPreset(3)}
                type="button"
              >
                3 hours
              </Button>
            </div>
          </div>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Start Time <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  End Time <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          {formData.startTime && formData.endTime && (
            <Alert variant="success" className="mb-3">
              <strong>Duration:</strong> {calculateDuration()} hours
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>
              Reason / Description <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g., Urgent social media post for client, Video editing for campaign"
              required
            />
            <Form.Text className="text-muted">
              Describe what work you did during this overtime period
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Task/Project Reference (Optional)</Form.Label>
            <Form.Control
              type="text"
              name="taskReference"
              value={formData.taskReference}
              onChange={handleChange}
              placeholder="e.g., Project name, client name, task ID"
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Log Overtime'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default LogOvertimeModal;
