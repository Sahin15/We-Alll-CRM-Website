import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { FaTasks, FaPlusCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import workItemApi from '../../api/workItemApi';
import projectApi from '../../api/projectApi';
import userApi from '../../api/userApi';
import TeamMemberWorkloadInfo from '../workload/TeamMemberWorkloadInfo';

/**
 * AssignWorkModal - Reusable modal for assigning work to team members
 * Can be used from any page (My Work, Calendar, etc.)
 * @param {Object} slotInfo - Optional slot information for slot-based assignments
 */
const AssignWorkModal = ({ show, onHide, onSuccess, defaultProject = null, defaultAssignee = null, slotInfo = null }) => {
  const [assigning, setAssigning] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Store all users
  const [slots, setSlots] = useState([]); // Store available slots
  const [loadingData, setLoadingData] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedUserForWorkload, setSelectedUserForWorkload] = useState(null); // Track selected user for workload display
  const [pendingWorkCount, setPendingWorkCount] = useState(0); // Track pending work for selected due date
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignedTo: '',
    assignedToMultiple: [], // New field for multiple assignees
    assignmentMode: 'single', // 'single' or 'multiple'
    dueDate: '',
    priority: '',
    selectedSlot: '', // Add slot selection
    visibility: 'active', // 'draft', 'scheduled', or 'active'
    scheduledActivationDate: '' // When to activate if scheduled
  });

  // Load projects and users when modal opens
  useEffect(() => {
    if (show) {
      // Reset form when modal opens, but use defaults if provided
      setFormData({
        title: '',
        description: '',
        project: defaultProject || '',
        assignedTo: defaultAssignee || '',
        assignedToMultiple: defaultAssignee ? [defaultAssignee] : [],
        assignmentMode: defaultAssignee ? 'single' : 'single',
        dueDate: '',
        priority: '',
        selectedSlot: '',
        visibility: 'active',
        scheduledActivationDate: ''
      });
      setSelectedProject(null);
      setSlots([]);
      loadProjectsAndUsers();
    }
  }, [show, defaultProject, defaultAssignee]);

  // Auto-load project data when defaultProject is provided and projects are loaded
  useEffect(() => {
    if (show && defaultProject && projects.length > 0) {
      handleProjectChange(defaultProject);
    }
  }, [show, defaultProject, projects.length]); // Use projects.length instead of projects array

  const loadProjectsAndUsers = async () => {
    try {
      setLoadingData(true);
      const [projectsRes, usersRes] = await Promise.all([
        projectApi.getAllProjects(),
        userApi.getAllUsers()
      ]);
      const loadedProjects = projectsRes.data || projectsRes.projects || [];
      const loadedUsers = usersRes.data || usersRes.users || [];
      
      setProjects(loadedProjects);
      setAllUsers(loadedUsers);
      setUsers(loadedUsers); // Initially show all users
    } catch (error) {
      toast.error('Failed to load projects and users');
    } finally {
      setLoadingData(false);
    }
  };

  // Filter users when project is selected
  const handleProjectChange = async (projectId) => {
    setFormData({ 
      ...formData, 
      project: projectId, 
      assignedTo: '', 
      assignedToMultiple: [],
      selectedSlot: '' 
    }); // Reset assignees and slot when project changes
    
    if (projectId) {
      // Find the selected project
      const project = projects.find(p => p._id === projectId);
      setSelectedProject(project);
      
      if (project) {
        // Get team members from the project
        const teamMemberIds = [
          ...(project.assignedUsers || []).map(u => u._id || u),
          project.projectHead?._id || project.projectHead
        ].filter(Boolean);
        
        // Filter users to show only team members
        const teamMembers = allUsers.filter(u => teamMemberIds.includes(u._id));
        setUsers(teamMembers);

        // Load slots if project has slot system enabled
        if (project.slotConfiguration?.enableSlotSystem) {
          try {
            const slotsResponse = await projectApi.getProjectSlots(projectId);
            const loadedSlots = slotsResponse.data || [];
            setSlots(loadedSlots);
          } catch (error) {
            setSlots([]);
          }
        } else {
          setSlots([]);
        }
      }
    } else {
      // No project selected, show all users
      setUsers(allUsers);
      setSelectedProject(null);
      setSlots([]);
    }
  };

  // Fetch pending work count for selected due date and assignee
  const fetchPendingWorkCount = async (userId, dueDate) => {
    if (!userId || !dueDate) {
      setPendingWorkCount(0);
      return;
    }

    try {
      // Count active work items for this user on the selected due date
      const response = await workItemApi.getPendingWorkCount(userId, dueDate);
      setPendingWorkCount(response.data?.count || 0);
    } catch (error) {
      console.error('Error fetching pending work count:', error);
      setPendingWorkCount(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate based on assignment mode
    const hasAssignee = formData.assignmentMode === 'single' 
      ? formData.assignedTo 
      : formData.assignedToMultiple.length > 0;
    
    if (!formData.title || !formData.project || !formData.dueDate || !formData.priority) {
      toast.error('Please fill in all required fields');
      return;
    }

    // For scheduled/active mode, assignee is required. For draft, it's optional
    if (formData.visibility !== 'draft' && !hasAssignee) {
      toast.error('Please assign work to at least one team member');
      return;
    }

    // Validate scheduled activation date
    if (formData.visibility === 'scheduled' && !formData.scheduledActivationDate) {
      toast.error('Please select an activation date for scheduled work');
      return;
    }

    if (formData.visibility === 'scheduled') {
      const activationDate = new Date(formData.scheduledActivationDate);
      const dueDate = new Date(formData.dueDate);
      if (activationDate > dueDate) {
        toast.error('Activation date cannot be after due date');
        return;
      }
    }

    try {
      setAssigning(true);

      const workItemData = {
        title: formData.title,
        description: formData.description,
        type: 'task',
        project: formData.project,
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: 'To Do',
        visibility: formData.visibility,
      };

      // Add scheduled activation date if applicable
      if (formData.visibility === 'scheduled') {
        workItemData.scheduledActivationDate = formData.scheduledActivationDate;
      }

      // Handle assignee(s) - can be assigned in any mode (draft, scheduled, or active)
      if (formData.assignmentMode === 'multiple' && formData.assignedToMultiple.length > 0) {
        workItemData.assignedToMultiple = formData.assignedToMultiple;
        workItemData.assignedTo = formData.assignedToMultiple[0];
      } else if (formData.assignedTo) {
        workItemData.assignedTo = formData.assignedTo;
      }

      // Add slot assignment if provided
      if (slotInfo) {
        workItemData.assignToSlot = true;
        workItemData.selectedSlot = slotInfo.slotId;
      } else if (formData.selectedSlot) {
        workItemData.assignToSlot = true;
        workItemData.selectedSlot = formData.selectedSlot;
      }

      await workItemApi.createWorkItem(workItemData);
      
      // Show appropriate success message
      let successMessage = 'Work item created successfully';
      if (formData.visibility === 'draft') {
        if (hasAssignee) {
          const assigneeCount = formData.assignmentMode === 'multiple' 
            ? formData.assignedToMultiple.length 
            : 1;
          successMessage = `Draft saved and assigned to ${assigneeCount} team member${assigneeCount > 1 ? 's' : ''}. It will be visible when activated.`;
        } else {
          successMessage = 'Draft saved. You can assign team members later.';
        }
      } else if (formData.visibility === 'scheduled') {
        successMessage = `Work item scheduled. It will be visible to team members on ${new Date(formData.scheduledActivationDate).toLocaleDateString('en-GB')}`;
      } else {
        const assigneeCount = formData.assignmentMode === 'multiple' 
          ? formData.assignedToMultiple.length 
          : 1;
        successMessage = `Work item assigned to ${assigneeCount} team member${assigneeCount > 1 ? 's' : ''}`;
      }
      
      toast.success(successMessage, {
        autoClose: 2000,
        position: 'top-right'
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        project: '',
        assignedTo: '',
        assignedToMultiple: [],
        assignmentMode: 'single',
        dueDate: '',
        priority: '',
        selectedSlot: '',
        visibility: 'active',
        scheduledActivationDate: ''
      });
      setPendingWorkCount(0);
      
      if (onSuccess) onSuccess();
      if (onHide) onHide();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error?.message || 'Failed to create work item');
    } finally {
      setAssigning(false);
    }
  };

  const handleClose = () => {
    if (!assigning && onHide) {
      onHide();
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={handleClose} 
      size="lg"
      centered
    >
      <Modal.Header closeButton={!assigning}>
        <Modal.Title>
          <FaTasks className="me-2" />
          Assign Work
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={12} className="mb-3">
              <Form.Group>
                <Form.Label>Title *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter work item title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={200}
                  disabled={assigning}
                />
              </Form.Group>
            </Col>

            <Col md={12} className="mb-3">
              <Form.Group>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  placeholder="Enter work item description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={5000}
                  disabled={assigning}
                  style={{ resize: "vertical", minHeight: "120px", lineHeight: "1.6" }}
                />
                <Form.Text className="text-muted">
                  {formData.description?.length || 0} / 5000
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Project *</Form.Label>
                <Form.Select
                  value={formData.project}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  required
                  disabled={assigning || loadingData}
                >
                  <option value="">Select project...</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </Form.Select>
                {loadingData && <Form.Text className="text-muted">Loading projects...</Form.Text>}
              </Form.Group>
            </Col>

            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Assignment Mode</Form.Label>
                <div className="d-flex gap-3">
                  <Form.Check
                    type="radio"
                    id="single-assignee"
                    name="assignmentMode"
                    label="Single Assignee"
                    checked={formData.assignmentMode === 'single'}
                    onChange={() => setFormData({ 
                      ...formData, 
                      assignmentMode: 'single',
                      assignedToMultiple: []
                    })}
                    disabled={assigning}
                  />
                  <Form.Check
                    type="radio"
                    id="multiple-assignees"
                    name="assignmentMode"
                    label="Multiple Assignees"
                    checked={formData.assignmentMode === 'multiple'}
                    onChange={() => setFormData({ 
                      ...formData, 
                      assignmentMode: 'multiple',
                      assignedTo: ''
                    })}
                    disabled={assigning}
                  />
                </div>
              </Form.Group>
            </Col>

            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>
                  {formData.assignmentMode === 'single' ? 'Assign To' : 'Assign To (Multiple)'} 
                  {formData.visibility !== 'draft' && ' *'}
                </Form.Label>
                
                {formData.assignmentMode === 'single' ? (
                  <div>
                    <Form.Select
                      value={formData.assignedTo}
                      onChange={(e) => {
                        setFormData({ ...formData, assignedTo: e.target.value });
                        setSelectedUserForWorkload(e.target.value);
                        // Fetch pending work count for selected user and due date
                        if (e.target.value && formData.dueDate) {
                          fetchPendingWorkCount(e.target.value, formData.dueDate);
                        }
                      }}
                      required={formData.visibility !== 'draft'}
                      disabled={assigning || loadingData || !formData.project}
                    >
                      <option value="">
                        {!formData.project 
                          ? 'Select project first...' 
                          : users.length === 0 
                            ? 'No team members in this project'
                            : 'Select team member...'}
                      </option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name}
                        </option>
                      ))}
                    </Form.Select>
                    {selectedUserForWorkload && formData.dueDate && (
                      <div className="mt-2 p-2 bg-light rounded">
                        <small className="text-muted">
                          Pending work on {new Date(formData.dueDate + 'T00:00:00').toLocaleDateString('en-GB')}: 
                          <strong className="ms-1 text-primary">{pendingWorkCount} item(s)</strong>
                        </small>
                      </div>
                    )}
                    {selectedUserForWorkload && (
                      <TeamMemberWorkloadInfo 
                        userId={selectedUserForWorkload}
                        userName={users.find(u => u._id === selectedUserForWorkload)?.name || 'Team Member'}
                        projectId={formData.project}
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="border rounded p-3 mb-3" style={{ minHeight: '50px', maxHeight: '250px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
                      {formData.assignedToMultiple.length === 0 ? (
                        <small className="text-muted d-block text-center py-2">No team members selected</small>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {formData.assignedToMultiple.map(userId => {
                            const user = users.find(u => u._id === userId);
                            return user ? (
                              <div key={userId} className="d-flex justify-content-between align-items-center p-2 bg-white rounded border">
                                <div className="flex-grow-1">
                                  <span className="badge bg-primary me-2">{formData.assignedToMultiple.indexOf(userId) + 1}</span>
                                  <strong>{user.name}</strong>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      assignedToMultiple: formData.assignedToMultiple.filter(id => id !== userId)
                                    });
                                  }}
                                  disabled={assigning}
                                  title="Remove this team member from assignment"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <Form.Select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !formData.assignedToMultiple.includes(e.target.value)) {
                          setFormData({
                            ...formData,
                            assignedToMultiple: [...formData.assignedToMultiple, e.target.value]
                          });
                        }
                      }}
                      disabled={assigning || loadingData || !formData.project}
                    >
                      <option value="">
                        {!formData.project 
                          ? 'Select project first...' 
                          : users.length === 0 
                            ? 'No team members in this project'
                            : 'Add team member...'}
                      </option>
                      {users
                        .filter(user => !formData.assignedToMultiple.includes(user._id))
                        .map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name}
                          </option>
                        ))}
                    </Form.Select>
                  </div>
                )}
                
                {loadingData && <Form.Text className="text-muted">Loading users...</Form.Text>}
                {formData.project && users.length === 0 && !loadingData && formData.visibility !== 'draft' && (
                  <Form.Text className="text-danger">
                    This project has no team members. Add team members first.
                  </Form.Text>
                )}
                {formData.visibility === 'draft' && (
                  <Form.Text className="text-info">
                    Optional: You can assign team members now or later when you activate this work.
                  </Form.Text>
                )}
              </Form.Group>
            </Col>

            {/* Slot Selector - Only show if project has slots enabled and no slotInfo prop */}
            {(() => {
              const shouldShow = selectedProject?.slotConfiguration?.enableSlotSystem && !slotInfo;
              return shouldShow;
            })() && (
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Assign to Slot (Optional)</Form.Label>
                  <Form.Select
                    value={formData.selectedSlot}
                    onChange={(e) => {
                      setFormData({ ...formData, selectedSlot: e.target.value });
                    }}
                    disabled={assigning || loadingData}
                  >
                    <option value="">No slot (unassigned)</option>
                    {slots
                      .sort((a, b) => a.slotNumber - b.slotNumber)
                      .map((slot) => (
                        <option key={slot._id} value={slot._id}>
                          {slot.title || `Slot ${slot.slotNumber}`}
                        </option>
                      ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Work items can be assigned to slots or left unassigned
                  </Form.Text>
                </Form.Group>
              </Col>
            )}

            {/* Show slot info if provided via prop */}
            {slotInfo && (
              <Col md={12} className="mb-3">
                <div className="alert alert-info mb-0">
                  <strong>Slot Assignment:</strong> This work will be assigned to Slot {slotInfo.slotNumber}
                  {slotInfo.slotTitle && ` - ${slotInfo.slotTitle}`}
                </div>
              </Col>
            )}

            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Due Date *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  disabled={assigning}
                />
              </Form.Group>
            </Col>

            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Priority *</Form.Label>
                <Form.Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  required
                  disabled={assigning}
                >
                  <option value="">Select priority...</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Visibility Options */}
            <Col md={12} className="mb-3">
              <Form.Group>
                <Form.Label>Work Visibility</Form.Label>
                <div className="d-flex gap-3">
                  <Form.Check
                    type="radio"
                    id="visibility-draft"
                    name="visibility"
                    label="Draft (Save for later, not visible to team)"
                    checked={formData.visibility === 'draft'}
                    onChange={() => setFormData({ 
                      ...formData, 
                      visibility: 'draft',
                      assignedTo: '',
                      assignedToMultiple: [],
                      scheduledActivationDate: ''
                    })}
                    disabled={assigning}
                  />
                  <Form.Check
                    type="radio"
                    id="visibility-scheduled"
                    name="visibility"
                    label="Scheduled (Activate on specific date)"
                    checked={formData.visibility === 'scheduled'}
                    onChange={() => setFormData({ 
                      ...formData, 
                      visibility: 'scheduled'
                    })}
                    disabled={assigning}
                  />
                  <Form.Check
                    type="radio"
                    id="visibility-active"
                    name="visibility"
                    label="Active (Visible immediately)"
                    checked={formData.visibility === 'active'}
                    onChange={() => setFormData({ 
                      ...formData, 
                      visibility: 'active',
                      scheduledActivationDate: ''
                    })}
                    disabled={assigning}
                  />
                </div>
              </Form.Group>
            </Col>

            {/* Scheduled Activation Date */}
            {formData.visibility === 'scheduled' && (
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Activation Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.scheduledActivationDate}
                    onChange={(e) => setFormData({ ...formData, scheduledActivationDate: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    disabled={assigning}
                  />
                  <Form.Text className="text-muted">
                    Work will become visible to team members on this date
                  </Form.Text>
                </Form.Group>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleClose}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={assigning}
          >
            {assigning ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Assigning...
              </>
            ) : (
              <>
                <FaPlusCircle className="me-2" />
                Assign Work
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AssignWorkModal;
