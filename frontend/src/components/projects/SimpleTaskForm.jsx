import { useState } from "react";
import { Modal, Form, Button, Row, Col, Alert } from "react-bootstrap";
import { FaSave, FaTimes } from "react-icons/fa";

const SimpleTaskForm = ({ show, onHide, onSubmit, project, employees = [] }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    startDate: "",
    dueDate: "",
    priority: "medium",
    status: "todo"
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Task title is required";
    if (!formData.assignedTo) newErrors.assignedTo = "Please assign to someone";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";

    // Validate dates
    if (formData.startDate && formData.dueDate) {
      const start = new Date(formData.startDate);
      const due = new Date(formData.dueDate);
      if (start > due) {
        newErrors.startDate = "Start date must be before due date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert to slot format for backend compatibility
      const taskData = {
        brief: formData.title,
        caption: formData.description,
        assignedTo: formData.assignedTo,
        designDeadline: formData.startDate || formData.dueDate,
        postingDate: formData.dueDate,
        designStatus: formData.status === 'todo' ? 'Planned' : 
                      formData.status === 'in-progress' ? 'In Design' :
                      formData.status === 'review' ? 'Ready for Review' :
                      formData.status === 'completed' ? 'Approved' : 'Planned',
        postingStatus: formData.status === 'completed' ? 'Posted' : 'Scheduled',
        // Set minimal required fields for backend with valid enum values
        postType: 'Text Post', // Valid enum value
        platforms: ['Facebook'], // Valid enum value (using Facebook as default)
        contentBucket: formData.priority === 'urgent' ? 'Promotional Offer' :
                       formData.priority === 'high' ? 'Brand Promotion' :
                       'Educational Content' // All valid enum values
      };

      await onSubmit(taskData);
      handleClose();
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      assignedTo: "",
      startDate: "",
      dueDate: "",
      priority: "medium",
      status: "todo"
    });
    setErrors({});
    setIsSubmitting(false);
    onHide();
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Create New Task</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {project && (
            <Alert variant="info" className="mb-3">
              <strong>Project:</strong> {project.name}
              <br />
              <strong>Client:</strong> {project.client?.name || 'N/A'}
            </Alert>
          )}

          <Row className="g-3">
            {/* Task Title */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Task Title <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Design homepage mockup, Fix login bug, Create report"
                  isInvalid={!!errors.title}
                />
                <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Description */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what needs to be done..."
                />
              </Form.Group>
            </Col>

            {/* Assigned To */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Assign To <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  isInvalid={!!errors.assignedTo}
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} - {emp.designation || emp.role}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.assignedTo}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Priority */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Start Date */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={getTodayDate()}
                  isInvalid={!!errors.startDate}
                />
                <Form.Control.Feedback type="invalid">{errors.startDate}</Form.Control.Feedback>
                <Form.Text className="text-muted">Optional - When to start working</Form.Text>
              </Form.Group>
            </Col>

            {/* Due Date */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Due Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  min={formData.startDate || getTodayDate()}
                  isInvalid={!!errors.dueDate}
                />
                <Form.Control.Feedback type="invalid">{errors.dueDate}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Status */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="completed">Completed</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            <FaTimes className="me-2" />
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Creating...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Create Task
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default SimpleTaskForm;
