import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { FaTasks } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import workItemApi from '../../api/workItemApi';
import workCalendarApi from '../../api/workCalendarApi';
import projectApi from '../../api/projectApi';
import userApi from '../../api/userApi';


/**
 * Unified Work Creation Modal
 * Creates both work items and calendar entries in a synchronized way
 */
const UnifiedWorkCreationModal = ({ 
  show, 
  onHide, 
  onSuccess, 
  selectedDate, 
  defaultProject,
  mode = 'auto' // 'auto', 'work-item-focused', 'calendar-focused', 'my-work-focused'
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState({
    // Basic Information
    creationType: mode === 'my-work-focused' ? 'work-item' : 'both', // 'work-item', 'calendar-entry', 'both'
    workItemType: 'task', // 'task', 'content'
    title: '',
    description: '',
    
    // Assignment
    project: defaultProject || '',
    assignedTo: user?.id || '',
    department: user?.department || '',
    
    // Scheduling
    dueDate: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    isAllDay: false,
    
    // Work Details
    priority: 'medium',
    estimatedHours: '',
    workType: 'internal-task', // For calendar entries
    
    // Content-specific (for work items)
    platform: '',
    postType: '',
    contentBucket: '',
    
    // Calendar-specific
    location: '',
    isRemote: false,
    
    // Common
    tags: '',
  });

  useEffect(() => {
    if (show) {
      loadData();
      initializeFormData();
      
      // Set default creation type based on mode
      if (mode === 'my-work-focused') {
        setFormData(prev => ({ ...prev, creationType: 'work-item' }));
      } else if (mode === 'calendar-focused') {
        setFormData(prev => ({ ...prev, creationType: 'calendar-entry' }));
      } else if (mode === 'work-item-focused') {
        setFormData(prev => ({ ...prev, creationType: 'work-item' }));
      }
    }
  }, [show, selectedDate, defaultProject, mode]);

  const initializeFormData = () => {
    const today = new Date();
    const dateStr = selectedDate 
      ? new Date(selectedDate).toISOString().split('T')[0]
      : today.toISOString().split('T')[0];
    
    setFormData(prev => ({
      ...prev,
      dueDate: dateStr,
      startDate: dateStr,
      endDate: dateStr,
      project: defaultProject || prev.project,
      // Department will be auto-set when project is selected
      department: prev.department,
      assignedTo: user?.id || prev.assignedTo,
    }));
  };

  const loadData = async () => {
    try {
      await Promise.all([
        loadProjects(),
        loadUsers(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadProjects = async () => {
    try {
      // Use appropriate API method based on user role
      let response;
      if (['admin', 'superadmin', 'hr', 'manager'].includes(user?.role)) {
        // Admin roles can see all projects
        response = await projectApi.getAllProjects();
      } else if (user?.role === 'hod') {
        // HoD sees their department's projects
        response = await projectApi.getMyDepartmentProjects();
      } else {
        // Regular employees see only their assigned projects
        response = await projectApi.getMyProjects();
      }
      
      const projectList = response.data || response.projects || response || [];
      setProjects(Array.isArray(projectList) ? projectList : []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      const userList = response.data || response.users || response || [];
      const validUsers = Array.isArray(userList) ? userList : [];
      const employeeUsers = validUsers.filter(u => 
        u.role === 'employee' || u.role === 'hod'
      );
      setAllUsers(employeeUsers);
      setUsers(employeeUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };



  // Filter users when project changes and auto-set department
  useEffect(() => {
    if (formData.project && projects.length > 0 && allUsers.length > 0) {
      const selectedProject = projects.find(p => p._id === formData.project);
      
      if (selectedProject) {
        let projectDepartmentIds = [];
        
        // Get project departments
        if (selectedProject.departments && Array.isArray(selectedProject.departments) && selectedProject.departments.length > 0) {
          projectDepartmentIds = selectedProject.departments.map(dept => 
            typeof dept === 'object' ? dept._id : dept
          );
        } else if (selectedProject.department) {
          const deptId = typeof selectedProject.department === 'object' 
            ? selectedProject.department._id 
            : selectedProject.department;
          projectDepartmentIds = [deptId];
        }
        
        if (projectDepartmentIds.length > 0) {
          // Auto-set department from project (use first department if multiple)
          setFormData(prev => ({ 
            ...prev, 
            department: projectDepartmentIds[0]
          }));
          
          // Filter users to show only those working on this project
          const projectUsers = allUsers.filter(user => {
            // Handle both populated and non-populated user department
            let userDeptId = null;
            
            if (user.department) {
              if (typeof user.department === 'object' && user.department._id) {
                userDeptId = user.department._id;
              } else if (typeof user.department === 'string') {
                userDeptId = user.department;
              }
            }
            
            // Also check if user is directly assigned to the project (fallback)
            const isDirectlyAssigned = selectedProject.assignedUsers && 
              selectedProject.assignedUsers.some(assignedUser => {
                const assignedUserId = typeof assignedUser === 'object' ? assignedUser._id : assignedUser;
                return assignedUserId === user._id;
              });
            
            const isInProjectDepartment = userDeptId && projectDepartmentIds.includes(userDeptId);
            return isInProjectDepartment || isDirectlyAssigned;
          });
          
          setUsers(projectUsers);
          
          // Reset assignedTo if current user is not in project
          if (formData.assignedTo && !projectUsers.find(u => u._id === formData.assignedTo)) {
            setFormData(prev => ({ ...prev, assignedTo: '' }));
          }
        } else {
          setUsers(allUsers);
        }
      }
    } else {
      // No project selected - show all users and reset department
      setUsers(allUsers);
      if (formData.creationType === 'calendar-entry' || formData.creationType === 'both') {
        setFormData(prev => ({ ...prev, department: user?.department || '' }));
      }
    }
  }, [formData.project, projects, allUsers, user?.department]);

  // Auto-calculate estimated hours
  useEffect(() => {
    if (formData.startTime && formData.endTime && !formData.isAllDay) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      const diffMs = end - start;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours > 0) {
        setFormData(prev => ({
          ...prev,
          estimatedHours: diffHours.toString(),
        }));
      }
    }
  }, [formData.startTime, formData.endTime, formData.isAllDay]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Step 1: Project validation (most important)
    if (!formData.project) {
      newErrors.project = 'Project must be selected first';
      toast.error('Please select a project first in the Basic Info tab');
      setActiveTab('basic');
      return false;
    }

    // Step 2: Basic validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Step 3: Assignment validation
    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Assignee is required';
      if (users.length === 0) {
        toast.error('No team members available for this project. Please check project department assignments.');
      }
    }

    // Step 4: Scheduling validation
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    // Work item specific validation
    if (formData.creationType === 'work-item' || formData.creationType === 'both') {
      if (formData.workItemType === 'content') {
        if (!formData.platform) {
          newErrors.platform = 'Platform is required for content items';
        }
        if (!formData.postType) {
          newErrors.postType = 'Post type is required for content items';
        }
      }
    }

    // Calendar entry specific validation
    if (formData.creationType === 'calendar-entry' || formData.creationType === 'both') {
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required';
      }
      if (!formData.endDate) {
        newErrors.endDate = 'End date is required';
      }
      // Department is auto-set from project, so no need to validate separately
    }

    setErrors(newErrors);
    
    // Guide user to the right tab if there are errors
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.project || newErrors.title) {
        setActiveTab('basic');
      } else if (newErrors.assignedTo) {
        setActiveTab('assignment');
      } else if (newErrors.dueDate || newErrors.startDate || newErrors.endDate) {
        setActiveTab('scheduling');
      } else {
        setActiveTab('details');
      }
    }
    
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
      const results = [];

      // Create work item if needed
      if (formData.creationType === 'work-item' || formData.creationType === 'both') {
        const workItemData = {
          type: formData.workItemType,
          title: formData.title.trim(),
          description: formData.description.trim(),
          project: formData.project,
          assignedTo: formData.assignedTo,
          priority: formData.priority,
          dueDate: formData.dueDate,
          estimatedHours: parseFloat(formData.estimatedHours) || undefined,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        };

        // Add content-specific fields
        if (formData.workItemType === 'content') {
          workItemData.platform = formData.platform;
          workItemData.postType = formData.postType;
          if (formData.contentBucket) {
            workItemData.contentBucket = formData.contentBucket;
          }
        }

        console.log('🔍 [DEBUG] Sending workItemData:', workItemData);
        console.log('🔍 [DEBUG] Form data:', formData);
        const workItemResult = await workItemApi.createWorkItem(workItemData);
        results.push({ type: 'work-item', data: workItemResult });
      }

      // Create calendar entry if needed
      if (formData.creationType === 'calendar-entry' || formData.creationType === 'both') {
        const startDateTime = formData.isAllDay 
          ? new Date(formData.startDate)
          : new Date(`${formData.startDate}T${formData.startTime}`);
        
        const endDateTime = formData.isAllDay
          ? new Date(new Date(formData.endDate).getTime() + 24 * 60 * 60 * 1000)
          : new Date(`${formData.endDate}T${formData.endTime}`);

        const calendarData = {
          title: formData.title,
          description: formData.description,
          workType: formData.workType,
          project: formData.project || undefined,
          department: formData.department,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          dueDate: formData.dueDate,
          isAllDay: formData.isAllDay,
          priority: formData.priority,
          location: formData.location || undefined,
          isRemote: formData.isRemote,
          timeTracking: {
            estimatedHours: parseFloat(formData.estimatedHours) || 0,
          },
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
          visibility: 'project',
          isAutoGenerated: false,
        };

        const calendarResult = await workCalendarApi.createWorkCalendarEntry(calendarData);
        results.push({ type: 'calendar-entry', data: calendarResult });
      }

      // Success message
      if (results.length === 2) {
        toast.success('Work item and calendar entry created successfully!');
      } else if (results[0].type === 'work-item') {
        toast.success('Work item created successfully!');
      } else {
        toast.success('Calendar entry created successfully!');
      }

      // Reset form and close
      resetForm();
      onSuccess?.();
      onHide();

    } catch (error) {
      console.error('Error creating work:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create work';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      creationType: 'both',
      workItemType: 'task',
      title: '',
      description: '',
      project: defaultProject || '',
      assignedTo: user?.id || '',
      department: user?.department || '',
      dueDate: '',
      startDate: '',
      endDate: '',
      startTime: '09:00',
      endTime: '17:00',
      isAllDay: false,
      priority: 'medium',
      estimatedHours: '',
      workType: 'internal-task',
      platform: '',
      postType: '',
      contentBucket: '',
      location: '',
      isRemote: false,
      tags: '',
    });
    setErrors({});
    setActiveTab('basic');
  };

  const handleCancel = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaTasks className="me-2" />
          {mode === 'my-work-focused' ? 'Create Work Item' :
           mode === 'calendar-focused' ? 'Create Calendar Entry' :
           mode === 'work-item-focused' ? 'Create Work Item' :
           'Create Work'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Creation Type Selection */}
          <Alert variant={mode === 'my-work-focused' ? 'primary' : 'info'} className="mb-4">
            <Row>
              <Col md={8}>
                <strong>
                  {mode === 'my-work-focused' ? '📋 Creating Work Item' : 
                   mode === 'calendar-focused' ? '📅 Creating Calendar Entry' :
                   mode === 'work-item-focused' ? '📋 Creating Work Item' :
                   'What would you like to create?'}
                </strong>
                {mode === 'my-work-focused' && (
                  <div className="mt-1">
                    <small className="text-muted">
                      Creating from "My Work" - Work item will be added to your task list
                      {formData.creationType === 'both' && ' and calendar'}
                    </small>
                  </div>
                )}
                <div className="mt-2">
                  {mode !== 'my-work-focused' && (
                    <Form.Check
                      inline
                      type="radio"
                      id="type-both"
                      label="📋 Work Item + 📅 Calendar Entry (Recommended)"
                      checked={formData.creationType === 'both'}
                      onChange={() => handleChange('creationType', 'both')}
                    />
                  )}
                  <Form.Check
                    inline
                    type="radio"
                    id="type-work-item"
                    label={mode === 'my-work-focused' ? '📋 Work Item Only' : '📋 Work Item Only'}
                    checked={formData.creationType === 'work-item'}
                    onChange={() => handleChange('creationType', 'work-item')}
                  />
                  {mode === 'my-work-focused' && (
                    <Form.Check
                      inline
                      type="radio"
                      id="type-both-mywork"
                      label="📋 Work Item + 📅 Calendar Entry"
                      checked={formData.creationType === 'both'}
                      onChange={() => handleChange('creationType', 'both')}
                    />
                  )}
                  {mode !== 'my-work-focused' && (
                    <Form.Check
                      inline
                      type="radio"
                      id="type-calendar"
                      label="📅 Calendar Entry Only"
                      checked={formData.creationType === 'calendar-entry'}
                      onChange={() => handleChange('creationType', 'calendar-entry')}
                    />
                  )}
                </div>
              </Col>
              <Col md={4} className="text-end">
                {selectedDate && (
                  <div>
                    <strong>📅 Selected Date:</strong><br />
                    <span className="text-primary">
                      {new Date(selectedDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
                {mode === 'my-work-focused' && (
                  <div className="mt-2">
                    <small className="text-success">
                      ✅ Will appear in "My Work"
                    </small>
                  </div>
                )}
              </Col>
            </Row>
          </Alert>

          <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
            {/* Progress Indicator */}
            <div className="d-flex justify-content-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <span className={`badge ${formData.project ? 'bg-success' : 'bg-secondary'}`}>
                  1. Project & Info
                </span>
                <span>→</span>
                <span className={`badge ${formData.assignedTo ? 'bg-success' : 'bg-secondary'}`}>
                  2. Assignment
                </span>
                <span>→</span>
                <span className={`badge ${formData.dueDate ? 'bg-success' : 'bg-secondary'}`}>
                  3. Scheduling
                </span>
                <span>→</span>
                <span className="badge bg-info">4. Details</span>
              </div>
            </div>
            {/* Basic Information Tab */}
            <Tab eventKey="basic" title="📝 Basic Info">
              {/* Project Selection - First Priority */}
              <Alert variant="primary" className="mb-3">
                <strong>🎯 Step 1: Select Project</strong>
                <div className="mt-1">
                  <small>
                    Choose the project first - this will automatically determine the team members and departments available for assignment.
                  </small>
                </div>
              </Alert>
              
              <Form.Group className="mb-4">
                <Form.Label>Project <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={formData.project}
                  onChange={(e) => handleChange('project', e.target.value)}
                  isInvalid={!!errors.project}
                >
                  <option value="">Select project first...</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                      {project.departments && project.departments.length > 0 && (
                        ` (${project.departments.map(d => typeof d === 'object' ? d.name : d).join(', ')})`
                      )}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.project}
                </Form.Control.Feedback>
                {formData.project && (
                  <Form.Text className="text-success">
                    ✅ Project selected - Team members and departments automatically filtered
                  </Form.Text>
                )}
              </Form.Group>

              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Title <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter work title"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      isInvalid={!!errors.title}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.title}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Priority</Form.Label>
                    <Form.Select
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🔵 Medium</option>
                      <option value="high">🟠 High</option>
                      <option value="urgent">🔴 Urgent</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </Form.Group>

              {/* Work Item Type (if creating work item) */}
              {(formData.creationType === 'work-item' || formData.creationType === 'both') && (
                <Form.Group className="mb-3">
                  <Form.Label>Work Item Type</Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Check
                      type="radio"
                      id="work-type-task"
                      label="📋 Task"
                      checked={formData.workItemType === 'task'}
                      onChange={() => handleChange('workItemType', 'task')}
                    />
                    <Form.Check
                      type="radio"
                      id="work-type-content"
                      label="📱 Content"
                      checked={formData.workItemType === 'content'}
                      onChange={() => handleChange('workItemType', 'content')}
                    />
                  </div>
                </Form.Group>
              )}

              {/* Calendar Work Type (if creating calendar entry) */}
              {(formData.creationType === 'calendar-entry' || formData.creationType === 'both') && (
                <Form.Group className="mb-3">
                  <Form.Label>Calendar Work Type</Form.Label>
                  <Form.Select
                    value={formData.workType}
                    onChange={(e) => handleChange('workType', e.target.value)}
                  >
                    <option value="internal-task">📋 Internal Task</option>
                    <option value="meeting">👥 Meeting</option>
                    <option value="deadline">⏰ Deadline</option>
                    <option value="review">📝 Review</option>
                    <option value="presentation">📊 Presentation</option>
                    <option value="training">🎓 Training</option>
                    <option value="client-call">📞 Client Call</option>
                    <option value="other">📌 Other</option>
                  </Form.Select>
                </Form.Group>
              )}
            </Tab>

            {/* Assignment Tab */}
            <Tab eventKey="assignment" title="👥 Assignment">
              {!formData.project && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ Project Required</strong>
                  <div className="mt-1">
                    <small>
                      Please select a project in the "Basic Info" tab first to see available team members.
                    </small>
                  </div>
                </Alert>
              )}
              
              {formData.project && (
                <Alert variant="success" className="mb-3">
                  <strong>✅ Project Selected</strong>
                  <div className="mt-1">
                    <small>
                      Showing team members from the selected project's departments. Department is automatically set from project.
                    </small>
                  </div>
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Assign To <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={formData.assignedTo}
                  onChange={(e) => handleChange('assignedTo', e.target.value)}
                  isInvalid={!!errors.assignedTo}
                  disabled={!formData.project}
                >
                  <option value="">
                    {!formData.project 
                      ? "Select project first in Basic Info tab..." 
                      : users.length > 0
                      ? "Select team member working on this project..." 
                      : "No team members found for this project..."
                    }
                  </option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.assignedTo}
                </Form.Control.Feedback>
                {formData.project && users.length > 0 && (
                  <Form.Text className="text-success">
                    📋 Showing {users.length} team member(s) working on this project
                  </Form.Text>
                )}
                {formData.project && users.length === 0 && (
                  <Form.Text className="text-warning">
                    ⚠️ No team members found for this project. Check project department assignments.
                  </Form.Text>
                )}

              </Form.Group>
            </Tab>

            {/* Scheduling Tab */}
            <Tab eventKey="scheduling" title="📅 Scheduling">
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Due Date <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleChange('dueDate', e.target.value)}
                      isInvalid={!!errors.dueDate}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.dueDate}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date</Form.Label>
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
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleChange('endDate', e.target.value)}
                      isInvalid={!!errors.endDate}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.endDate}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Check
                type="checkbox"
                label="All Day Event"
                checked={formData.isAllDay}
                onChange={(e) => handleChange('isAllDay', e.target.checked)}
                className="mb-3"
              />

              {!formData.isAllDay && (
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      <Form.Control
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => handleChange('startTime', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>End Time</Form.Label>
                      <Form.Control
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => handleChange('endTime', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Estimated Hours</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={formData.estimatedHours}
                          onChange={(e) => handleChange('estimatedHours', e.target.value)}
                          placeholder="Auto-calculated"
                        />
                        <InputGroup.Text>hours</InputGroup.Text>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>
              )}
            </Tab>

            {/* Additional Details Tab */}
            <Tab eventKey="details" title="📋 Details">
              {/* Content-specific fields */}
              {formData.workItemType === 'content' && (formData.creationType === 'work-item' || formData.creationType === 'both') && (
                <>
                  <Alert variant="info" className="mb-3">
                    <strong>Content Item Details</strong>
                  </Alert>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Platform <span className="text-danger">*</span></Form.Label>
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
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.platform}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Post Type <span className="text-danger">*</span></Form.Label>
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
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.postType}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Content Bucket</Form.Label>
                    <Form.Select
                      value={formData.contentBucket}
                      onChange={(e) => handleChange('contentBucket', e.target.value)}
                    >
                      <option value="">Select content bucket...</option>
                      <option value="Educational">Educational</option>
                      <option value="Promotional">Promotional</option>
                      <option value="Engagement">Engagement</option>
                    </Form.Select>
                  </Form.Group>
                </>
              )}

              {/* Location fields */}
              {(formData.creationType === 'calendar-entry' || formData.creationType === 'both') && (
                <>
                  <Alert variant="secondary" className="mb-3">
                    <strong>📍 Location Details</strong>
                  </Alert>
                  <Form.Check
                    type="checkbox"
                    label="🏠 Remote Work"
                    checked={formData.isRemote}
                    onChange={(e) => handleChange('isRemote', e.target.checked)}
                    className="mb-3"
                  />
                  {!formData.isRemote && (
                    <Form.Group className="mb-3">
                      <Form.Label>Location</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter work location"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                      />
                    </Form.Group>
                  )}
                </>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Tags</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter tags separated by commas"
                  value={formData.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                />
                <Form.Text className="text-muted">
                  e.g., urgent, client-work, design
                </Form.Text>
              </Form.Group>
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : `Create ${
              formData.creationType === 'both' ? 'Work Item & Calendar Entry' :
              formData.creationType === 'work-item' ? 'Work Item' :
              'Calendar Entry'
            }`}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default UnifiedWorkCreationModal;