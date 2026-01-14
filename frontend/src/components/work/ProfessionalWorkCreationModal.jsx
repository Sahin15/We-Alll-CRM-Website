import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Modal, 
  Form, 
  Button, 
  Row, 
  Col, 
  Alert, 
  Card,
  Badge,
  Spinner,
  InputGroup,
  Dropdown,
  ListGroup
} from 'react-bootstrap';
import { 
  FaTasks, 
  FaProjectDiagram, 
  FaUser, 
  FaCalendarAlt, 
  FaClock,
  FaFlag,
  FaLayerGroup,
  FaCheck,
  FaSearch,
  FaTimes
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext';
import workItemApi from '../../api/workItemApi';
import projectApi from '../../api/projectApi';
import userApi from '../../api/userApi';

/**
 * Professional Work Creation Modal
 * Single-page, card-based design without confusing tabs
 * Includes slot assignment functionality
 */
const ProfessionalWorkCreationModal = ({ 
  show, 
  onHide, 
  onSuccess, 
  selectedDate, 
  defaultProject,
  mode = 'auto'
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});

  // Form data
  const [formData, setFormData] = useState({
    // Core fields
    title: '',
    description: '',
    workItemType: 'task',
    project: defaultProject || '',
    assignedTo: user?.id || '',
    dueDate: selectedDate || '',
    priority: 'medium',
    
    // Slot assignment
    assignToSlot: false,
    selectedSlot: '',
    
    // Content fields (shown when type is content)
    platform: '',
    postType: '',
    contentBucket: '',
    
    // Optional fields
    estimatedHours: '',
    tags: ''
  });

  // Slot system states
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Project search states
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectInputRef, setProjectInputRef] = useState(null);

  // Auto-save draft functionality
  const DRAFT_KEY = 'workItemDraft';
  
  // Save draft to localStorage
  const saveDraft = useCallback((data) => {
    try {
      const draft = {
        ...data,
        savedAt: new Date().toISOString(),
        userId: user?.id
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [user?.id]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        // Only load if it's from the same user and less than 24 hours old
        if (parsedDraft.userId === user?.id && 
            moment().diff(moment(parsedDraft.savedAt), 'hours') < 24) {
          return parsedDraft;
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
    return null;
  }, [user?.id]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, []);

  // Filter users by selected project's departments
  const availableUsers = useMemo(() => {
    if (!formData.project || !selectedProject) {
      return users; // Show all users if no project selected
    }

    // Get project departments (both single and multiple)
    const projectDepartments = [];
    if (selectedProject.departments && selectedProject.departments.length > 0) {
      projectDepartments.push(...selectedProject.departments.map(dept => 
        typeof dept === 'object' ? dept._id : dept
      ));
    } else if (selectedProject.department) {
      const deptId = typeof selectedProject.department === 'object' 
        ? selectedProject.department._id 
        : selectedProject.department;
      projectDepartments.push(deptId);
    }

    if (projectDepartments.length === 0) {
      return users; // Show all users if project has no departments
    }

    // Filter users by project departments
    return users.filter(user => {
      const userDeptId = user.department?._id || user.department;
      return projectDepartments.includes(userDeptId);
    });
  }, [formData.project, selectedProject, users]);

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm.trim()) {
      return projects;
    }
    
    const searchLower = projectSearchTerm.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchLower) ||
      project.client?.name?.toLowerCase().includes(searchLower) ||
      project.description?.toLowerCase().includes(searchLower)
    );
  }, [projects, projectSearchTerm]);

  // Get selected project name for display
  const selectedProjectName = useMemo(() => {
    if (!formData.project) return '';
    const project = projects.find(p => p._id === formData.project);
    return project ? project.name : '';
  }, [formData.project, projects]);
  useEffect(() => {
    if (show && (formData.title || formData.description)) {
      const timeoutId = setTimeout(() => {
        saveDraft(formData);
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [show, formData, saveDraft]);

  useEffect(() => {
    if (show) {
      loadData();
      
      // Try to load draft
      const draft = loadDraft();
      if (draft) {
        const shouldLoadDraft = window.confirm(
          `Found a saved draft from ${moment(draft.savedAt).fromNow()}. Would you like to restore it?`
        );
        
        if (shouldLoadDraft) {
          setFormData(prev => ({
            ...prev,
            ...draft,
            // Don't restore these fields
            savedAt: undefined,
            userId: undefined
          }));
          toast.info('Draft restored successfully!');
        } else {
          clearDraft();
        }
      } else {
        resetForm();
      }
    }
  }, [show, selectedDate, defaultProject, loadDraft, clearDraft]);

  // Load available slots when project changes
  useEffect(() => {
    if (formData.project && selectedProject?.slotConfiguration?.enableSlotSystem) {
      loadAvailableSlots(formData.project);
    } else {
      setAvailableSlots([]);
      setFormData(prev => ({ ...prev, assignToSlot: false, selectedSlot: '' }));
    }
  }, [formData.project, selectedProject]);

  const loadData = async () => {
    try {
      // Load projects and users in parallel for faster loading
      const [projectsRes, usersRes] = await Promise.all([
        projectApi.getAllProjects(),
        userApi.getAllUsers()
      ]);

      const projectsData = projectsRes.data || [];
      
      // Log slot-enabled projects for debugging (only if there are any)
      const slotEnabledProjects = projectsData.filter(p => p.slotConfiguration?.enableSlotSystem);
      
      setProjects(projectsData);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load projects and users');
    }
  };

  const loadAvailableSlots = async (projectId) => {
    if (!projectId) return;
    
    setLoadingSlots(true);
    try {
      console.log('🎯 Loading all slots for project:', projectId);
      
      // Get all slots for the project (both available and assigned) for better display
      const response = await projectApi.getAvailableSlots(projectId, { includeAll: true });
      console.log('🎯 All slots response:', response);
      
      if (response.success && response.data) {
        const slots = response.data.slots || [];
        console.log(`🎯 Found ${slots.length} total slots (${response.data.availableCount} available, ${response.data.assignedCount} assigned):`, slots);
        setAvailableSlots(slots);
      } else {
        console.log('❌ No slots found or API error:', response);
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error("❌ Error loading slots:", error);
      console.error("❌ Error details:", error.response?.data);
      setAvailableSlots([]);
      
      // Show user-friendly error message
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view slots for this project');
      } else if (error.response?.status === 404) {
        console.log('ℹ️ No slots found for this project yet');
      } else {
        toast.error('Failed to load slots');
      }
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleProjectChange = async (projectId) => {
    setFormData(prev => ({ ...prev, project: projectId }));
    
    if (projectId) {
      try {
        // First, find the project in the loaded projects list
        const project = projects.find(p => p._id === projectId);
        if (project) {
          console.log('🔍 Selected project from list:', project.name);
          console.log('🎯 Project data:', {
            id: project._id,
            name: project.name,
            slotConfiguration: project.slotConfiguration,
            enableSlotSystem: project.slotConfiguration?.enableSlotSystem,
            totalSlots: project.slotConfiguration?.totalSlots
          });
          setSelectedProject(project);
          
          // If project has slot system, load slots
          if (project.slotConfiguration?.enableSlotSystem) {
            console.log('✅ Project has slot system enabled, loading slots...');
            await loadAvailableSlots(projectId);
          } else {
            console.log('❌ Project does NOT have slot system enabled');
            setAvailableSlots([]);
          }
        } else {
          // Fallback: fetch project details from API
          const projectResponse = await projectApi.getProjectById(projectId);
          if (projectResponse.success) {
            const projectData = projectResponse.data;
            setSelectedProject(projectData);
            
            if (projectData.slotConfiguration?.enableSlotSystem) {
              await loadAvailableSlots(projectId);
            } else {
              setAvailableSlots([]);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading project details:', error);
        setSelectedProject(null);
        setAvailableSlots([]);
      }
    } else {
      setSelectedProject(null);
      setAvailableSlots([]);
    }
  };

  // Handle project search and selection
  const handleProjectSelect = (project) => {
    handleProjectChange(project._id);
    setProjectSearchTerm('');
    setShowProjectDropdown(false);
  };

  const handleProjectSearchChange = (value) => {
    setProjectSearchTerm(value);
    setShowProjectDropdown(true);
  };

  const clearProjectSelection = () => {
    handleProjectChange('');
    setProjectSearchTerm('');
    setShowProjectDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectInputRef && !projectInputRef.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [projectInputRef]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.project) {
      newErrors.project = 'Project is required';
    }

    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Assigned to is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    // Content-specific validation
    if (formData.workItemType === 'content') {
      if (!formData.platform) {
        newErrors.platform = 'Platform is required for content items';
      }
      if (!formData.postType) {
        newErrors.postType = 'Post type is required for content items';
      }
    }

    // Slot validation
    if (formData.assignToSlot && !formData.selectedSlot) {
      newErrors.selectedSlot = 'Please select a slot';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    // Clear draft when successfully closing (not canceling)
    if (formData.title || formData.description) {
      const shouldSaveDraft = window.confirm(
        'You have unsaved changes. Would you like to save as draft?'
      );
      
      if (shouldSaveDraft) {
        saveDraft(formData);
        toast.info('Draft saved for later!');
      } else {
        clearDraft();
      }
    }
    
    resetForm();
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors and try again');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare work item data
      const workItemData = {
        type: formData.workItemType, // Map workItemType to type
        title: formData.title,
        description: formData.description,
        project: formData.project,
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        // Add slot assignment data
        assignToSlot: formData.assignToSlot,
        selectedSlot: formData.selectedSlot
      };

      // Add content-specific fields
      if (formData.workItemType === 'content') {
        workItemData.platform = formData.platform;
        workItemData.postType = formData.postType;
        if (formData.contentBucket) {
          workItemData.contentBucket = formData.contentBucket;
        }
      }

      // Create work item
      const workItemResult = await workItemApi.createWorkItem(workItemData);
      
      toast.success('Work item created successfully!');

      // Clear draft on successful submission
      clearDraft();
      
      // Call success callback
      if (onSuccess) {
        onSuccess(workItemResult);
      }

      // Close modal
      onHide();
      
    } catch (error) {
      console.error('❌ Error creating work item:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to create work item';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      workItemType: 'task',
      project: defaultProject || '',
      assignedTo: user?.id || '',
      dueDate: selectedDate || '',
      priority: 'medium',
      assignToSlot: false,
      selectedSlot: '',
      platform: '',
      postType: '',
      contentBucket: '',
      estimatedHours: '',
      tags: ''
    });
    setErrors({});
    setAvailableSlots([]);
    setSelectedProject(null);
    setProjectSearchTerm('');
    setShowProjectDropdown(false);
  };

  // Check if there's a current draft
  const hasDraft = useMemo(() => {
    return formData.title || formData.description || formData.project || 
           formData.assignedTo !== (user?.id || '') || formData.priority !== 'medium';
  }, [formData, user?.id]);

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaTasks />
          Create Work Item
          {hasDraft && (
            <Badge bg="warning" className="ms-2">
              <small>Draft</small>
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          {/* Essential Information Card */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <FaTasks className="text-primary" />
                Essential Information
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Work Title <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter work title..."
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      isInvalid={!!errors.title}
                      autoFocus
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.title}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Work Type</Form.Label>
                    <Form.Select
                      value={formData.workItemType}
                      onChange={(e) => handleInputChange('workItemType', e.target.value)}
                    >
                      <option value="task">Task</option>
                      <option value="content">Content</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Brief description of the work..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Project & Assignment Card */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <FaProjectDiagram className="text-success" />
                Project & Assignment
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Project <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="position-relative" ref={setProjectInputRef}>
                      <InputGroup>
                        <InputGroup.Text>
                          <FaSearch className="text-muted" />
                        </InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder={selectedProjectName || "Search and select project..."}
                          value={projectSearchTerm}
                          onChange={(e) => handleProjectSearchChange(e.target.value)}
                          onFocus={() => setShowProjectDropdown(true)}
                          isInvalid={!!errors.project}
                          autoComplete="off"
                          className="project-search-input"
                        />
                        {formData.project && (
                          <Button
                            variant="outline-secondary"
                            onClick={clearProjectSelection}
                            size="sm"
                            title="Clear selection"
                          >
                            <FaTimes />
                          </Button>
                        )}
                      </InputGroup>
                      
                      {/* Project Dropdown */}
                      {showProjectDropdown && (
                        <div 
                          className="position-absolute w-100 project-dropdown"
                          style={{ 
                            top: '100%'
                          }}
                        >
                          {filteredProjects.length > 0 ? (
                            <ListGroup variant="flush">
                              {filteredProjects.map(project => (
                                <ListGroup.Item
                                  key={project._id}
                                  action
                                  onClick={() => handleProjectSelect(project)}
                                  className={`d-flex justify-content-between align-items-center ${
                                    formData.project === project._id ? 'active' : ''
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="fw-bold d-flex align-items-center gap-2">
                                    {project.name}
                                    {project.slotConfiguration?.enableSlotSystem && (
                                      <Badge bg="info" size="sm">🎯</Badge>
                                    )}
                                  </div>
                                  {formData.project === project._id && (
                                    <FaCheck className="text-success" />
                                  )}
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          ) : (
                            <div className="p-3 text-center text-muted">
                              <FaSearch className="mb-2" />
                              <div>No projects found matching "{projectSearchTerm}"</div>
                              <small>Try a different search term</small>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <Form.Control.Feedback type="invalid">
                        {errors.project}
                      </Form.Control.Feedback>
                      
                      {/* Selected Project Display */}
                      {formData.project && selectedProject && (
                        <div className="mt-2 p-2 selected-project-display">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="fw-bold text-success d-flex align-items-center gap-2">
                              <FaCheck size={12} />
                              {selectedProject.name}
                              {selectedProject.slotConfiguration?.enableSlotSystem && (
                                <Badge bg="info" size="sm">🎯</Badge>
                              )}
                            </div>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={clearProjectSelection}
                              className="text-muted p-0"
                              title="Change project"
                            >
                              <FaTimes />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Assigned To <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      value={formData.assignedTo}
                      onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                      isInvalid={!!errors.assignedTo}
                    >
                      <option value="">Select Person...</option>
                      {availableUsers.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.assignedTo}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              {/* Slot Assignment Section */}
              {selectedProject?.slotConfiguration?.enableSlotSystem ? (
                <Alert variant="info" className="mb-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <FaLayerGroup className="me-2" />
                      <strong>🎯 Slot System Available</strong>
                      <p className="mb-0 small">This project has {selectedProject.slotConfiguration.totalSlots} slots available for assignment.</p>
                    </div>
                    <Form.Check
                      type="switch"
                      id="assign-to-slot"
                      label="Assign to Slot"
                      checked={formData.assignToSlot}
                      onChange={(e) => handleInputChange('assignToSlot', e.target.checked)}
                    />
                  </div>
                  
                  {formData.assignToSlot && (
                    <div className="mt-3">
                      <Form.Label className="fw-bold">
                        Select Slot <span className="text-danger">*</span>
                      </Form.Label>
                      {loadingSlots ? (
                        <div className="text-center py-2">
                          <Spinner size="sm" /> Loading available slots...
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <>
                          <Form.Select
                            value={formData.selectedSlot}
                            onChange={(e) => handleInputChange('selectedSlot', e.target.value)}
                            isInvalid={!!errors.selectedSlot}
                            className="slot-select"
                          >
                            <option value="">Choose a slot...</option>
                            {availableSlots.map(slot => {
                              const isAssigned = slot.assignmentStatus === 'assigned' || slot.assignedWorkItem;
                              const displayText = `Slot ${slot.slotNumber}${isAssigned ? ' (Used)' : ' (Available)'}`;
                              return (
                                <option 
                                  key={slot._id} 
                                  value={slot._id}
                                  disabled={isAssigned}
                                  style={{
                                    color: isAssigned ? '#dc3545' : '#28a745',
                                    fontWeight: isAssigned ? 'normal' : '500'
                                  }}
                                >
                                  {displayText}
                                </option>
                              );
                            })}
                          </Form.Select>
                          
                          {/* Slot Status Legend */}
                          <div className="slot-status-legend">
                            <div className="slot-status-item">
                              <div className="slot-status-dot slot-status-available"></div>
                              <span>Available</span>
                            </div>
                            <div className="slot-status-item">
                              <div className="slot-status-dot slot-status-used"></div>
                              <span>Used</span>
                            </div>
                          </div>
                          
                          {/* Slot Assignment Info */}
                          <div className="slot-assignment-info text-muted">
                            {availableSlots.filter(s => s.assignmentStatus === 'available' && !s.assignedWorkItem).length} available, {' '}
                            {availableSlots.filter(s => s.assignmentStatus === 'assigned' || s.assignedWorkItem).length} used
                          </div>
                        </>
                      ) : (
                        <Alert variant="warning" className="mb-0">
                          No available slots found for this project.
                        </Alert>
                      )}
                      <Form.Control.Feedback type="invalid">
                        {errors.selectedSlot}
                      </Form.Control.Feedback>
                    </div>
                  )}
                </Alert>
              ) : selectedProject ? (
                <Alert variant="warning" className="mb-3">
                  <div className="d-flex align-items-center">
                    <FaLayerGroup className="me-2" />
                    <div>
                      <strong>⚠️ Slot System Not Enabled</strong>
                      <p className="mb-0 small">
                        This project doesn't have slot-based progress tracking enabled. 
                        Work items will be created without slot assignment.
                      </p>
                    </div>
                  </div>
                </Alert>
              ) : (
                <Alert variant="info" className="mb-3">
                  <div className="d-flex align-items-center">
                    <FaLayerGroup className="me-2" />
                    <div>
                      <strong>📋 Select a Project</strong>
                      <p className="mb-0 small">Choose a project to see if slot assignment is available.</p>
                    </div>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>

          {/* Scheduling & Priority Card */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <FaCalendarAlt className="text-warning" />
                Scheduling & Priority
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Due Date <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                      isInvalid={!!errors.dueDate}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.dueDate}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Priority</Form.Label>
                    <Form.Select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Estimated Hours</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Hours"
                      value={formData.estimatedHours}
                      onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                      min="1"
                      max="100"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Content Details Card (only for content type) */}
          {formData.workItemType === 'content' && (
            <Card className="mb-4 border-0 shadow-sm">
              <Card.Header className="bg-light border-0">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <FaFlag className="text-info" />
                  Content Details
                </h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">
                        Platform <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={formData.platform}
                        onChange={(e) => handleInputChange('platform', e.target.value)}
                        isInvalid={!!errors.platform}
                      >
                        <option value="">Select Platform...</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Twitter">Twitter</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Pinterest">Pinterest</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.platform}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">
                        Post Type <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={formData.postType}
                        onChange={(e) => handleInputChange('postType', e.target.value)}
                        isInvalid={!!errors.postType}
                      >
                        <option value="">Select Type...</option>
                        <option value="Post">Post</option>
                        <option value="Story">Story</option>
                        <option value="Reel">Reel</option>
                        <option value="Carousel">Carousel</option>
                        <option value="Video">Video</option>
                        <option value="Article">Article</option>
                        <option value="Poll">Poll</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.postType}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Content Bucket</Form.Label>
                      <Form.Select
                        value={formData.contentBucket}
                        onChange={(e) => handleInputChange('contentBucket', e.target.value)}
                      >
                        <option value="">Select Bucket...</option>
                        <option value="Brand Promotion">Brand Promotion</option>
                        <option value="Festival Post">Festival Post</option>
                        <option value="Service Highlight">Service Highlight</option>
                        <option value="Customer Testimonial">Customer Testimonial</option>
                        <option value="Educational Content">Educational Content</option>
                        <option value="Behind the Scenes">Behind the Scenes</option>
                        <option value="Engagement Post">Engagement Post</option>
                        <option value="Promotional Offer">Promotional Offer</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Optional Details Card */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <FaFlag className="text-secondary" />
                Optional Details
              </h6>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-0">
                <Form.Label className="fw-bold">Tags</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter tags separated by commas..."
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Separate multiple tags with commas (e.g., urgent, client-review, design)
                </Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>
        </Form>
      </Modal.Body>

      <Modal.Footer className="border-0 bg-light">
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={loading}
          className="d-flex align-items-center gap-2"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              Creating...
            </>
          ) : (
            <>
              <FaCheck />
              Create Work Item
            </>
          )}
        </Button>
      </Modal.Footer>

      {/* Custom Styles for Slot Selection and Project Search */}
      <style>{`
        .slot-select option[disabled] {
          color: #dc3545 !important;
          background-color: #f8d7da !important;
          font-style: italic;
        }
        
        .slot-select option:not([disabled]) {
          color: #28a745 !important;
          font-weight: 500;
        }
        
        .slot-select option:hover:not([disabled]) {
          background-color: #d4edda !important;
        }
        
        .slot-assignment-info {
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }
        
        .slot-status-legend {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
          font-size: 0.8rem;
        }
        
        .slot-status-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .slot-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .slot-status-available {
          background-color: #28a745;
        }
        
        .slot-status-used {
          background-color: #dc3545;
        }

        /* Project Search Dropdown Styles */
        .project-dropdown {
          border: 1px solid #dee2e6;
          border-radius: 0.375rem;
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
          background-color: white;
          max-height: 300px;
          overflow-y: auto;
          z-index: 1050;
        }

        .project-dropdown .list-group-item {
          border: none;
          border-bottom: 1px solid #f8f9fa;
          transition: all 0.2s ease;
        }

        .project-dropdown .list-group-item:hover {
          background-color: #f8f9fa;
          transform: translateY(-1px);
        }

        .project-dropdown .list-group-item.active {
          background-color: #e3f2fd;
          border-color: #2196f3;
          color: #1976d2;
        }

        .project-dropdown .list-group-item:last-child {
          border-bottom: none;
        }

        /* Project search input focus styles */
        .project-search-input:focus {
          border-color: #80bdff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        /* Selected project display */
        .selected-project-display {
          background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%);
          border: 1px solid #28a745;
          border-radius: 0.375rem;
          transition: all 0.3s ease;
        }

        .selected-project-display:hover {
          box-shadow: 0 2px 4px rgba(40, 167, 69, 0.1);
        }

        /* Animation for dropdown appearance */
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .project-dropdown {
          animation: slideDown 0.2s ease-out;
        }

        /* Scrollbar styling for project dropdown */
        .project-dropdown::-webkit-scrollbar {
          width: 6px;
        }

        .project-dropdown::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .project-dropdown::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .project-dropdown::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </Modal>
  );
};

export default ProfessionalWorkCreationModal;