import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  ListGroup,
  Modal,
  Form,
  Spinner,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaArrowLeft,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaMapMarkerAlt,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { clientApi } from "../../api/clientApi";
import { projectApi } from "../../api/projectApi";
import { subscriptionAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    whatsappnumber: "",
    company: "",
    ownername: "",
    address: "",
    industry: "",
    website: "",
    targetAudience: "",
    audienceGender: "",
    previousChallenges: "",
    legalGuidelines: "",
    yearlyTurnover: "",
    expectations: "",
    serviceCompany: "",
  });

  useEffect(() => {
    fetchClientDetails();
    fetchClientProjects();
    fetchClientSubscriptions();
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      const response = await clientApi.getClientById(id);
      setClient(response.data);
      // Populate edit form data
      setEditFormData({
        name: response.data.name || "",
        email: response.data.email || "",
        phone: response.data.phone || "",
        whatsappnumber: response.data.whatsappnumber || "",
        company: response.data.company || "",
        ownername: response.data.ownername || "",
        address: response.data.address || "",
        industry: response.data.industry || "",
        website: response.data.website || "",
        targetAudience: response.data.targetAudience || "",
        audienceGender: response.data.audienceGender || "",
        previousChallenges: response.data.previousChallenges || "",
        legalGuidelines: response.data.legalGuidelines || "",
        yearlyTurnover: response.data.yearlyTurnover || "",
        expectations: response.data.expectations || "",
        serviceCompany: response.data.serviceCompany || "",
      });
    } catch (error) {
      toast.error("Failed to fetch client details");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      await clientApi.updateClient(id, editFormData);
      toast.success("Client updated successfully");
      setShowEditModal(false);
      // Refresh client data
      await fetchClientDetails();
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error(
        error.response?.data?.message || "Failed to update client"
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleShowEditModal = () => {
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    // Reset form data to original client data
    if (client) {
      setEditFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        whatsappnumber: client.whatsappnumber || "",
        company: client.company || "",
        ownername: client.ownername || "",
        address: client.address || "",
        industry: client.industry || "",
        website: client.website || "",
        targetAudience: client.targetAudience || "",
        audienceGender: client.audienceGender || "",
        previousChallenges: client.previousChallenges || "",
        legalGuidelines: client.legalGuidelines || "",
        yearlyTurnover: client.yearlyTurnover || "",
        expectations: client.expectations || "",
        serviceCompany: client.serviceCompany || "",
      });
    }
  };

  const fetchClientProjects = async () => {
    try {
      // Use appropriate API method based on user role
      let response;
      if (['admin', 'superadmin', 'hr', 'manager'].includes(user?.role)) {
        // Admin roles can see all projects
        response = await projectApi.getAllProjects();
      } else if (user?.role === 'hod') {
        // HoD sees their department's projects
        response = await projectApi.getMyDepartmentProjects();
      } else {
        // Regular employees see only their assigned projects
        response = await projectApi.getMyProjects();
      }
      
      // Filter projects for this client
      const allProjects = response.data || response.projects || response || [];
      const clientProjects = allProjects.filter(
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
          <Button 
            variant="primary" 
            onClick={handleShowEditModal}
          >
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

      {/* Edit Client Modal */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Client</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Client Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                    placeholder="Enter client name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    required
                    placeholder="client@example.com"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="number"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleEditInputChange}
                    placeholder="Enter phone number"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>WhatsApp</Form.Label>
                  <Form.Control
                    type="number"
                    name="whatsappnumber"
                    value={editFormData.whatsappnumber}
                    onChange={handleEditInputChange}
                    placeholder="Enter WhatsApp number"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Company</Form.Label>
                  <Form.Control
                    type="text"
                    name="company"
                    value={editFormData.company}
                    onChange={handleEditInputChange}
                    placeholder="Enter company name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Owner Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="ownername"
                    value={editFormData.ownername}
                    onChange={handleEditInputChange}
                    placeholder="Enter owner name"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Service Company *</Form.Label>
                  <Form.Select
                    name="serviceCompany"
                    value={editFormData.serviceCompany}
                    onChange={handleEditInputChange}
                    required
                  >
                    <option value="">Select which company's services</option>
                    <option value="We Alll">We Alll</option>
                    <option value="Kolkata Digital">Kolkata Digital</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Select which company's services this client will be using.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="address"
                value={editFormData.address}
                onChange={handleEditInputChange}
                placeholder="Enter full address"
              />
            </Form.Group>

            <h5 className="mt-4 mb-3">Business Information</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Industry/Business Category</Form.Label>
                  <Form.Control
                    type="text"
                    name="industry"
                    value={editFormData.industry}
                    onChange={handleEditInputChange}
                    placeholder="Enter industry or business category"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Website URL</Form.Label>
                  <Form.Control
                    type="url"
                    name="website"
                    value={editFormData.website}
                    onChange={handleEditInputChange}
                    placeholder="https://example.com"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Target Audience</Form.Label>
                  <Form.Control
                    type="text"
                    name="targetAudience"
                    value={editFormData.targetAudience}
                    onChange={handleEditInputChange}
                    placeholder="Describe your target audience"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Audience Gender</Form.Label>
                  <Form.Select
                    name="audienceGender"
                    value={editFormData.audienceGender}
                    onChange={handleEditInputChange}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Both">Both</option>
                    <option value="Other">Other</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Yearly Turnover</Form.Label>
              <Form.Control
                type="number"
                name="yearlyTurnover"
                value={editFormData.yearlyTurnover}
                onChange={handleEditInputChange}
                placeholder="Enter yearly turnover"
              />
            </Form.Group>

            <h5 className="mt-4 mb-3">Marketing Information</h5>
            <Form.Group className="mb-3">
              <Form.Label>Previous Challenges</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="previousChallenges"
                value={editFormData.previousChallenges}
                onChange={handleEditInputChange}
                placeholder="What challenges have you faced with previous agencies or marketing efforts?"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Legal Guidelines</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="legalGuidelines"
                value={editFormData.legalGuidelines}
                onChange={handleEditInputChange}
                placeholder="Any legal or regulatory guidelines we should be aware of?"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Expectations</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="expectations"
                value={editFormData.expectations}
                onChange={handleEditInputChange}
                placeholder="What do you expect from us?"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseEditModal} disabled={editLoading}>
              <FaTimes className="me-2" />
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={editLoading}>
              {editLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  Update Client
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ClientDetails;
