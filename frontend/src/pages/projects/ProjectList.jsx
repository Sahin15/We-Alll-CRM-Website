import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  ListGroup,
} from "react-bootstrap";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaTimes,
  FaUserPlus,
  FaArrowLeft,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { projectApi } from "../../api/projectApi";
import { departmentApi } from "../../api/departmentApi";
import { clientApi } from "../../api/clientApi";
import { userApi } from "../../api/userApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";

const ProjectList = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    department: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchDepartments();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getAllProjects();
      
      // Handle both old and new response formats
      if (response.data && Array.isArray(response.data)) {
        // New paginated format
        setProjects(response.data);
      } else if (Array.isArray(response)) {
        // Old format
        setProjects(response);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Project fetch error:", error);
      if (error.response?.status === 403) {
        toast.info("You can only view projects you are assigned to");
      } else {
        toast.error("Failed to fetch projects");
      }
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    // Only fetch clients if user has permission (not employee role)
    if (user?.role === 'employee') {
      setClients([]);
      return;
    }
    
    try {
      const response = await clientApi.getAllClients();
      
      // Handle both old and new response formats
      if (response.data && Array.isArray(response.data)) {
        // New paginated format
        setClients(response.data);
      } else if (Array.isArray(response)) {
        // Old format
        setClients(response);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      // Only show error if it's not a permission issue (403)
      if (error.response?.status !== 403) {
        toast.error("Failed to load clients");
      }
      setClients([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAllDepartments();
      // Backend returns array directly, not wrapped in data
      const depts = Array.isArray(response) ? response : (response.data || []);
      console.log('Fetched departments:', depts);
      setDepartments(depts);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      setDepartments([]);
    }
  };



  const handleShowModal = (project = null) => {
    if (project) {
      setEditMode(true);
      setCurrentProject(project);
      setFormData({
        name: project.name,
        client: project.client?._id || project.client || "",
        department: project.department?._id || project.department || "",
        description: project.description || "",
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().split("T")[0]
          : "",
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      setEditMode(false);
      setCurrentProject(null);
      setFormData({
        name: "",
        client: "",
        department: "",
        description: "",
        startDate: "",
        endDate: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentProject(null);
    setFormData({
      name: "",
      client: "",
      department: "",
      description: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleUserSelect = (e) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setFormData({ ...formData, assignedUsers: selectedOptions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only Admin/SuperAdmin/HR/Manager can create projects
    if (!editMode && !['admin', 'superadmin', 'hr', 'manager'].includes(user?.role)) {
      toast.error("You don't have permission to create projects");
      return;
    }
    
    try {
      if (editMode) {
        await projectApi.updateProject(currentProject._id, formData);
        toast.success("Project updated successfully");
      } else {
        await projectApi.createProject(formData);
        toast.success("Project created successfully");
      }
      handleCloseModal();
      fetchProjects();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${editMode ? "update" : "create"} project`
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await projectApi.deleteProject(id);
        toast.success("Project deleted successfully");
        fetchProjects();
      } catch (error) {
        toast.error("Failed to delete project");
      }
    }
  };



  return (
    <Container fluid>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-3"
      >
        <FaArrowLeft className="me-2" />
        Back
      </Button>
      
      <Row className="mb-4">
        <Col>
          <h2>
            {user?.role === 'employee' ? 'My Projects' : 'Project Management'}
          </h2>
          {user?.role === 'employee' && (
            <p className="text-muted mb-0">Projects you are assigned to</p>
          )}
        </Col>
        {['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) && (
          <Col className="text-end">
            <Button variant="primary" onClick={() => handleShowModal()}>
              <FaPlus className="me-2" />
              Add Project
            </Button>
          </Col>
        )}
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Client</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Team Members</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length > 0 ? (
                      projects.map((project) => (
                        <tr key={project._id}>
                          <td>{project.name}</td>
                          <td>{project.client?.name || "N/A"}</td>
                          <td>{formatDate(project.startDate)}</td>
                          <td>
                            {project.endDate
                              ? formatDate(project.endDate)
                              : "Ongoing"}
                          </td>
                          <td>
                            <Badge bg={getStatusVariant(project.status)}>
                              {project.status}
                            </Badge>
                          </td>
                          <td>
                            {project.assignedUsers &&
                            project.assignedUsers.length > 0 ? (
                              <div>
                                {project.assignedUsers
                                  .slice(0, 2)
                                  .map((user, idx) => (
                                    <Badge
                                      key={idx}
                                      bg="secondary"
                                      className="me-1"
                                    >
                                      {user.name || "User"}
                                    </Badge>
                                  ))}
                                {project.assignedUsers.length > 2 && (
                                  <Badge bg="info">
                                    +{project.assignedUsers.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">No members</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() =>
                                  navigate(`/projects/${project._id}`)
                                }
                                title="View Details"
                              >
                                <FaEye />
                              </Button>
                              {user?.role !== 'employee' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline-success"
                                    onClick={() => handleShowModal(project)}
                                    title="Edit Project"
                                  >
                                    <FaEdit />
                                  </Button>
                                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                    <Button
                                      size="sm"
                                      variant="outline-danger"
                                      onClick={() => handleDelete(project._id)}
                                      title="Delete Project"
                                    >
                                      <FaTrash />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          No projects found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Project Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Project" : "Add New Project"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter project name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Client (Optional)</Form.Label>
              <Form.Select
                name="client"
                value={formData.client}
                onChange={handleChange}
              >
                <option value="">
                  {clients.length === 0
                    ? "No clients available"
                    : "Select a client (optional)"}
                </option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name} {client.company && `(${client.company})`}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                You can assign a client later if needed
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter project description"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Department *</Form.Label>
              <Form.Select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
              {departments.length === 0 && (
                <Form.Text className="text-danger">
                  No departments found. Please create departments first.
                </Form.Text>
              )}
              {departments.length > 0 && (
                <Form.Text className="text-muted">
                  The HoD of this department will manage the project
                </Form.Text>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editMode ? "Update Project" : "Create Project"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProjectList;
