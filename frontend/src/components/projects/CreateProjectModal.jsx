import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import projectApi from '../../api/projectApi';
import clientApi from '../../api/clientApi';
import departmentApi from '../../api/departmentApi';
import userApi from '../../api/userApi';

/**
 * CreateProjectModal Component
 * Modal for creating new projects
 */
const CreateProjectModal = ({ show, onHide, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    department: '',
    projectHead: '',
    status: 'Pending',
    startDate: '',
    endDate: '',
    teamRoles: {} // For role-based team assignments
  });

  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      loadData();
    }
  }, [show]);

  const loadData = async () => {
    try {
      const [clientsRes, deptsRes, usersRes] = await Promise.all([
        clientApi.getAllClients(),
        departmentApi.getAllDepartments(),
        userApi.getAllUsers()
      ]);
      
      // Handle different response formats
      const clientsData = Array.isArray(clientsRes) ? clientsRes : (clientsRes.data || clientsRes.clients || []);
      const deptsData = Array.isArray(deptsRes) ? deptsRes : (deptsRes.data || deptsRes.departments || []);
      const usersData = Array.isArray(usersRes) ? usersRes : (usersRes.data || usersRes.users || []);
      
      setClients(clientsData);
      setDepartments(deptsData);
      setUsers(usersData);
      
      console.log('Loaded data:', { 
        clients: clientsData.length, 
        departments: deptsData.length, 
        users: usersData.length 
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load form data');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // If department changes, reset project head
      if (field === 'department') {
        newData.projectHead = '';
      }
      
      return newData;
    });
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Filter users by selected department
  const availableProjectHeads = formData.department
    ? users.filter(user => {
        // Only show employees from the selected department
        const userDeptId = user.department?._id || user.department;
        return userDeptId === formData.department && 
               (user.role === 'employee' || user.role === 'hod');
      })
    : [];

  // Get department workflow type
  const getDepartmentWorkflowType = () => {
    const selectedDept = departments.find(d => d._id === formData.department);
    if (!selectedDept) return 'standard';
    
    const deptName = selectedDept.name.toLowerCase();
    if (deptName.includes('social') || deptName.includes('marketing')) {
      return 'social-media-advanced';
    }
    return 'standard';
  };

  // Get social media roles for team assignment
  const getSocialMediaRoles = () => [
    { key: 'content-creator', label: 'Content Creator' },
    { key: 'photo-editor', label: 'Photo Editor' },
    { key: 'caption-writer', label: 'Caption Writer' },
    { key: 'ads-specialist', label: 'Ads Specialist' },
    { key: 'posting-manager', label: 'Posting Manager' },
  ];

  // Handle team role assignment
  const handleTeamRoleChange = (roleKey, userId) => {
    setFormData(prev => ({
      ...prev,
      teamRoles: {
        ...prev.teamRoles,
        [roleKey]: userId,
      },
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    if (!formData.projectHead) {
      newErrors.projectHead = 'Project head is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
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
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        department: formData.department,
        projectHead: formData.projectHead,
        status: formData.status,
        startDate: formData.startDate
      };

      if (formData.client) {
        submitData.client = formData.client;
      }
      if (formData.endDate) {
        submitData.endDate = formData.endDate;
      }

      await projectApi.createProject(submitData);
      toast.success('Project created successfully!');

      // Reset form
      setFormData({
        name: '',
        description: '',
        client: '',
        department: '',
        projectHead: '',
        status: 'Pending',
        startDate: '',
        endDate: '',
        teamRoles: {}
      });
      setErrors({});

      if (onSuccess) {
        onSuccess();
      }
      onHide();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      client: '',
      department: '',
      projectHead: '',
      status: 'Pending',
      startDate: '',
      endDate: '',
      teamRoles: {}
    });
    setErrors({});
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Project</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Project Name */}
          <Form.Group className="mb-3">
            <Form.Label>
              Project Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter project name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              isInvalid={!!errors.name}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Description */}
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter project description (optional)"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </Form.Group>

          <Row>
            {/* Client */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Client</Form.Label>
                <Form.Select
                  value={formData.client}
                  onChange={(e) => handleChange('client', e.target.value)}
                >
                  <option value="">Select client (optional)...</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Department */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Department <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  isInvalid={!!errors.department}
                >
                  <option value="">Select department...</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.department}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            {/* Project Head */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Project Head <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.projectHead}
                  onChange={(e) => handleChange('projectHead', e.target.value)}
                  isInvalid={!!errors.projectHead}
                  disabled={!formData.department}
                >
                  <option value="">
                    {!formData.department 
                      ? 'Select department first...' 
                      : availableProjectHeads.length === 0
                      ? 'No employees in this department'
                      : 'Select project head...'}
                  </option>
                  {availableProjectHeads.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.projectHead}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Status */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            {/* Start Date */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Start Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  isInvalid={!!errors.startDate}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.startDate}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* End Date */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  min={formData.startDate}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Team Members Assignment (for Social Media Department) */}
          {formData.department && getDepartmentWorkflowType() === 'social-media-advanced' && (
            <>
              <hr />
              <h6 className="mb-3">Team Role Assignment</h6>
              <p className="text-muted small mb-3">
                Assign team members to specific roles for automated workflow progression
              </p>
              
              {getSocialMediaRoles().map((role) => (
                <Row key={role.key} className="mb-2">
                  <Col md={4}>
                    <Form.Label className="small fw-bold">{role.label}:</Form.Label>
                  </Col>
                  <Col md={8}>
                    <Form.Select
                      size="sm"
                      value={formData.teamRoles?.[role.key] || ''}
                      onChange={(e) => handleTeamRoleChange(role.key, e.target.value)}
                    >
                      <option value="">Select {role.label.toLowerCase()}...</option>
                      {availableProjectHeads.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
              ))}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;
