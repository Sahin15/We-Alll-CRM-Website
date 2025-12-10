import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { FaTasks, FaCalendar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import workItemApi from '../../api/workItemApi';
import projectApi from '../../api/projectApi';
import userApi from '../../api/userApi';

/**
 * CreateWorkItemModal Component
 * Modal for creating new work items (tasks or content)
 * Requirements: 2.2, 2.3, 5.2, 5.3, 5.4, 5.5
 */
const CreateWorkItemModal = ({ show, onHide, onSuccess, defaultProject }) => {
  const [formData, setFormData] = useState({
    type: 'task',
    title: '',
    description: '',
    project: defaultProject || '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
    // Content-specific fields
    platform: '',
    postType: '',
    contentBucket: '',
    tags: ''
  });

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Store all users
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      loadProjects();
      loadUsers();
    }
  }, [show]);

  useEffect(() => {
    if (defaultProject) {
      setFormData((prev) => ({ ...prev, project: defaultProject }));
    }
  }, [defaultProject]);

  const loadProjects = async () => {
    try {
      const response = await projectApi.getAllProjects();
      // Handle different response formats
      const projectList = response.data || response.projects || response || [];
      setProjects(Array.isArray(projectList) ? projectList : []);
      console.log('Loaded projects:', projectList);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      // Handle different response formats
      const userList = response.data || response.users || response || [];
      const validUsers = Array.isArray(userList) ? userList : [];
      
      // Filter only employees and HoDs (not admins, clients, etc.)
      const employeeUsers = validUsers.filter(u => 
        u.role === 'employee' || u.role === 'hod'
      );
      
      setAllUsers(employeeUsers);
      setUsers(employeeUsers); // Initially show all employees
      console.log('Loaded users:', employeeUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  // Filter users when project changes
  useEffect(() => {
    if (formData.project && projects.length > 0 && allUsers.length > 0) {
      const selectedProject = projects.find(p => p._id === formData.project);
      
      if (selectedProject && selectedProject.department) {
        // Get department ID (handle both populated and non-populated)
        const departmentId = typeof selectedProject.department === 'object' 
          ? selectedProject.department._id 
          : selectedProject.department;
        
        // Filter users by department
        const departmentUsers = allUsers.filter(user => {
          const userDeptId = typeof user.department === 'object'
            ? user.department?._id
            : user.department;
          return userDeptId === departmentId;
        });
        
        setUsers(departmentUsers);
        console.log('Filtered users for department:', departmentUsers);
        
        // Clear assignedTo if current selection is not in filtered list
        if (formData.assignedTo && !departmentUsers.find(u => u._id === formData.assignedTo)) {
          setFormData(prev => ({ ...prev, assignedTo: '' }));
        }
      } else {
        // No department, show all employees
        setUsers(allUsers);
      }
    }
  }, [formData.project, projects, allUsers]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      type,
      // Clear content-specific fields when switching to task
      ...(type === 'task' && {
        platform: '',
        postType: '',
        contentBucket: ''
      })
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields for all types
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Assignee is required';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    if (!formData.project) {
      newErrors.project = 'Project is required';
    }

    // Content-specific required fields
    if (formData.type === 'content') {
      if (!formData.platform) {
        newErrors.platform = 'Platform is required for content items';
      }
      if (!formData.postType) {
        newErrors.postType = 'Post type is required for content items';
      }
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
      // Prepare data for submission
      const submitData = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        project: formData.project,
        assignedTo: formData.assignedTo,
        priority: formData.priority,
        dueDate: formData.dueDate,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : []
      };

      // Add content-specific fields
      if (formData.type === 'content') {
        submitData.platform = formData.platform;
        submitData.postType = formData.postType;
        if (formData.contentBucket) {
          submitData.contentBucket = formData.contentBucket;
        }
      }

      await workItemApi.createWorkItem(submitData);
      toast.success('Work item created successfully!');
      
      // Reset form
      setFormData({
        type: 'task',
        title: '',
        description: '',
        project: defaultProject || '',
        assignedTo: '',
        priority: 'medium',
        dueDate: '',
        platform: '',
        postType: '',
        contentBucket: '',
        tags: ''
      });
      setErrors({});

      if (onSuccess) {
        onSuccess();
      }
      onHide();
    } catch (error) {
      console.error('Error creating work item:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || error.message 
        || 'Failed to create work item';
      
      toast.error(errorMessage);
      
      // If there are validation errors, show them
      if (error.response?.data?.error?.details) {
        console.error('Validation errors:', error.response.data.error.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      type: 'task',
      title: '',
      description: '',
      project: defaultProject || '',
      assignedTo: '',
      priority: 'medium',
      dueDate: '',
      platform: '',
      postType: '',
      contentBucket: '',
      tags: ''
    });
    setErrors({});
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Work Item</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Type Selection */}
          <Form.Group className="mb-3">
            <Form.Label>
              Type <span className="text-danger">*</span>
            </Form.Label>
            <div className="d-flex gap-3">
              <Form.Check
                type="radio"
                id="type-task"
                label={
                  <span>
                    <FaTasks className="me-2" />
                    Task
                  </span>
                }
                checked={formData.type === 'task'}
                onChange={() => handleTypeChange('task')}
              />
              <Form.Check
                type="radio"
                id="type-content"
                label={
                  <span>
                    <FaCalendar className="me-2" />
                    Content
                  </span>
                }
                checked={formData.type === 'content'}
                onChange={() => handleTypeChange('content')}
              />
            </div>
          </Form.Group>

          {/* Title */}
          <Form.Group className="mb-3">
            <Form.Label>
              Title <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter work item title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              isInvalid={!!errors.title}
            />
            <Form.Control.Feedback type="invalid">
              {errors.title}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Description */}
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter description (optional)"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </Form.Group>

          <Row>
            {/* Project */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Project <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.project}
                  onChange={(e) => handleChange('project', e.target.value)}
                  isInvalid={!!errors.project}
                >
                  <option value="">Select project...</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.project}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Assignee */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Assign To <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.assignedTo}
                  onChange={(e) => handleChange('assignedTo', e.target.value)}
                  isInvalid={!!errors.assignedTo}
                >
                  <option value="">Select assignee...</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.assignedTo}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            {/* Priority */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Due Date */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Due Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  isInvalid={!!errors.dueDate}
                  min={new Date().toISOString().split('T')[0]}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.dueDate}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Content-Specific Fields */}
          {formData.type === 'content' && (
            <>
              <Alert variant="info" className="mb-3">
                <small>
                  Content items require additional information about the platform
                  and post type.
                </small>
              </Alert>

              <Row>
                {/* Platform */}
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Platform <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      value={formData.platform}
                      onChange={(e) => handleChange('platform', e.target.value)}
                      isInvalid={!!errors.platform}
                    >
                      <option value="">Select platform...</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Twitter">Twitter</option>
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Website">Website</option>
                      <option value="Blog">Blog</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.platform}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                {/* Post Type */}
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Post Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      value={formData.postType}
                      onChange={(e) => handleChange('postType', e.target.value)}
                      isInvalid={!!errors.postType}
                    >
                      <option value="">Select post type...</option>
                      <option value="Post">Post</option>
                      <option value="Story">Story</option>
                      <option value="Reel">Reel</option>
                      <option value="Carousel">Carousel</option>
                      <option value="Video">Video</option>
                      <option value="Article">Article</option>
                      <option value="Infographic">Infographic</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.postType}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              {/* Content Bucket */}
              <Form.Group className="mb-3">
                <Form.Label>Content Bucket</Form.Label>
                <Form.Select
                  value={formData.contentBucket}
                  onChange={(e) => handleChange('contentBucket', e.target.value)}
                >
                  <option value="">Select content bucket (optional)...</option>
                  <option value="Educational">Educational</option>
                  <option value="Promotional">Promotional</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Awareness">Awareness</option>
                  <option value="Entertainment">Entertainment</option>
                </Form.Select>
              </Form.Group>
            </>
          )}

          {/* Tags */}
          <Form.Group className="mb-3">
            <Form.Label>Tags</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter tags separated by commas (optional)"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
            />
            <Form.Text className="text-muted">
              Example: urgent, client-request, marketing
            </Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Work Item'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateWorkItemModal;
