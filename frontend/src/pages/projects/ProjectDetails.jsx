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
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEdit,
  FaUser,
  FaCalendar,
  FaBuilding,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { projectApi } from "../../api/projectApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import { useAuth } from "../../context/AuthContext";

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newProgress, setNewProgress] = useState(0);

  // Check if user can edit (admin, superadmin, hod)
  const canEdit = ["admin", "superadmin", "hod"].includes(user?.role);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const response = await projectApi.getProjectById(id);
      setProject(response.data);
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
              <h5 className="mb-0">
                <FaUser className="me-2" />
                Team Members ({project.assignedUsers?.length || 0})
              </h5>
            </Card.Header>
            <Card.Body>
              {project.assignedUsers && project.assignedUsers.length > 0 ? (
                <ListGroup variant="flush">
                  {project.assignedUsers.map((user) => (
                    <ListGroup.Item key={user._id} className="px-0">
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
    </Container>
  );
};

export default ProjectDetails;
