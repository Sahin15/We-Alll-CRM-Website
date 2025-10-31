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
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { projectApi } from "../../api/projectApi";
import { clientApi } from "../../api/clientApi";
import { userApi } from "../../api/userApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Pending",
    assignedUsers: [],
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getAllProjects();
      setProjects(response.data);
    } catch (error) {
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientApi.getAllClients();
      console.log("Clients loaded:", response.data);
      setClients(response.data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      toast.error(
        "Failed to load clients. Make sure you have admin permissions."
      );
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      console.log("Users loaded:", response.data);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    }
  };

  const handleShowModal = (project = null) => {
    if (project) {
      setEditMode(true);
      setCurrentProject(project);
      const assignedIds = project.assignedUsers?.map((u) => u._id || u) || [];
      setFormData({
        name: project.name,
        client: project.client?._id || project.client,
        description: project.description || "",
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().split("T")[0]
          : "",
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().split("T")[0]
          : "",
        status: project.status,
        assignedUsers: assignedIds,
      });
      // Set available users (not yet assigned)
      setAvailableUsers(users.filter((u) => !assignedIds.includes(u._id)));
    } else {
      setEditMode(false);
      setCurrentProject(null);
      setFormData({
        name: "",
        client: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "Pending",
        assignedUsers: [],
      });
      setAvailableUsers(users);
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
      description: "",
      startDate: "",
      endDate: "",
      status: "Pending",
      assignedUsers: [],
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

  const handleAddUser = (userId) => {
    if (!formData.assignedUsers.includes(userId)) {
      setFormData({
        ...formData,
        assignedUsers: [...formData.assignedUsers, userId],
      });
      setAvailableUsers(availableUsers.filter((u) => u._id !== userId));
    }
  };

  const handleRemoveUser = (userId) => {
    setFormData({
      ...formData,
      assignedUsers: formData.assignedUsers.filter((id) => id !== userId),
    });
    const userToAdd = users.find((u) => u._id === userId);
    if (userToAdd) {
      setAvailableUsers([...availableUsers, userToAdd]);
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Project Management</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" />
            Add Project
          </Button>
        </Col>
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
                              >
                                <FaEye />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleShowModal(project)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(project._id)}
                              >
                                <FaTrash />
                              </Button>
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
              <Form.Label>Client *</Form.Label>
              <Form.Select
                name="client"
                value={formData.client}
                onChange={handleChange}
                required
              >
                <option value="">
                  {clients.length === 0
                    ? "No clients available - Add client first"
                    : "Select a client"}
                </option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name} {client.company && `(${client.company})`}
                  </option>
                ))}
              </Form.Select>
              {clients.length === 0 && (
                <Form.Text className="text-danger">
                  No clients found. Please create a client first or check your
                  permissions.
                </Form.Text>
              )}
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
              <Form.Label>Status *</Form.Label>
              <Form.Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Team Members</Form.Label>

              {/* Assigned Members */}
              {formData.assignedUsers.length > 0 && (
                <Card className="mb-3">
                  <Card.Header className="bg-light py-2">
                    <small className="text-muted">Assigned Members</small>
                  </Card.Header>
                  <ListGroup variant="flush">
                    {formData.assignedUsers.map((userId) => {
                      const user = users.find((u) => u._id === userId);
                      return user ? (
                        <ListGroup.Item
                          key={userId}
                          className="d-flex justify-content-between align-items-center py-2"
                          style={{ backgroundColor: "#f0f0f0" }}
                        >
                          <div>
                            <strong>{user.name}</strong>
                            <br />
                            <small className="text-muted">
                              {user.email} • {user.role}
                            </small>
                          </div>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleRemoveUser(userId)}
                          >
                            <FaTimes /> Remove
                          </Button>
                        </ListGroup.Item>
                      ) : null;
                    })}
                  </ListGroup>
                </Card>
              )}

              {/* Available Members */}
              {availableUsers.length > 0 ? (
                <Card>
                  <Card.Header className="bg-light py-2">
                    <small className="text-muted">Available Members</small>
                  </Card.Header>
                  <ListGroup
                    variant="flush"
                    style={{ maxHeight: "200px", overflowY: "auto" }}
                  >
                    {availableUsers.map((user) => (
                      <ListGroup.Item
                        key={user._id}
                        className="d-flex justify-content-between align-items-center py-2"
                      >
                        <div>
                          <strong>{user.name}</strong>
                          <br />
                          <small className="text-muted">
                            {user.email} • {user.role}
                          </small>
                        </div>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleAddUser(user._id)}
                        >
                          <FaUserPlus /> Add
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card>
              ) : (
                <p className="text-muted text-center py-2">
                  All users have been assigned
                </p>
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
