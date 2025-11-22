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
import { subscriptionAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientDetails();
    fetchClientProjects();
    fetchClientSubscriptions();
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

  const fetchClientSubscriptions = async () => {
    try {
      const response = await subscriptionAPI.getAll({ client: id });
      setSubscriptions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
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
          <Card className="shadow-sm h-100">
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
                {client.whatsappnumber && (
                  <ListGroup.Item className="px-0">
                    <FaPhone className="me-2 text-primary" />
                    <strong>WhatsApp:</strong>
                    <br />
                    <a href={`tel:${client.whatsappnumber}`}>
                      {client.whatsappnumber}
                    </a>
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

                {client.ownername && (
                  <ListGroup.Item className="px-0">
                    <FaBuilding className="me-2 text-primary" />
                    <strong>Owner Name:</strong>
                    <br />
                    {client.ownername}
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
          <Row className="g-4">
            <Col lg={12}>
              <Card className="shadow-sm">
                <Card.Header className="bg-info text-white">
                  <h5 className="mb-0">Business Information</h5>
                </Card.Header>
                <Card.Body>
                  <ListGroup variant="flush">
                    {client.industry ? (
                      <ListGroup.Item className="px-0">
                        <strong>Industry:</strong>
                        <br />
                        {client.industry}
                      </ListGroup.Item>
                    ) : (
                      <ListGroup.Item className="px-0">
                        <strong>Industry:</strong>
                        <br />
                        <span className="text-muted">Not provided</span>
                      </ListGroup.Item>
                    )}

                    {client.website ? (
                      <ListGroup.Item className="px-0">
                        <strong>Website:</strong>
                        <br />
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {client.website}
                        </a>
                      </ListGroup.Item>
                    ) : (
                      <ListGroup.Item className="px-0">
                        <strong>Website:</strong>
                        <br />
                        <span className="text-muted">Not provided</span>
                      </ListGroup.Item>
                    )}

                    {client.yearlyTurnover ? (
                      <ListGroup.Item className="px-0">
                        <strong>Yearly Turnover:</strong>
                        <br />₹{" "}
                        {client.yearlyTurnover.toLocaleString("en-IN")}
                      </ListGroup.Item>
                    ) : (
                      <ListGroup.Item className="px-0">
                        <strong>Yearly Turnover:</strong>
                        <br />
                        <span className="text-muted">Not provided</span>
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={12}>
              <Card className="shadow-sm">
                <Card.Header className="bg-success text-white">
                  <h5 className="mb-0">Marketing Information</h5>
                </Card.Header>
                <Card.Body>
                  <ListGroup variant="flush">
                    {client.targetAudience ? (
                      <ListGroup.Item className="px-0">
                        <strong>Target Audience:</strong>
                        <br />
                        {client.targetAudience}
                      </ListGroup.Item>
                    ) : (
                      <ListGroup.Item className="px-0">
                        <strong>Target Audience:</strong>
                        <br />
                        <span className="text-muted">Not provided</span>
                      </ListGroup.Item>
                    )}

                    {client.audienceGender ? (
                      <ListGroup.Item className="px-0">
                        <strong>Audience Gender:</strong>
                        <br />
                        <Badge bg="secondary">{client.audienceGender}</Badge>
                      </ListGroup.Item>
                    ) : (
                      <ListGroup.Item className="px-0">
                        <strong>Audience Gender:</strong>
                        <br />
                        <span className="text-muted">Not provided</span>
                      </ListGroup.Item>
                    )}

                    {client.previousChallenges ? (
                      <ListGroup.Item className="px-0">
                        <strong>Previous Challenges:</strong>
                        <br />
                        <small>{client.previousChallenges}</small>
                      </ListGroup.Item>
                    ) : (
                      <ListGroup.Item className="px-0">
                        <strong>Previous Challenges:</strong>
                        <br />
                        <span className="text-muted">Not provided</span>
                      </ListGroup.Item>
                    )}

                    {client.legalGuidelines ? (
                      <ListGroup.Item className="px-0">
                        <strong>Legal Guidelines:</strong>
                        <br />
                        <small>{client.legalGuidelines}</small>
                      </ListGroup.Item>
                    ) : (
                      <ListGroup.Item className="px-0">
                        <strong>Legal Guidelines:</strong>
                        <br />
                        <span className="text-muted">Not provided</span>
                      </ListGroup.Item>
                    )}

                    {client.expectations ? (
                      <ListGroup.Item className="px-0">
                        <strong>Expectations:</strong>
                        <br />
                        <small>{client.expectations}</small>
                      </ListGroup.Item>
                    ) : (
                      <ListGroup.Item className="px-0">
                        <strong>Expectations:</strong>
                        <br />
                        <span className="text-muted">Not provided</span>
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Row className="g-4 mt-2">
        <Col lg={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">Company Services & Subscriptions</h5>
            </Card.Header>
            <Card.Body>
              {subscriptions.length > 0 ? (
                <ListGroup variant="flush">
                  {subscriptions.map((subscription) => (
                    <ListGroup.Item
                      key={subscription._id}
                      className="d-flex justify-content-between align-items-start"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Badge
                            bg={
                              subscription.company === "We Alll"
                                ? "primary"
                                : "info"
                            }
                            className="px-3 py-2"
                          >
                            {subscription.company}
                          </Badge>
                          <Badge
                            bg={
                              subscription.status === "active"
                                ? "success"
                                : subscription.status === "pending"
                                ? "warning"
                                : subscription.status === "suspended"
                                ? "danger"
                                : "secondary"
                            }
                          >
                            {subscription.status}
                          </Badge>
                        </div>
                        <h6 className="mb-1">
                          {subscription.planSnapshot?.name || "Plan"}
                        </h6>
                        <small className="text-muted">
                          Subscription #{subscription.subscriptionNumber}
                        </small>
                        <br />
                        <small className="text-muted">
                          Billing: {subscription.billingCycle} | Amount: ₹
                          {subscription.totalAmount?.toLocaleString("en-IN")}
                        </small>
                        <br />
                        <small className="text-muted">
                          Started: {formatDate(subscription.startDate)}
                          {subscription.nextBillingDate && (
                            <> | Next Billing: {formatDate(subscription.nextBillingDate)}</>
                          )}
                        </small>
                      </div>
                      <div className="d-flex flex-column gap-2">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() =>
                            navigate(`/admin/subscriptions/${subscription._id}`)
                          }
                        >
                          View Details
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No active subscriptions found for this client</p>
                  <small>
                    This client has not subscribed to any services from We Alll
                    or Kolkata Digital yet.
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mt-2">
        <Col lg={12}>
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
