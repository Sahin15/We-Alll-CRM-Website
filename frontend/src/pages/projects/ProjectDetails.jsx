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
  FaClipboardList,
  FaUserTie,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { projectApi } from "../../api/projectApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import { useAuth } from "../../context/AuthContext";
import SlotList from "../../components/projects/SlotList";
import CreateSlotForm from "../../components/projects/CreateSlotForm";
import SlotDetails from "../../components/projects/SlotDetails";
import SlotCalendar from "../../components/calendar/SlotCalendar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import * as slotApi from "../../api/slotApi";
import { userApi } from "../../api/userApi";

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

  // Slot management states
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [showSlotDetailsModal, setShowSlotDetailsModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [projectSlots, setProjectSlots] = useState([]);
  const [slotView, setSlotView] = useState("list"); // 'list' or 'calendar'
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Team member management states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberRole, setMemberRole] = useState("other");
  
  // HoP assignment states
  const [showAssignHoPModal, setShowAssignHoPModal] = useState(false);
  const [selectedHoPId, setSelectedHoPId] = useState("");
  const [isAssigningHoP, setIsAssigningHoP] = useState(false);
  
  // Confirmation dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user can edit (admin, superadmin, hod)
  const canEdit = ["admin", "superadmin", "hod"].includes(user?.role);

  // Check if user is project head
  const isProjectHead = canEdit || (project?.projectHead?._id === user?._id);

  useEffect(() => {
    fetchProjectDetails();
    fetchEmployees();
  }, [id]);

  useEffect(() => {
    if (project) {
      loadProjectSlots();
    }
  }, [project]);

  const fetchEmployees = async () => {
    try {
      const response = await userApi.getAllUsers();
      // Filter only employees (not clients)
      const employeeList = response.data.filter(u => 
        ['employee', 'admin', 'superadmin', 'hod'].includes(u.role)
      );
      setEmployees(employeeList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  };

  const loadProjectSlots = async () => {
    try {
      setSlotsLoading(true);
      const response = await slotApi.getSlotsByProject(id);
      setProjectSlots(response.data || []);
    } catch (error) {
      console.error("Error loading slots:", error);
      toast.error("Failed to load slots");
      setProjectSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      const response = await projectApi.getProjectById(id);
      // response is already the project data from the API
      setProject(response);
    } catch (error) {
      console.error("Project fetch error:", error);
      if (error.response?.status === 403) {
        toast.error(
          "Access denied. You can only view projects you are assigned to."
        );
        navigate("/projects");
      } else {
        toast.error("Failed to fetch project details");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      // Fetch all employees from the project's department
      const response = await userApi.getAllUsers();
      const allUsers = response.data || [];
      
      // Filter out users who are already team members
      const currentMemberIds = project?.assignedUsers?.map(u => u._id) || [];
      const projectHeadId = project?.projectHead?._id;
      const projectDeptId = project?.department?._id || project?.department;
      
      const available = allUsers.filter(u => {
        // Exclude if already a team member
        if (currentMemberIds.includes(u._id)) return false;
        
        // Exclude if project head
        if (u._id === projectHeadId) return false;
        
        // Include only if from same department (or no department filter if project has no department)
        if (projectDeptId) {
          const userDeptId = u.department?._id || u.department;
          return userDeptId === projectDeptId;
        }
        
        return true;
      });
      
      setAvailableMembers(available);
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
    if (project.progress) return project.progress;
    if (project.status === "Completed") return 100;
    if (project.status === "In Progress") return 50;
    return 0;
  };

  const handleShowStatusModal = () => {
    setNewStatus(project.status);
    setNewProgress(project.progress || calculateProgress());
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      // Use the specific progress update endpoint for better control
      await projectApi.updateProjectProgress(id, newProgress);
      // Also update the status if it changed
      if (newStatus !== project.status) {
        await projectApi.updateProject(id, { status: newStatus });
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

  // Slot handlers
  const handleCreateSlot = async (slotData) => {
    try {
      const payload = {
        client: project.client._id || project.client,
        project: id,
        ...slotData
      };
      
      const response = await slotApi.createSlot(payload);
      toast.success("Slot created successfully!");
      loadProjectSlots(); // Reload slots
      return response.data;
    } catch (error) {
      console.error("Error creating slot:", error);
      toast.error(error.message || "Failed to create slot");
      throw error;
    }
  };

  const handleViewSlot = (slot) => {
    setSelectedSlot(slot);
    setShowSlotDetailsModal(true);
  };

  const handleEditSlot = (slot) => {
    setSelectedSlot(slot);
    setShowSlotDetailsModal(true);
  };

  const handleDeleteSlot = (slot) => {
    setSlotToDelete(slot);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSlot = async () => {
    setIsDeleting(true);
    try {
      await slotApi.deleteSlot(slotToDelete._id);
      toast.success("Slot deleted successfully!");
      setShowDeleteConfirm(false);
      setSlotToDelete(null);
      loadProjectSlots(); // Reload slots
    } catch (error) {
      console.error("Error deleting slot:", error);
      toast.error(error.message || "Failed to delete slot");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateSlot = async (updatedSlot) => {
    try {
      await slotApi.updateSlot(updatedSlot._id, updatedSlot);
      toast.success("Slot updated successfully!");
      loadProjectSlots(); // Reload slots
    } catch (error) {
      console.error("Error updating slot:", error);
      toast.error(error.message || "Failed to update slot");
      throw error;
    }
  };

  // Calculate slot statistics from loaded slots
  const slotStats = {
    total: projectSlots?.length || 0,
    posted: projectSlots?.filter(s => s.postingStatus === 'Posted').length || 0,
    inProgress: projectSlots?.filter(s => 
      ['Planned', 'In Design', 'Ready for Review', 'Needs Revision', 'Approved'].includes(s.designStatus)
    ).length || 0,
    overdue: projectSlots?.filter(s => {
      const now = new Date();
      return new Date(s.postingDate) < now && s.postingStatus !== 'Posted';
    }).length || 0
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

        {/* Content Slots Tab */}
        <Tab
          eventKey="slots"
          title={
            <span>
              <FaClipboardList className="me-2" />
              Content Slots ({projectSlots.length})
            </span>
          }
        >
          {/* Slot Statistics */}
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="mb-0">{slotStats.total}</h3>
                  <small className="text-muted">Total Slots</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="mb-0 text-success">{slotStats.posted}</h3>
                  <small className="text-muted">Posted</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="mb-0 text-warning">{slotStats.inProgress}</h3>
                  <small className="text-muted">In Progress</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="mb-0 text-danger">{slotStats.overdue}</h3>
                  <small className="text-muted">Overdue</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* View Toggle */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="btn-group" role="group">
              <Button
                variant={slotView === "list" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setSlotView("list")}
              >
                <FaClipboardList className="me-2" />
                List View
              </Button>
              <Button
                variant={slotView === "calendar" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setSlotView("calendar")}
              >
                <FaCalendar className="me-2" />
                Calendar View
              </Button>
            </div>
            {isProjectHead && slotView === "list" && (
              <Button variant="primary" size="sm" onClick={() => setShowCreateSlotModal(true)}>
                <FaClipboardList className="me-2" />
                Create Slot
              </Button>
            )}
          </div>

          {/* List View */}
          {slotView === "list" && (
            <Card>
              <Card.Body>
                <SlotList
                  slots={projectSlots}
                  onCreateSlot={() => setShowCreateSlotModal(true)}
                  onViewSlot={handleViewSlot}
                  onEditSlot={handleEditSlot}
                  onDeleteSlot={handleDeleteSlot}
                  isProjectHead={isProjectHead}
                />
              </Card.Body>
            </Card>
          )}

          {/* Calendar View */}
          {slotView === "calendar" && (
            <SlotCalendar
              slots={projectSlots}
              onSlotClick={handleViewSlot}
              onDateClick={(date) => {
                // TODO: Pre-fill posting date when creating slot
                setShowCreateSlotModal(true);
              }}
              canCreateSlot={isProjectHead}
            />
          )}
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
                <Card.Header className="bg-white">
                  <h5 className="mb-0">
                    <FaUser className="me-2" />
                    Team Members
                  </h5>
                </Card.Header>
                <Card.Body>
                  {project.assignedUsers && project.assignedUsers.length > 0 ? (
                    <ListGroup variant="flush">
                      {project.assignedUsers.map((user) => (
                        <ListGroup.Item key={user._id}>
                          <div className="d-flex align-items-center">
                            <div className="flex-grow-1">
                              <h6 className="mb-0">{user.name}</h6>
                              <small className="text-muted">{user.email}</small>
                              <br />
                              <Badge bg="info" className="text-capitalize mt-1">
                                {user.role}
                              </Badge>
                            </div>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  ) : (
                    <p className="text-muted text-center mb-0">No team members assigned</p>
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
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
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

      {/* Create Slot Modal */}
      <CreateSlotForm
        show={showCreateSlotModal}
        onHide={() => setShowCreateSlotModal(false)}
        onSubmit={handleCreateSlot}
        project={project}
        employees={employees}
      />

      {/* Slot Details Modal */}
      {selectedSlot && (
        <SlotDetails
          show={showSlotDetailsModal}
          onHide={() => {
            setShowSlotDetailsModal(false);
            setSelectedSlot(null);
          }}
          slot={selectedSlot}
          onUpdate={handleUpdateSlot}
          isProjectHead={isProjectHead}
          currentUser={user}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        show={showDeleteConfirm}
        onHide={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
            setSlotToDelete(null);
          }
        }}
        onConfirm={confirmDeleteSlot}
        title="Delete Slot"
        message={
          slotToDelete
            ? `Are you sure you want to delete the slot "${slotToDelete.postType} - ${slotToDelete.occasion || slotToDelete.contentBucket}"? This action cannot be undone.`
            : "Are you sure you want to delete this slot?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

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
                  {member.name} - {member.designation || member.role} ({member.email})
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
