import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import projectApi from '../../api/projectApi';
import clientApi from '../../api/clientApi';
import departmentApi from '../../api/departmentApi';
import userApi from '../../api/userApi';

/**
 * CreateProjectModal Component
 * Modal for creating new projects or editing existing ones
 */
const CreateProjectModal = ({ show, onHide, onSuccess, editProject = null }) => {
  const isEditMode = !!editProject;
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    departments: [], // Changed to support multiple departments
    projectHead: '', // Required
    status: 'Pending',
    priority: 'medium', // Add priority field
    budget: '', // Add budget field
    startDate: '',
    teamRoles: {}, // For role-based team assignments
    // Slot system configuration - ALWAYS 20 slots per month
    enableSlotSystem: true,
    totalSlots: 20,
    slotType: 'generic',
    calculationMethod: 'slot-based'
  });

  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      loadData();
      
      // Populate form data for edit mode
      if (isEditMode && editProject) {
        setFormData({
          name: editProject.name || '',
          description: editProject.description || '',
          client: editProject.client?._id || editProject.client || '',
          departments: Array.isArray(editProject.departments) 
            ? editProject.departments.map(d => d._id || d)
            : editProject.department ? [editProject.department._id || editProject.department] : [],
          projectHead: editProject.projectHead?._id || editProject.projectHead || '',
          status: editProject.status || 'Pending',
          priority: editProject.priority || 'medium',
          budget: editProject.budget || '',
          startDate: editProject.startDate ? new Date(editProject.startDate).toISOString().split('T')[0] : '',
          teamRoles: {},
          enableSlotSystem: true, // Always true
          totalSlots: 20, // Always 20 slots per month
          slotType: 'generic',
          calculationMethod: 'slot-based' // Always slot-based
        });
      } else {
        // Reset form for create mode
        setFormData({
          name: '',
          description: '',
          client: '',
          departments: [],
          projectHead: '',
          status: 'Pending',
          priority: 'medium',
          budget: '',
          startDate: '',
          teamRoles: {},
          enableSlotSystem: true, // Always true
          totalSlots: 20, // Always 20 slots per month
          slotType: 'generic',
          calculationMethod: 'slot-based' // Always slot-based
        });
      }
    }
  }, [show, isEditMode, editProject]);

  const loadData = async () => {
    try {
      const [clientsResult, deptsResult, usersResult] = await Promise.allSettled([
        clientApi.getAllClients(),
        departmentApi.getAllDepartments(),
        userApi.getAllUsers({ status: 'active', limit: 1000 }),
      ]);

      const clientsRes = clientsResult.status === 'fulfilled' ? clientsResult.value : [];
      let deptsRes = deptsResult.status === 'fulfilled' ? deptsResult.value : [];
      if (deptsResult.status === 'rejected' && deptsResult.reason?.response?.status === 403) {
        try {
          deptsRes = await departmentApi.getDepartmentDirectory();
        } catch {
          deptsRes = [];
        }
      }
      const usersRes = usersResult.status === 'fulfilled' ? usersResult.value : [];

      const clientsData = Array.isArray(clientsRes) ? clientsRes : (clientsRes.data || clientsRes.clients || []);
      const deptsData = Array.isArray(deptsRes) ? deptsRes : (deptsRes.data || deptsRes.departments || []);
      const usersData = Array.isArray(usersRes) ? usersRes : (usersRes.data || usersRes.users || []);

      setClients(clientsData);
      setDepartments(deptsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load form data: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // If departments change, reset project head
      if (field === 'departments') {
        newData.projectHead = '';
      }
      
      return newData;
    });
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Handle multiple department selection
  const handleDepartmentChange = (departmentId, isChecked) => {
    setFormData(prev => {
      const newDepartments = isChecked 
        ? [...prev.departments, departmentId]
        : prev.departments.filter(id => id !== departmentId);
      
      return {
        ...prev,
        departments: newDepartments,
        projectHead: '' // Reset project head when departments change
      };
    });
    
    if (errors.departments) {
      setErrors(prev => ({ ...prev, departments: null }));
    }
  };

  // Filter users by selected departments
  const availableProjectHeads = formData.departments.length > 0
    ? users.filter(user => {
        // Show employees from any of the selected departments
        const userDeptId = user.department?._id || user.department;
        return formData.departments.includes(userDeptId) && 
               (user.role === 'employee' || user.role === 'hod');
      })
    : [];

  // Check if team assignment should be shown (when multiple departments are selected)
  const shouldShowTeamAssignment = () => {
    return formData.departments.length > 0;
  };

  // Get roles based on selected departments/services
  const getRolesByDepartments = () => {
    const selectedDepts = departments.filter(d => formData.departments.includes(d._id));
    const rolesByDepartment = {};
    
    selectedDepts.forEach(dept => {
      const deptName = dept.name.toLowerCase();
      
      if (deptName.includes('development') || deptName.includes('tech')) {
        rolesByDepartment[dept.name] = [
          { key: 'frontend-developer', label: 'Frontend Developer' },
          { key: 'backend-developer', label: 'Backend Developer' },
          { key: 'fullstack-developer', label: 'Fullstack Developer' },
          { key: 'qa-tester', label: 'QA Tester' },
          { key: 'developer', label: 'General Developer' },
        ];
      }
      else if (deptName.includes('design') || deptName.includes('graphic')) {
        rolesByDepartment[dept.name] = [
          { key: 'ui-designer', label: 'UI Designer' },
          { key: 'ux-designer', label: 'UX Designer' },
          { key: 'graphic-designer', label: 'Graphic Designer' },
          { key: 'video-editor', label: 'Video Editor' },
          { key: 'designer', label: 'General Designer' },
        ];
      }
      else if (deptName.includes('social') || deptName.includes('marketing')) {
        rolesByDepartment[dept.name] = [
          { key: 'social-media-manager', label: 'Social Media Manager' },
          { key: 'content-creator', label: 'Content Creator' },
          { key: 'copywriter', label: 'Copywriter' },
          { key: 'ads-specialist', label: 'Ads Specialist' },
          { key: 'caption-writer', label: 'Caption Writer' },
          { key: 'photo-editor', label: 'Photo Editor' },
          { key: 'video-creator', label: 'Video Creator' },
          { key: 'posting-manager', label: 'Posting Manager' },
          { key: 'community-manager', label: 'Community Manager' },
        ];
      }
      else if (deptName.includes('content') || deptName.includes('writing')) {
        rolesByDepartment[dept.name] = [
          { key: 'content-writer', label: 'Content Writer' },
          { key: 'seo-specialist', label: 'SEO Specialist' },
          { key: 'blog-writer', label: 'Blog Writer' },
          { key: 'copywriter', label: 'Copywriter' },
        ];
      }
      else {
        // Generic roles for other departments
        rolesByDepartment[dept.name] = [
          { key: 'project-coordinator', label: 'Project Coordinator' },
          { key: 'client-liaison', label: 'Client Liaison' },
          { key: 'other', label: 'Other Role' },
        ];
      }
    });
    
    return rolesByDepartment;
  };

  // Handle team role assignment
  const handleTeamRoleChange = (departmentName, roleKey, userId) => {
    setFormData(prev => ({
      ...prev,
      teamRoles: {
        ...prev.teamRoles,
        [`${departmentName}__${roleKey}`]: userId, // Use __ as separator to avoid conflicts with role names
      },
    }));
  };

  // Get users filtered by specific department
  const getUsersByDepartment = (departmentId) => {
    return availableProjectHeads.filter(user => {
      const userDeptId = typeof user.department === 'object'
        ? user.department?._id
        : user.department;
      return userDeptId === departmentId;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    if (formData.departments.length === 0) {
      newErrors.departments = 'At least one service is required';
    }
    if (!formData.projectHead) {
      newErrors.projectHead = 'Project Manager is required';
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
        departments: formData.departments, // Send multiple departments
        projectHead: formData.projectHead, // Required
        status: formData.status,
        startDate: formData.startDate,
        // Slot system configuration - properly nested
        slotConfiguration: {
          enableSlotSystem: formData.enableSlotSystem,
          totalSlots: parseInt(formData.totalSlots) || 10,
          slotType: formData.slotType || 'generic',
          autoCreateSlots: formData.enableSlotSystem,
          allowDynamicSlots: true,
          slotNamingPattern: 'Slot {number}'
        },
        progressTracking: {
          calculationMethod: formData.enableSlotSystem ? 'slot-based' : 'manual',
          totalSlots: parseInt(formData.totalSlots) || 10,
          completedSlots: 0,
          progressPercentage: 0
        }
      };

      if (formData.client) {
        submitData.client = formData.client;
      }
      if (formData.priority) {
        submitData.priority = formData.priority;
      }
      if (formData.budget) {
        submitData.budget = parseFloat(formData.budget);
      }
      
      // Add team roles if any are assigned
      if (Object.keys(formData.teamRoles).length > 0) {
        // Convert team roles to the format expected by backend
        const teamMembers = [];
        Object.entries(formData.teamRoles).forEach(([roleKey, userId]) => {
          if (userId) {
            const [departmentName, role] = roleKey.split('__'); // Use __ as separator
            teamMembers.push({
              user: userId,
              role: role,
              departmentName: departmentName
            });
          }
        });
        
        if (teamMembers.length > 0) {
          submitData.teamMembers = teamMembers;
        }
      }

      if (isEditMode) {
        await projectApi.updateProject(editProject._id, submitData);
        toast.success('Project updated successfully!');
      } else {
        await projectApi.createProject(submitData);
        toast.success('Project created successfully!');
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        client: '',
        departments: [], // Reset to empty array
        projectHead: '',
        status: 'Pending',
        priority: 'medium', // Reset priority
        budget: '', // Reset budget
        startDate: '',
        teamRoles: {}, // Reset team roles
        // Reset slot system fields - always 20 slots
        enableSlotSystem: true,
        totalSlots: 20,
        slotType: 'generic',
        calculationMethod: 'slot-based'
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
      departments: [], // Reset to empty array
      projectHead: '',
      status: 'Pending',
      priority: 'medium', // Reset priority
      budget: '', // Reset budget
      startDate: '',
      teamRoles: {}, // Reset team roles
      // Slot system fields - always 20 slots
      enableSlotSystem: true,
      totalSlots: 20,
      slotType: 'generic',
      calculationMethod: 'slot-based'
    });
    setErrors({});
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEditMode ? 'Edit Project' : 'Create New Project'}</Modal.Title>
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

            {/* Services (Multiple Departments) */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Services Required <span className="text-danger">*</span>
                </Form.Label>
                <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {departments.map((dept) => (
                    <Form.Check
                      key={dept._id}
                      type="checkbox"
                      id={`dept-${dept._id}`}
                      label={dept.name}
                      checked={formData.departments.includes(dept._id)}
                      onChange={(e) => handleDepartmentChange(dept._id, e.target.checked)}
                      className="mb-1"
                    />
                  ))}
                  {departments.length === 0 && (
                    <small className="text-muted">No services available</small>
                  )}
                </div>
                {errors.departments && (
                  <div className="invalid-feedback d-block">
                    {errors.departments}
                  </div>
                )}
                <Form.Text className="text-muted">
                  Select all services/departments required for this project
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            {/* Project Manager */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Project Manager <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.projectHead}
                  onChange={(e) => handleChange('projectHead', e.target.value)}
                  disabled={formData.departments.length === 0}
                  isInvalid={!!errors.projectHead}
                >
                  <option value="">
                    {formData.departments.length === 0
                      ? 'Select services first...' 
                      : availableProjectHeads.length === 0
                      ? 'No employees in selected services'
                      : 'Select project manager...'}
                  </option>
                  {availableProjectHeads.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.projectHead}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            {/* Status */}
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Priority */}
            <Col md={4}>
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

            {/* Budget */}
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Budget</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter budget (optional)"
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                  min="0"
                  step="0.01"
                />
                <Form.Text className="text-muted">
                  Project budget in your currency
                </Form.Text>
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
          </Row>

          {/* Slot System Configuration - Hidden from users, always 20 slots per month */}
          {/* Slot system is automatically enabled with 20 slots per month for all projects */}

          {/* Dynamic Team Role Assignment (for Multi-Service Projects) */}
          {shouldShowTeamAssignment() && (
            <>
              <hr />
              <h6 className="mb-3">Team Role Assignment <span className="text-muted">(Optional)</span></h6>
              <p className="text-muted small mb-3">
                Assign team members to specific roles for each service. This helps with workflow automation and task routing.
              </p>
              
              {Object.entries(getRolesByDepartments()).map(([departmentName, roles]) => {
                const department = departments.find(d => d.name === departmentName);
                const departmentUsers = department ? getUsersByDepartment(department._id) : [];
                
                return (
                  <div key={departmentName} className="mb-4">
                    <h6 className="text-primary mb-3">
                      <i className="fas fa-cog me-2"></i>
                      {departmentName} Team ({departmentUsers.length} available)
                    </h6>
                    
                    {departmentUsers.length === 0 ? (
                      <div className="alert alert-warning py-2">
                        <small>No employees available in {departmentName} service</small>
                      </div>
                    ) : (
                      <div className="row g-2">
                        {roles.map((role) => (
                          <Col md={6} key={`${departmentName}__${role.key}`}>
                            <div className="border rounded p-2">
                              <Form.Label className="small fw-bold mb-1">
                                {role.label}:
                              </Form.Label>
                              <Form.Select
                                size="sm"
                                value={formData.teamRoles?.[`${departmentName}__${role.key}`] || ''}
                                onChange={(e) => handleTeamRoleChange(departmentName, role.key, e.target.value)}
                              >
                                <option value="">Select {role.label.toLowerCase()}...</option>
                                {departmentUsers.map((user) => (
                                  <option key={user._id} value={user._id}>
                                    {user.name}
                                  </option>
                                ))}
                              </Form.Select>
                            </div>
                          </Col>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="alert alert-info py-2 mt-3">
                <small>
                  <i className="fas fa-info-circle me-1"></i>
                  <strong>Note:</strong> Role assignments are optional and can be modified later. 
                  They help with automated task routing and workflow management.
                </small>
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Project' : 'Create Project')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;
