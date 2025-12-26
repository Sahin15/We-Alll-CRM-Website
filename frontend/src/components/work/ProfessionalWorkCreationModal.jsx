import { useState, useEffect } from 'react';
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
  InputGroup
} from 'react-bootstrap';
import { 
  FaTasks, 
  FaProjectDiagram, 
  FaUser, 
  FaCalendarAlt, 
  FaClock,
  FaFlag,
  FaLayerGroup,
  FaCheck
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import workItemApi from '../../api/workItemApi';
import workCalendarApi from '../../api/workCalendarApi';
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

  useEffect(() => {
    if (show) {
      loadData();
      resetForm();
    }
  }, [show, selectedDate, defaultProject]);

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
      console.log(`🔍 Total projects loaded: ${projectsData.length}`);
      console.log(`🎯 Projects with slot system enabled: ${slotEnabledProjects.length}`);
      
      if (slotEnabledProjects.length > 0) {
        console.log('✅ Slot-enabled projects:');
        slotEnabledProjects.forEach(p => {
          console.log(`   - ${p.name} (${p._id}): ${p.slotConfiguration?.totalSlots || 0} slots`);
        });
      } else {
        console.log('❌ No projects found with slot system enabled!');
        console.log('💡 To enable slots: Go to project settings → Enable "Slot-based Progress Tracking"');
      }

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
      const response = await projectApi.getAvailableSlots(projectId);
      if (response.success) {
        setAvailableSlots(response.data?.slots || []);
      }
    } catch (error) {
      console.error("Error loading available slots:", error);
      setAvailableSlots([]);
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
          console.log('🎯 Slot configuration:', project.slotConfiguration);
          console.log('🎯 Slot system enabled:', project.slotConfiguration?.enableSlotSystem);
          setSelectedProject(project);
          
          // If project has slot system, we already have the data
          if (project.slotConfiguration?.enableSlotSystem) {
            console.log('✅ Project has slot system enabled, loading slots...');
          } else {
            console.log('❌ Project does NOT have slot system enabled');
          }
        } else {
          // Fallback: fetch project details from API
          console.log('🔍 Project not found in list, fetching from API...');
          const projectResponse = await projectApi.getProjectById(projectId);
          if (projectResponse.success) {
            console.log('🔍 Project details from API:', projectResponse.data.name);
            console.log('🎯 API Slot configuration:', projectResponse.data.slotConfiguration);
            setSelectedProject(projectResponse.data);
          }
        }
      } catch (error) {
        console.error('❌ Error loading project details:', error);
      }
    } else {
      setSelectedProject(null);
    }
  };

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
        type: formData.workItemType,
        title: formData.title,
        description: formData.description,
        project: formData.project,
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };

      // Add content-specific fields
      if (formData.workItemType === 'content') {
        workItemData.platform = formData.platform;
        workItemData.postType = formData.postType;
        workItemData.contentBucket = formData.contentBucket;
      }

      // Create work item
      const workItemResult = await workItemApi.createWorkItem(workItemData);
      
      // Handle slot assignment in parallel if needed
      if (formData.assignToSlot && formData.selectedSlot && selectedProject?.slotConfiguration?.enableSlotSystem) {
        // Don't wait for slot assignment - do it in background
        projectApi.assignWorkItemToSlot(
          formData.selectedSlot, 
          workItemResult.data?._id || workItemResult._id,
          'Work item created and assigned to slot'
        ).then(() => {
          console.log('✅ Work item assigned to slot successfully');
        }).catch(slotError => {
          console.error('⚠️ Error assigning work item to slot:', slotError);
          // Show a non-blocking warning
          setTimeout(() => {
            toast.warning('Work item created but slot assignment failed. You can assign it manually later.');
          }, 1000);
        });
        
        toast.success('Work item created successfully! Slot assignment in progress...');
      } else {
        toast.success('Work item created successfully!');
      }

      // Call success callback immediately
      if (onSuccess) {
        onSuccess(workItemResult);
      }

      // Close modal immediately
      onHide();
      
    } catch (error) {
      console.error('Error creating work item:', error);
      toast.error(error.response?.data?.message || 'Failed to create work item');
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
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaTasks />
          Create Work Item
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
                    <Form.Select
                      value={formData.project}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      isInvalid={!!errors.project}
                    >
                      <option value="">Select Project...</option>
                      {projects.map(project => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                          {project.slotConfiguration?.enableSlotSystem && ' 🎯'}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.project}
                    </Form.Control.Feedback>
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
                      {users.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.role})
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
                        <Form.Select
                          value={formData.selectedSlot}
                          onChange={(e) => handleInputChange('selectedSlot', e.target.value)}
                          isInvalid={!!errors.selectedSlot}
                        >
                          <option value="">Choose a slot...</option>
                          {availableSlots.map(slot => (
                            <option key={slot._id} value={slot._id}>
                              Slot {slot.slotNumber} - {slot.title}
                            </option>
                          ))}
                        </Form.Select>
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
    </Modal>
  );
};

export default ProfessionalWorkCreationModal;