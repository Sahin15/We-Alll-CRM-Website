import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button, Row, Col, Badge, Alert } from 'react-bootstrap';
import { FaTasks, FaPlusCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import workItemApi from '../../api/workItemApi';
import projectApi from '../../api/projectApi';
import userApi from '../../api/userApi';
import departmentApi from '../../api/departmentApi';
import TeamMemberWorkloadInfo from '../workload/TeamMemberWorkloadInfo';

/**
 * AssignWorkModal - Reusable modal for assigning work to team members
 * Can be used from any page (My Work, Calendar, etc.)
 * @param {Object} slotInfo - Optional slot information for slot-based assignments
 * @param {string|Object} defaultProject - Project ID or full project object
 */
const AssignWorkModal = ({ show, onHide, onSuccess, defaultProject = null, defaultAssignee = null, slotInfo = null }) => {
  const [assigning, setAssigning] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Store all users
  const [slots, setSlots] = useState([]); // Store available slots
  const [availableMonths, setAvailableMonths] = useState([]); // Store unique months from slots
  const [selectedMonth, setSelectedMonth] = useState(null); // Track selected month for slot filtering
  const [loadingData, setLoadingData] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedUserForWorkload, setSelectedUserForWorkload] = useState(null); // Track selected user for workload display
  const [pendingWorkCount, setPendingWorkCount] = useState(0); // Track pending work for selected due date
  const [departments, setDepartments] = useState([]);
  const [postingUsers, setPostingUsers] = useState([]);
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
    scheduledActivationDate: '', // When to activate if scheduled
    requiresPosting: false,
    postingAssignedTo: '',
    postingDate: '',
  });

  /** @param {string} [name] */
  const isCreativeDepartmentName = (name) => {
    const n = String(name || '').toLowerCase();
    return (
      n.includes('design') ||
      n.includes('graphic') ||
      n.includes('video')
    );
  };

  /** Collect department names linked on the project (populated or ID). */
  const getProjectDepartmentNames = (project) => {
    const names = [];
    const pushName = (value) => {
      if (value) names.push(String(value).toLowerCase());
    };
    if (!project) return names;
    if (Array.isArray(project.departments)) {
      project.departments.forEach((dept) => {
        if (typeof dept === 'object' && dept?.name) pushName(dept.name);
        else if (dept) {
          const match = departments.find((d) => String(d._id) === String(dept));
          pushName(match?.name);
        }
      });
    }
    if (project.department) {
      if (typeof project.department === 'object') {
        pushName(project.department.name);
      } else {
        const match = departments.find(
          (d) => String(d._id) === String(project.department)
        );
        pushName(match?.name);
      }
    }
    return names;
  };

  const findUserById = (userId) => {
    if (!userId) return null;
    const id = String(userId);
    return (
      users.find((u) => String(u._id) === id) ||
      allUsers.find((u) => String(u._id) === id) ||
      null
    );
  };

  const projectSupportsCreative = useMemo(() => {
    return getProjectDepartmentNames(selectedProject).some(isCreativeDepartmentName);
  }, [selectedProject, departments]);

  const selectedAssigneeIds = useMemo(() => {
    if (formData.assignmentMode === 'multiple') {
      return formData.assignedToMultiple || [];
    }
    return formData.assignedTo ? [formData.assignedTo] : [];
  }, [formData.assignmentMode, formData.assignedTo, formData.assignedToMultiple]);

  // Creative handoff must react to assignee department (Design / Graphic / Video),
  // not only whether the project has those services linked.
  const assigneeSupportsCreative = useMemo(() => {
    return selectedAssigneeIds.some((id) => {
      const user = findUserById(id);
      return isCreativeDepartmentName(user?.department?.name);
    });
  }, [selectedAssigneeIds, users, allUsers]);

  const isCreativeAssignment =
    projectSupportsCreative || assigneeSupportsCreative;

  // Always show posting option once a project is chosen so HR/managers can tick it
  // even before Posting members exist or project services are linked.
  const showPostingHandoff = Boolean(formData.project);

  // Load projects and users when modal opens
  useEffect(() => {
    if (show) {
      const defaultProjectId =
        typeof defaultProject === 'object' && defaultProject?._id
          ? defaultProject._id
          : defaultProject || '';
      setFormData({
        title: '',
        description: '',
        project: defaultProjectId,
        assignedTo: defaultAssignee || '',
        assignedToMultiple: defaultAssignee ? [defaultAssignee] : [],
        assignmentMode: 'single',
        dueDate: '',
        priority: '',
        selectedSlot: '',
        visibility: 'active',
        scheduledActivationDate: '',
        requiresPosting: false,
        postingAssignedTo: '',
        postingDate: '',
      });
      setSelectedProject(null);
      setSelectedUserForWorkload(null);
      setUsers([]);
      setSlots([]);
      loadProjectsAndUsers();
      loadPostingSupportData();
    }
  }, [show, defaultProject, defaultAssignee]);

  // Auto-load project data when defaultProject is provided and projects are loaded
  useEffect(() => {
    if (show && defaultProject && projects.length > 0) {
      if (typeof defaultProject === 'object' && defaultProject._id) {
        handleProjectChange(defaultProject._id);
      } else if (typeof defaultProject === 'string') {
        handleProjectChange(defaultProject);
      }
    }
  }, [show, defaultProject, projects.length]);

  const normalizeUserList = (usersRes) => {
    if (Array.isArray(usersRes)) return usersRes;
    if (Array.isArray(usersRes?.data)) return usersRes.data;
    if (Array.isArray(usersRes?.users)) return usersRes.users;
    return [];
  };

  const loadPostingSupportData = async () => {
    try {
      const [deptRes, usersRes] = await Promise.all([
        departmentApi.getAllDepartments(),
        userApi.getAllUsers({ status: 'active', limit: 1000 }),
      ]);
      const deptList = Array.isArray(deptRes)
        ? deptRes
        : deptRes?.data || deptRes?.departments || [];
      const userList = normalizeUserList(usersRes);
      setDepartments(Array.isArray(deptList) ? deptList : []);
      setAllUsers(userList);
      setPostingUsers(
        userList.filter((u) =>
          String(u.department?.name || '')
            .toLowerCase()
            .includes('posting')
        )
      );
    } catch (error) {
      console.error('[AssignWorkModal] Failed to load posting support data:', error);
      setDepartments([]);
      setPostingUsers([]);
    }
  };

  const loadProjectsAndUsers = async () => {
    try {
      setLoadingData(true);
      // Only load projects initially, load users only when project is selected
      const projectsRes = await projectApi.getAllProjects();
      const loadedProjects = projectsRes.data || projectsRes.projects || [];
      
      console.log('[AssignWorkModal] Projects loaded:', loadedProjects.length);
      if (loadedProjects.length > 0) {
        console.log('[AssignWorkModal] First project:', {
          name: loadedProjects[0].name,
          assignedUsers: loadedProjects[0].assignedUsers,
          projectHead: loadedProjects[0].projectHead
        });
      }
      
      setProjects(loadedProjects);
      setAllUsers([]); // Don't load all users upfront
      setUsers([]); // Users will be loaded when project is selected
    } catch (error) {
      console.error('[AssignWorkModal] Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingData(false);
    }
  };

  // Filter users when project is selected
  const initializeMonthsFromSlots = (loadedSlots) => {
    if (!loadedSlots || loadedSlots.length === 0) {
      setAvailableMonths([]);
      setSelectedMonth(null);
      return;
    }

    // Get unique months from slots
    const months = [...new Set(loadedSlots.map(s => s.period?.periodIdentifier))].filter(Boolean);
    months.sort(); // Sort chronologically
    setAvailableMonths(months);

    // Determine current month in YYYY-MM format
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentPeriodIdentifier = `${currentYear}-${currentMonth}`;

    // Set current month as default if available, otherwise first available month
    const defaultMonth = months.includes(currentPeriodIdentifier) ? currentPeriodIdentifier : months[0];
    setSelectedMonth(defaultMonth);
  };

  const formatMonthDisplay = (periodIdentifier) => {
    if (!periodIdentifier) return periodIdentifier;
    // Format: "2024-03" -> "March 2024"
    const [year, month] = periodIdentifier.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  const handleProjectChange = async (projectId) => {
    setFormData((prev) => ({
      ...prev,
      project: projectId,
      assignedTo: '',
      assignedToMultiple: [],
      selectedSlot: '',
      requiresPosting: false,
      postingAssignedTo: '',
      postingDate: '',
    }));
    setSelectedUserForWorkload(null);
    setPendingWorkCount(0);

    if (!projectId) {
      setUsers([]);
      setSelectedProject(null);
      setSlots([]);
      setAvailableMonths([]);
      setSelectedMonth(null);
      return;
    }

    const project = projects.find((p) => p._id === projectId) || null;
    setSelectedProject(project);

    if (!project) return;

    const teamMemberIds = new Set();
    if (Array.isArray(project.assignedUsers)) {
      project.assignedUsers.forEach((u) => {
        const userId = u?._id || u;
        if (userId) teamMemberIds.add(String(userId));
      });
    }
    if (Array.isArray(project.teamMembers)) {
      project.teamMembers.forEach((tm) => {
        const userId = tm?.user?._id || tm?.user;
        if (userId) teamMemberIds.add(String(userId));
      });
    }
    if (project.projectHead) {
      const headId = project.projectHead._id || project.projectHead;
      if (headId) teamMemberIds.add(String(headId));
    }

    try {
      setLoadingData(true);
      const usersRes = await userApi.getAllUsers({ status: 'active', limit: 1000 });
      const allFetchedUsers = normalizeUserList(usersRes);
      setAllUsers(allFetchedUsers);
      setPostingUsers(
        allFetchedUsers.filter((u) =>
          String(u.department?.name || '')
            .toLowerCase()
            .includes('posting')
        )
      );

      let teamMembers =
        teamMemberIds.size > 0
          ? allFetchedUsers.filter((u) => teamMemberIds.has(String(u._id)))
          : [];

      // Always allow assignment — if project has no linked members yet, show all active users
      if (teamMembers.length === 0) {
        teamMembers = allFetchedUsers;
      }

      setUsers(teamMembers);
    } catch (error) {
      console.error('[AssignWorkModal] Error loading team members:', error);
      setUsers([]);
    } finally {
      setLoadingData(false);
    }

    if (project.slotConfiguration?.enableSlotSystem) {
      try {
        const slotsResponse = await projectApi.getProjectSlots(projectId);
        const loadedSlots = slotsResponse.data || [];
        setSlots(loadedSlots);
        initializeMonthsFromSlots(loadedSlots);
      } catch (error) {
        console.error('Error loading slots:', error);
        setSlots([]);
        setAvailableMonths([]);
        setSelectedMonth(null);
      }
    } else {
      setSlots([]);
      setAvailableMonths([]);
      setSelectedMonth(null);
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

    if (showPostingHandoff && formData.requiresPosting) {
      if (!formData.postingAssignedTo) {
        toast.error('Please select a Posting department team member');
        return;
      }
      if (!formData.postingDate) {
        toast.error('Please select a posting date');
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

      if (showPostingHandoff) {
        if (isCreativeAssignment || formData.requiresPosting) {
          workItemData.workflowMode = 'creative';
          const deptNames = [
            ...getProjectDepartmentNames(selectedProject),
            ...selectedAssigneeIds.map((id) => {
              const user = findUserById(id);
              return String(user?.department?.name || '').toLowerCase();
            }),
          ].filter(Boolean);
          workItemData.workflowType = deptNames.some((n) => n.includes('video'))
            ? 'video-production'
            : 'design';
        }
        workItemData.requiresPosting = Boolean(formData.requiresPosting);
        if (formData.requiresPosting) {
          workItemData.postingAssignedTo = formData.postingAssignedTo;
          workItemData.postingDate = formData.postingDate;
        }
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
        scheduledActivationDate: '',
        requiresPosting: false,
        postingAssignedTo: '',
        postingDate: '',
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
                  rows={4}
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

            <Col md={8} className="mb-3">
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

            <Col md={4} className="mb-3">
              <Form.Group>
                <Form.Label>Assignment Mode</Form.Label>
                <div className="d-flex flex-column gap-2 pt-1">
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

            <Col md={12} className="mb-3">
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
                          {user.department?.name ? ` · ${user.department.name}` : ''}
                        </option>
                      ))}
                    </Form.Select>
                    {assigneeSupportsCreative && (
                      <Alert variant="info" className="py-2 small mt-2 mb-0">
                        Assignee is in Design / Graphic / Video — use the Posting option below if We Alll should publish this content.
                      </Alert>
                    )}
                    {selectedUserForWorkload && formData.dueDate && (
                      <div className="workload-info">
                        Pending work on {new Date(formData.dueDate + 'T00:00:00').toLocaleDateString('en-GB')}: 
                        <strong className="ms-1">{pendingWorkCount} item(s)</strong>
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
                    <div className="assignee-list mb-3" style={{ minHeight: '50px', maxHeight: '180px', overflowY: 'auto' }}>
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
                            {user.department?.name ? ` · ${user.department.name}` : ''}
                          </option>
                        ))}
                    </Form.Select>
                    {assigneeSupportsCreative && (
                      <Alert variant="info" className="py-2 small mt-2 mb-0">
                        Selected assignee(s) include Design / Graphic / Video — tick Posting below if We Alll should publish.
                      </Alert>
                    )}
                  </div>
                )}
                
                {loadingData && <Form.Text className="text-muted">Loading users...</Form.Text>}
                {formData.visibility === 'draft' && (
                  <Form.Text className="text-info">
                    Optional: You can assign team members now or later when you activate this work.
                  </Form.Text>
                )}
              </Form.Group>
            </Col>

            {showPostingHandoff && (
              <Col md={12} className="mb-3">
                <div className="border rounded p-3 bg-light">
                  <div className="fw-semibold mb-2">Posting Department (optional)</div>
                  <Form.Check
                    type="checkbox"
                    id="assign-requires-posting"
                    className="mb-2"
                    label="Assign to Posting department (We Alll will post this content)"
                    checked={formData.requiresPosting}
                    disabled={assigning}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData({
                        ...formData,
                        requiresPosting: checked,
                        postingAssignedTo: checked ? formData.postingAssignedTo : '',
                        postingDate: checked ? formData.postingDate : '',
                      });
                    }}
                  />
                  {!formData.requiresPosting ? (
                    <Alert variant="secondary" className="py-2 small mb-0">
                      Not selected — client will post the content. No Posting member or posting date needed.
                    </Alert>
                  ) : (
                    <Row>
                      <Col md={6} className="mb-2">
                        <Form.Group>
                          <Form.Label className="fw-semibold">
                            Posting team member <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Select
                            value={formData.postingAssignedTo}
                            onChange={(e) =>
                              setFormData({ ...formData, postingAssignedTo: e.target.value })
                            }
                            disabled={assigning}
                            required
                          >
                            <option value="">Select Posting member...</option>
                            {postingUsers.map((u) => (
                              <option key={u._id || u.id} value={u._id || u.id}>
                                {u.name}
                              </option>
                            ))}
                          </Form.Select>
                          {postingUsers.length === 0 && (
                            <Form.Text className="text-warning">
                              No Posting department users found. Assign employees to the Posting department first (HR → Departments).
                            </Form.Text>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-2">
                        <Form.Group>
                          <Form.Label className="fw-semibold">
                            Posting date <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            type="date"
                            value={formData.postingDate}
                            onChange={(e) =>
                              setFormData({ ...formData, postingDate: e.target.value })
                            }
                            disabled={assigning}
                            required
                          />
                          <Form.Text className="text-muted">
                            Separate from creative due date — when content should go live.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                </div>
              </Col>
            )}

            {/* Slot Selector - Only show if project has slots enabled and no slotInfo prop */}
            {(() => {
              const shouldShow = selectedProject?.slotConfiguration?.enableSlotSystem && !slotInfo;
              return shouldShow;
            })() && (
              <Col md={12} className="mb-3">
                {/* Month Selector - Only show if multiple months available */}
                {availableMonths.length > 1 && (
                  <div className="mb-3 p-2 bg-light rounded">
                    <div className="d-flex align-items-center gap-2">
                      <label className="mb-0 fw-semibold" style={{ minWidth: '100px' }}>📅 Month:</label>
                      <Form.Select
                        value={selectedMonth || ''}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ maxWidth: '250px' }}
                        size="sm"
                      >
                        {availableMonths.map(month => (
                          <option key={month} value={month}>
                            {formatMonthDisplay(month)}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                  </div>
                )}

                <Form.Group>
                  <Form.Label>Assign to Slot (Optional)</Form.Label>
                  <Form.Select
                    value={formData.selectedSlot}
                    onChange={(e) => {
                      setFormData({ ...formData, selectedSlot: e.target.value });
                    }}
                    disabled={assigning || loadingData || slots.length === 0}
                  >
                    <option value="">No slot (unassigned)</option>
                    {slots
                      .filter(slot => !selectedMonth || slot.period?.periodIdentifier === selectedMonth)
                      .sort((a, b) => a.slotNumber - b.slotNumber)
                      .map((slot) => (
                        <option key={slot._id} value={slot._id}>
                          {slot.title || `Slot ${slot.slotNumber}`}
                        </option>
                      ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {slots.length === 0 
                      ? 'No slots available for this project'
                      : 'Select a slot to assign this work to a specific project slot'}
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
