import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  ListGroup,
  Table,
  Form,
  Modal,
  Tabs,
  Tab,
  Alert,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEdit,
  FaUser,
  FaCalendar,
  FaBuilding,
  FaUserTie,
  FaCheckCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { projectApi } from "../../api/projectApi";
import { workItemApi } from "../../api/workItemApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../api/userApi";
import SlotProgressDisplay from "../../components/projects/SlotProgressDisplay";
import SlotStatisticsCards from "../../components/projects/SlotStatisticsCards";

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newProgress, setNewProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  // Slot system states
  const [slots, setSlots] = useState([]);
  const [slotStatistics, setSlotStatistics] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Team member management states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberRole, setMemberRole] = useState("other");
  
  // HoP assignment states
  const [showAssignHoPModal, setShowAssignHoPModal] = useState(false);
  const [selectedHoPId, setSelectedHoPId] = useState("");
  const [isAssigningHoP, setIsAssigningHoP] = useState(false);
  
  // Slot reassignment states
  const [availableUsers, setAvailableUsers] = useState([]);
  


  // Check if user can edit (admin, superadmin, hod)
  const canEdit = ["admin", "superadmin", "hod"].includes(user?.role);

  // Check if user is project head
  const isProjectHead = canEdit || (project?.projectHead?._id === user?._id);
  
  // Check if user is a team member
  const isTeamMember = project?.teamMembers?.some(
    member => member.user?._id === user?._id || member.user === user?._id
  ) || project?.assignedUsers?.some(
    userId => userId === user?._id || userId._id === user?._id
  );

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  useEffect(() => {
    // Fetch slot data when project is loaded and uses slot system
    if (project && project.slotConfiguration?.enableSlotSystem) {
      // console.log("🎯 Slot system detected! Fetching slot data...");
      fetchSlotData();
      fetchAvailableUsersForReassignment();
    } else if (project) {
      // console.log("📋 Traditional project - no slot system enabled");
      // console.log("Project slot config:", project.slotConfiguration);
    }
  }, [project]);

  const fetchProjectDetails = async () => {
    try {
      const response = await projectApi.getProjectById(id);
      // console.log("Project API response:", response); // Debug log
      
      // Handle different response formats
      const projectData = response?.data || response;
      
      if (projectData) {
        // console.log("🔍 Project data loaded:", projectData);
        // console.log("🔍 Slot configuration:", projectData.slotConfiguration);
        // console.log("🔍 Progress tracking:", projectData.progressTracking);
        setProject(projectData);
      } else {
        console.error("No project data in response:", response);
        toast.error("Project data not found");
        setProject(null);
      }
    } catch (error) {
      console.error("Project fetch error:", error);
      console.error("Error response:", error.response);
      
      if (error.response?.status === 403) {
        toast.error(
          "Access denied. You can only view projects you are assigned to."
        );
        navigate("/projects");
      } else if (error.response?.status === 404) {
        toast.error("Project not found");
        setProject(null);
      } else {
        toast.error("Failed to fetch project details");
        setProject(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSlotData = async () => {
    if (!project?._id) return;
    
    setLoadingSlots(true);
    try {
      // Fetch statistics and slots in parallel
      const [statsResponse, slotsResponse] = await Promise.all([
        projectApi.getProjectSlotStatistics(project._id).catch(err => {
          console.error('[ProjectDetails] Error fetching slot statistics:', err);
          return { success: false };
        }),
        projectApi.getAvailableSlots(project._id, { includeAll: true }).catch(err => {
          console.error('[ProjectDetails] Error fetching slots:', err);
          return { success: false };
        })
      ]);

      if (statsResponse.success) {
        setSlotStatistics(statsResponse.data);
      }

      if (slotsResponse.success) {
        const fetchedSlots = slotsResponse.data?.slots || [];
        console.log('[ProjectDetails] Received', fetchedSlots.length, 'slots from API');
        setSlots(fetchedSlots);
      }
    } catch (error) {
      console.error("Error fetching slot data:", error);
      // Don't show error toast as slot system is optional
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleRefreshSlotData = async () => {
    await fetchSlotData();
  };

  const fetchAvailableMembers = async () => {
    try {
      // Fetch all employees from the project's department
      const response = await userApi.getAllUsers();
      const allUsers = response.data || [];
      
      // Filter out users who are already team members
      const assignedUserIds = project?.assignedUsers?.map(u => u._id || u) || [];
      const teamMemberIds = project?.teamMembers?.map(m => m.user?._id || m.user || m._id || m) || [];
      const currentMemberIds = [...assignedUserIds, ...teamMemberIds];
      const projectHeadId = project?.projectHead?._id || project?.projectHead;
      const projectDeptId = project?.department?._id || project?.department;
      
      // console.log('Project department:', projectDeptId);
      // console.log('Current member IDs:', currentMemberIds);
      // console.log('Project head ID:', projectHeadId);
      
      const available = allUsers.filter(u => {
        // Only include employees and HoDs (exclude admins, clients, superadmins)
        if (u.role !== 'employee' && u.role !== 'hod') {
          return false;
        }
        
        // Exclude if already a team member
        if (currentMemberIds.includes(u._id)) {
          return false;
        }
        
        // Exclude if project head
        if (u._id === projectHeadId) {
          return false;
        }
        
        // Include only if from same department
        if (projectDeptId) {
          const userDeptId = u.department?._id || u.department;
          const matches = userDeptId === projectDeptId;
          if (!matches) {
            // console.log(`User ${u.name} excluded: dept ${userDeptId} !== ${projectDeptId}`);
          }
          return matches;
        }
        
        // If no department on project, still only show employees/HoDs
        return true;
      });
      
      setAvailableMembers(available);
      // console.log('Filtered available members:', available.map(u => ({ name: u.name, dept: u.department })));
    } catch (error) {
      console.error("Failed to fetch available members:", error);
      toast.error("Failed to load available members");
    }
  };

  const handleAddMember = async () => {
    if (!selectedMemberId) {
      toast.error("Please select a team member");
      return;
    }

    try {
      await projectApi.addTeamMember(id, selectedMemberId, memberRole);
      
      toast.success("Team member added successfully!");
      setShowAddMemberModal(false);
      setSelectedMemberId("");
      setMemberRole("other");
      fetchProjectDetails();
    } catch (error) {
      console.error("Failed to add team member:", error);
      toast.error(error.response?.data?.message || "Failed to add team member");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this team member?")) {
      return;
    }

    try {
      await projectApi.removeTeamMember(id, userId);
      toast.success("Team member removed successfully!");
      fetchProjectDetails();
    } catch (error) {
      console.error("Failed to remove team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  const fetchAvailableHoPs = async () => {
    try {
      // Fetch all employees from the project's department
      const response = await userApi.getAllUsers();
      const allUsers = response.data || [];
      
      const projectDeptId = project?.department?._id || project?.department;
      
      // Filter users from the same department (exclude clients)
      const available = allUsers.filter(u => {
        // Exclude clients
        if (u.role === "client") return false;
        
        // Include only if from same department
        if (projectDeptId) {
          const userDeptId = u.department?._id || u.department;
          return userDeptId === projectDeptId;
        }
        
        return true;
      });
      
      setAvailableMembers(available);
    } catch (error) {
      console.error("Failed to fetch available HoPs:", error);
      toast.error("Failed to load available employees");
    }
  };

  const handleAssignHoP = async () => {
    if (!selectedHoPId) {
      toast.error("Please select a project head");
      return;
    }

    setIsAssigningHoP(true);
    try {
      await projectApi.assignHoP(id, selectedHoPId);
      toast.success("Project Head assigned successfully!");
      setShowAssignHoPModal(false);
      setSelectedHoPId("");
      fetchProjectDetails();
    } catch (error) {
      console.error("Failed to assign HoP:", error);
      toast.error(error.response?.data?.message || "Failed to assign Project Head");
    } finally {
      setIsAssigningHoP(false);
    }
  };

  // Fetch available users for slot reassignment
  const fetchAvailableUsersForReassignment = async () => {
    try {
      const response = await userApi.getAllUsers();
      const allUsers = response.data || [];
      
      const projectDeptId = project?.department?._id || project?.department;
      
      // Filter users from the same department (employees and HoDs only)
      const available = allUsers.filter(u => {
        // Only include employees and HoDs
        if (u.role !== 'employee' && u.role !== 'hod') {
          return false;
        }
        
        // Include only if from same department
        if (projectDeptId) {
          const userDeptId = u.department?._id || u.department;
          return userDeptId === projectDeptId;
        }
        
        return true;
      });
      
      setAvailableUsers(available);
    } catch (error) {
      console.error("Failed to fetch available users:", error);
      toast.error("Failed to load available users");
    }
  };

  // Handle slot reassignment
  const handleSlotReassign = async (slot, newAssigneeId) => {
    if (!slot?.assignedWorkItem?._id) {
      throw new Error("No work item found for this slot");
    }

    try {
      await workItemApi.reassignWorkItem(slot.assignedWorkItem._id, newAssigneeId);
      toast.success("Work item reassigned successfully!");
      
      // Refresh slot data to show updated assignment
      await fetchSlotData();
    } catch (error) {
      console.error("Failed to reassign work item:", error);
      throw new Error(error.response?.data?.message || "Failed to reassign work item");
    }
  };

  const handleRemoveHoP = async () => {
    if (!window.confirm("Are you sure you want to remove the current Project Head?")) {
      return;
    }

    try {
      await projectApi.removeProjectHead(id);
      toast.success("Project Head removed successfully!");
      fetchProjectDetails();
    } catch (error) {
      console.error("Failed to remove HoP:", error);
      toast.error("Failed to remove Project Head");
    }
  };

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container fluid>
        <Card>
          <Card.Body className="text-center py-5">
            <h4>Project not found</h4>
            <Button variant="primary" onClick={() => navigate("/projects")}>
              Back to Projects
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const calculateProgress = () => {
    // If project uses slot system, use slot-based progress
    if (project?.slotConfiguration?.enableSlotSystem && project?.progressTracking?.calculationMethod === 'slot-based') {
      return project.progressTracking?.progressPercentage || 0;
    }
    
    // Fallback to traditional progress calculation
    if (project.progress) return project.progress;
    if (project.status === "Completed") return 100;
    if (project.status === "In Progress") return 50;
    return 0;
  };

  const getProgressDisplayType = () => {
    return project?.slotConfiguration?.enableSlotSystem ? 'slot-based' : 'traditional';
  };

  const handleShowStatusModal = () => {
    setNewStatus(project.status);
    setNewProgress(project.progress || calculateProgress());
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      // Update the status using the dedicated status endpoint
      if (newStatus !== project.status) {
        await projectApi.updateProjectStatus(id, newStatus);
      }
      // Update progress if it changed
      if (newProgress !== project.progress) {
        await projectApi.updateProjectProgress(id, newProgress);
      }
      toast.success("Project status updated successfully");
      setShowStatusModal(false);
      fetchProjectDetails();
    } catch (error) {
      console.error("Update error:", error);
      toast.error(
        "Failed to update project status: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate("/projects")}
            className="mb-3"
          >
            <FaArrowLeft className="me-2" />
            Back to Projects
          </Button>
          <h2>Project Details</h2>
        </Col>
        <Col className="text-end">
          {canEdit && (
            <>
              <Button
                variant="warning"
                className="me-2"
                onClick={handleShowStatusModal}
              >
                <FaEdit className="me-2" />
                Update Status
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate(`/projects/${id}/edit`)}
              >
                <FaEdit className="me-2" />
                Edit Project
              </Button>
            </>
          )}
          {/* Show a view-only message for employees */}
          {!canEdit && (
            <Button variant="outline-secondary" disabled>
              View Only
            </Button>
          )}
        </Col>
      </Row>

      {/* Tabs for different sections */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        {/* Overview Tab */}
        <Tab eventKey="overview" title="Overview">
          <Row className="g-4">
            <Col lg={8}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Project Information</h5>
                </Card.Header>
                <Card.Body>
              <div className="mb-4">
                <h3>{project.name}</h3>
                <Badge bg={getStatusVariant(project.status)} className="me-2">
                  {project.status}
                </Badge>
              </div>

              <Row className="mb-4">
                <Col md={6}>
                  <div className="mb-3">
                    <strong className="text-muted d-block mb-1">
                      <FaBuilding className="me-2" />
                      Client
                    </strong>
                    <h6>
                      {project.client?.name || "N/A"}
                      {project.client?.company && (
                        <small className="text-muted d-block">
                          {project.client.company}
                        </small>
                      )}
                    </h6>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong className="text-muted d-block mb-1">
                      <FaCalendar className="me-2" />
                      Timeline
                    </strong>
                    <h6>
                      {formatDate(project.startDate)} -{" "}
                      {project.endDate
                        ? formatDate(project.endDate)
                        : "Ongoing"}
                    </h6>
                  </div>
                </Col>
              </Row>

              {/* Show slot system information if enabled */}
              {project?.slotConfiguration?.enableSlotSystem && (
                <Row className="mb-4">
                  <Col md={6}>
                    <div className="mb-3">
                      <strong className="text-muted d-block mb-1">
                        Slot System
                      </strong>
                      <h6>
                        <Badge bg="info" className="me-2">Enabled</Badge>
                        {project.slotConfiguration.slotType || 'Generic'} slots
                      </h6>
                      <small className="text-muted">
                        {project.slotConfiguration.totalSlots || 0} total slots configured
                      </small>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong className="text-muted d-block mb-1">
                        Progress Method
                      </strong>
                      <h6>
                        <Badge bg="primary">
                          {project.progressTracking?.calculationMethod === 'slot-based' ? 'Slot-Based' : 'Manual'}
                        </Badge>
                      </h6>
                      <small className="text-muted">
                        {project.progressTracking?.calculationMethod === 'slot-based' 
                          ? 'Progress calculated from slot completion'
                          : 'Progress updated manually'
                        }
                      </small>
                    </div>
                  </Col>
                </Row>
              )}

              {project.description && (
                <div className="mb-4">
                  <strong className="text-muted d-block mb-2">
                    Description
                  </strong>
                  <p className="text-muted">{project.description}</p>
                </div>
              )}

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <strong>Project Progress</strong>
                  <span>{calculateProgress()}%</span>
                </div>
                
                {/* Show slot-based progress if enabled */}
                {project?.slotConfiguration?.enableSlotSystem ? (
                  <div>
                    <div className="progress" style={{ height: "25px" }}>
                      <div
                        className={`progress-bar ${
                          project.status === "Completed"
                            ? "bg-success"
                            : project.status === "In Progress"
                            ? "bg-primary"
                            : "bg-warning"
                        }`}
                        role="progressbar"
                        style={{ width: `${calculateProgress()}%` }}
                        aria-valuenow={calculateProgress()}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        {calculateProgress()}%
                      </div>
                    </div>
                    <div className="small text-muted mt-1">
                      Slot-based progress: {project.progressTracking?.completedSlots || 0} / {project.progressTracking?.totalSlots || project.slotConfiguration?.totalSlots || 0} slots completed
                    </div>
                  </div>
                ) : (
                  <div className="progress" style={{ height: "25px" }}>
                    <div
                      className={`progress-bar ${
                        project.status === "Completed"
                          ? "bg-success"
                          : project.status === "In Progress"
                          ? "bg-primary"
                          : "bg-warning"
                      }`}
                      role="progressbar"
                      style={{ width: `${calculateProgress()}%` }}
                      aria-valuenow={calculateProgress()}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {calculateProgress()}%
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Project Timeline</h5>
            </Card.Header>
            <Card.Body>
              <Table borderless className="mb-0">
                <tbody>
                  <tr>
                    <td>
                      <strong>Created:</strong>
                    </td>
                    <td>{formatDate(project.createdAt)}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Last Updated:</strong>
                    </td>
                    <td>{formatDate(project.updatedAt)}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Start Date:</strong>
                    </td>
                    <td>{formatDate(project.startDate)}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>End Date:</strong>
                    </td>
                    <td>
                      {project.endDate
                        ? formatDate(project.endDate)
                        : "Not set"}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
                </Card>
              </Col>

              <Col lg={4}>
                <Card className="shadow-sm mb-4">
                  <Card.Header className="bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">
                        <FaUser className="me-2" />
                        Team Members ({project.assignedUsers?.length || 0})
                      </h5>
                      {isProjectHead && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            fetchAvailableMembers();
                            setShowAddMemberModal(true);
                          }}
                        >
                          Add Member
                        </Button>
                      )}
                    </div>
                  </Card.Header>
            <Card.Body>
              {project.assignedUsers && project.assignedUsers.length > 0 ? (
                <ListGroup variant="flush">
                  {project.assignedUsers.map((user) => (
                    <ListGroup.Item key={user._id} className="px-0">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="flex-grow-1">
                          <h6 className="mb-0">{user.name}</h6>
                          <small className="text-muted">{user.email}</small>
                          <br />
                          <Badge bg="info" className="text-capitalize mt-1">
                            {user.role}
                          </Badge>
                        </div>
                        {isProjectHead && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveMember(user._id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center mb-0">
                  No team members assigned
                </p>
              )}
            </Card.Body>
          </Card>

          {/* Show slot statistics if slot system is enabled */}
          {project?.slotConfiguration?.enableSlotSystem && (
            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  <FaCheckCircle className="me-2" />
                  Slot Progress
                </h5>
              </Card.Header>
              <Card.Body>
                {loadingSlots ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : slotStatistics ? (
                  <div>
                    <Row className="g-2 mb-3">
                      <Col xs={6}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="h6 mb-1 text-success">{slotStatistics.completedSlots || 0}</div>
                          <div className="small text-muted">Completed</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="h6 mb-1 text-primary">{slotStatistics.totalSlots || 0}</div>
                          <div className="small text-muted">Total</div>
                        </div>
                      </Col>
                    </Row>
                    <div className="progress mb-2" style={{ height: "8px" }}>
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{ width: `${slotStatistics.completionRate || 0}%` }}
                      />
                    </div>
                    <div className="small text-muted text-center">
                      {slotStatistics.completionRate || 0}% complete
                    </div>
                    {activeTab === 'overview' && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="w-100 mt-3"
                        onClick={() => setActiveTab('slots')}
                      >
                        View Slot Details
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted text-center mb-0">
                    No slot data available
                  </p>
                )}
              </Card.Body>
            </Card>
          )}

          {project.client && (
            <Card className="shadow-sm">
              <Card.Header className="bg-white">
                <h5 className="mb-0">Client Contact</h5>
              </Card.Header>
              <Card.Body>
                <h6 className="mb-2">{project.client.name}</h6>
                {project.client.company && (
                  <p className="text-muted mb-2">{project.client.company}</p>
                )}
                {project.client.email && (
                  <p className="mb-1">
                    <small className="text-muted">Email:</small>
                    <br />
                    <a href={`mailto:${project.client.email}`}>
                      {project.client.email}
                    </a>
                  </p>
                )}
                {project.client.phone && (
                  <p className="mb-1">
                    <small className="text-muted">Phone:</small>
                    <br />
                    <a href={`tel:${project.client.phone}`}>
                      {project.client.phone}
                    </a>
                  </p>
                )}
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="mt-3 w-100"
                  onClick={() => navigate(`/clients/${project.client._id}`)}
                >
                  View Client Details
                </Button>
              </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </Tab>



        {/* Team Tab */}
        <Tab
          eventKey="team"
          title={
            <span>
              <FaUser className="me-2" />
              Team ({project.assignedUsers?.length || 0})
            </span>
          }
        >
          <Row className="g-4">
            <Col lg={8}>
              <Card className="shadow-sm">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <FaUserTie className="me-2" />
                    Project Head
                  </h5>
                  {canEdit && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => {
                        fetchAvailableHoPs();
                        setShowAssignHoPModal(true);
                      }}
                    >
                      <FaEdit className="me-2" />
                      {project.projectHead ? 'Change' : 'Assign'} Project Head
                    </Button>
                  )}
                </Card.Header>
                <Card.Body>
                  {project.projectHead ? (
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="mb-1">{project.projectHead.name}</h6>
                        <small className="text-muted d-block">{project.projectHead.email}</small>
                        {project.projectHead.designation && (
                          <Badge bg="primary" className="mt-2">
                            {project.projectHead.designation}
                          </Badge>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={handleRemoveHoP}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-muted mb-3">No Project Head assigned yet</p>
                      {canEdit && (
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => {
                            fetchAvailableHoPs();
                            setShowAssignHoPModal(true);
                          }}
                        >
                          <FaUserTie className="me-2" />
                          Assign Project Head
                        </Button>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>

              <Card className="shadow-sm mt-4">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <FaUser className="me-2" />
                    Team Members ({project.assignedUsers?.length || 0})
                  </h5>
                  {isProjectHead && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        fetchAvailableMembers();
                        setShowAddMemberModal(true);
                      }}
                    >
                      <FaUser className="me-2" />
                      Add Member
                    </Button>
                  )}
                </Card.Header>
                <Card.Body>
                  {project.assignedUsers && project.assignedUsers.length > 0 ? (
                    <ListGroup variant="flush">
                      {project.assignedUsers.map((user) => (
                        <ListGroup.Item key={user._id}>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="flex-grow-1">
                              <h6 className="mb-0">{user.name}</h6>
                              <small className="text-muted">{user.email}</small>
                              <br />
                              <Badge bg="info" className="text-capitalize mt-1">
                                {user.role}
                              </Badge>
                            </div>
                            {isProjectHead && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRemoveMember(user._id)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-muted mb-3">No team members assigned yet</p>
                      {isProjectHead && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            fetchAvailableMembers();
                            setShowAddMemberModal(true);
                          }}
                        >
                          <FaUser className="me-2" />
                          Add First Team Member
                        </Button>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              {project.client && (
                <Card className="shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">Client Contact</h5>
                  </Card.Header>
                  <Card.Body>
                    <h6 className="mb-2">{project.client.name}</h6>
                    {project.client.company && <p className="text-muted mb-2">{project.client.company}</p>}
                    {project.client.email && (
                      <p className="mb-1">
                        <small className="text-muted">Email:</small>
                        <br />
                        <a href={`mailto:${project.client.email}`}>{project.client.email}</a>
                      </p>
                    )}
                    {project.client.phone && (
                      <p className="mb-1">
                        <small className="text-muted">Phone:</small>
                        <br />
                        <a href={`tel:${project.client.phone}`}>{project.client.phone}</a>
                      </p>
                    )}
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="mt-3 w-100"
                      onClick={() => navigate(`/clients/${project.client._id}`)}
                    >
                      View Client Details
                    </Button>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </Tab>

        {/* Slots Tab - Only show if slot system is enabled */}
        {project?.slotConfiguration?.enableSlotSystem && (
          <Tab
            eventKey="slots"
            title={
              <span>
                <FaCheckCircle className="me-2" />
                Slots ({slotStatistics?.totalSlots || 0})
              </span>
            }
          >
            <Row className="g-4">
              <Col lg={12}>
                {/* Slot Statistics Cards */}
                <SlotStatisticsCards
                  project={project}
                  slots={slots}
                  realTimeUpdates={true}
                  onRefresh={handleRefreshSlotData}
                />
              </Col>
              
              <Col lg={12}>
                {/* Slot Progress Display */}
                <SlotProgressDisplay
                  project={project}
                  slots={slots}
                  showDetailed={true}
                  onSlotClick={(slot) => {
                    // Handle slot click - could navigate to slot details
                    // console.log('Slot clicked:', slot);
                  }}
                  onSlotReassign={handleSlotReassign}
                  availableUsers={availableUsers}
                  realTimeUpdates={true}
                />
              </Col>
            </Row>
          </Tab>
        )}
      </Tabs>

      {/* Update Status Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Project Status</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateStatus}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Status</Form.Label>
              <Form.Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
              >
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Progress ({newProgress}%)</Form.Label>
              <Form.Range
                min="0"
                max="100"
                value={newProgress}
                onChange={(e) => setNewProgress(parseInt(e.target.value))}
              />
              <div className="d-flex justify-content-between">
                <small className="text-muted">0%</small>
                <small className="text-muted">100%</small>
              </div>
            </Form.Group>

            <div className="progress" style={{ height: "25px" }}>
              <div
                className="progress-bar bg-primary"
                role="progressbar"
                style={{ width: `${newProgress}%` }}
                aria-valuenow={newProgress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {newProgress}%
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowStatusModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update Status
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add Team Member Modal */}
      <Modal show={showAddMemberModal} onHide={() => setShowAddMemberModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Team Member</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select Team Member</Form.Label>
            <Form.Select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
            >
              <option value="">Choose a team member...</option>
              {availableMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} - {member.email}
                </option>
              ))}
            </Form.Select>
            {availableMembers.length === 0 && (
              <Form.Text className="text-muted">
                No available members from this department
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Role in Project</Form.Label>
            <Form.Select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
            >
              <option value="member">Member</option>
              <option value="lead">Lead</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="tester">Tester</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddMemberModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddMember}
            disabled={!selectedMemberId}
          >
            Add Member
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Project Head (HoP) Modal */}
      <Modal show={showAssignHoPModal} onHide={() => !isAssigningHoP && setShowAssignHoPModal(false)}>
        <Modal.Header closeButton={!isAssigningHoP}>
          <Modal.Title>
            <FaUserTie className="me-2" />
            Assign Project Head
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <small>
              The Project Head (HoP) will be responsible for managing this project, 
              including team members, tasks, and content slots.
            </small>
          </Alert>
          
          <Form.Group className="mb-3">
            <Form.Label>Select Project Head</Form.Label>
            <Form.Select
              value={selectedHoPId}
              onChange={(e) => setSelectedHoPId(e.target.value)}
              required
              disabled={isAssigningHoP}
            >
              <option value="">Choose a project head...</option>
              {availableMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </Form.Select>
            {availableMembers.length === 0 && (
              <Form.Text className="text-muted">
                No available employees from this department
              </Form.Text>
            )}
          </Form.Group>

          {project.projectHead && (
            <Alert variant="warning" className="mb-0">
              <small>
                <strong>Current Project Head:</strong> {project.projectHead.name}
                <br />
                Assigning a new Project Head will replace the current one.
              </small>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowAssignHoPModal(false)}
            disabled={isAssigningHoP}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAssignHoP}
            disabled={!selectedHoPId || isAssigningHoP}
          >
            {isAssigningHoP ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Assigning...
              </>
            ) : (
              <>
                <FaUserTie className="me-2" />
                Assign Project Head
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProjectDetails;
