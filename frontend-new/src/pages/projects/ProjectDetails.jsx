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

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const response = await projectApi.getProjectById(id);
      setProject(response.data);
    } catch (error) {
      toast.error("Failed to fetch project details");
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
    if (project.status === "Completed") return 100;
    if (project.status === "In Progress") return 50;
    return 0;
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
          <Button variant="primary" onClick={() => navigate("/projects")}>
            <FaEdit className="me-2" />
            Edit Project
          </Button>
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
    </Container>
  );
};

export default ProjectDetails;
