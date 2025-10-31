import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  ListGroup,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { clientApi } from "../../api/clientApi";
import { projectApi } from "../../api/projectApi";
import { formatDate } from "../../utils/helpers";

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientDetails();
    fetchClientProjects();
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      const response = await clientApi.getClientById(id);
      setClient(response.data);
    } catch (error) {
      toast.error("Failed to fetch client details");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientProjects = async () => {
    try {
      const response = await projectApi.getAllProjects();
      // Filter projects for this client
      const clientProjects = response.data.filter(
        (project) => project.client?._id === id || project.client === id
      );
      setProjects(clientProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
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

  if (!client) {
    return (
      <Container fluid>
        <Card>
          <Card.Body className="text-center py-5">
            <h4>Client not found</h4>
            <Button variant="primary" onClick={() => navigate("/clients")}>
              Back to Clients
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate("/clients")}
            className="mb-3"
          >
            <FaArrowLeft className="me-2" />
            Back to Clients
          </Button>
          <h2>Client Details</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => navigate("/clients")}>
            <FaEdit className="me-2" />
            Edit Client
          </Button>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Client Information</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h4 className="mb-1">{client.name}</h4>
                <Badge bg="success">Active</Badge>
              </div>

              <ListGroup variant="flush">
                <ListGroup.Item className="px-0">
                  <FaEnvelope className="me-2 text-primary" />
                  <strong>Email:</strong>
                  <br />
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                </ListGroup.Item>

                {client.phone && (
                  <ListGroup.Item className="px-0">
                    <FaPhone className="me-2 text-primary" />
                    <strong>Phone:</strong>
                    <br />
                    <a href={`tel:${client.phone}`}>{client.phone}</a>
                  </ListGroup.Item>
                )}

                {client.company && (
                  <ListGroup.Item className="px-0">
                    <FaBuilding className="me-2 text-primary" />
                    <strong>Company:</strong>
                    <br />
                    {client.company}
                  </ListGroup.Item>
                )}

                {client.address && (
                  <ListGroup.Item className="px-0">
                    <FaMapMarkerAlt className="me-2 text-primary" />
                    <strong>Address:</strong>
                    <br />
                    {client.address}
                  </ListGroup.Item>
                )}

                <ListGroup.Item className="px-0">
                  <strong>Created:</strong>
                  <br />
                  {formatDate(client.createdAt)}
                </ListGroup.Item>

                <ListGroup.Item className="px-0">
                  <strong>Last Updated:</strong>
                  <br />
                  {formatDate(client.updatedAt)}
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Projects ({projects.length})</h5>
            </Card.Header>
            <Card.Body>
              {projects.length > 0 ? (
                <ListGroup variant="flush">
                  {projects.map((project) => (
                    <ListGroup.Item
                      key={project._id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6 className="mb-1">{project.name}</h6>
                        <small className="text-muted">
                          {project.description || "No description"}
                        </small>
                        <br />
                        <small className="text-muted">
                          {formatDate(project.startDate)} -{" "}
                          {project.endDate
                            ? formatDate(project.endDate)
                            : "Ongoing"}
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Badge
                          bg={
                            project.status === "Completed"
                              ? "success"
                              : project.status === "In Progress"
                              ? "primary"
                              : "warning"
                          }
                        >
                          {project.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => navigate(`/projects/${project._id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No projects found for this client</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate("/projects")}
                  >
                    Create New Project
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ClientDetails;
