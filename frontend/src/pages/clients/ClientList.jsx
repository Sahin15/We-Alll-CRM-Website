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
} from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clientApi } from "../../api/clientApi";
import { formatDate } from "../../utils/helpers";

const ClientList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [formData, setFormData] = useState({
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientApi.getAllClients();
      setClients(response.data);
    } catch (error) {
      console.error("Client fetch error:", error);
      console.error("Error response:", error.response);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.statusText ||
        "Failed to fetch clients. Please check your permissions.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (client = null) => {
    if (client) {
      setEditMode(true);
      setCurrentClient(client);
      setFormData({
        name: client.name,
        email: client.email,
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
    } else {
      setEditMode(false);
      setCurrentClient(null);
      setFormData({
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
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentClient(null);
    setFormData({
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
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await clientApi.updateClient(currentClient._id, formData);
        toast.success("Client updated successfully");
      } else {
        await clientApi.createClient(formData);
        toast.success("Client created successfully");
      }
      handleCloseModal();
      fetchClients();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${editMode ? "update" : "create"} client`
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        await clientApi.deleteClient(id);
        toast.success("Client deleted successfully");
        fetchClients();
      } catch (error) {
        toast.error("Failed to delete client");
      }
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Client Management</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" />
            Add Client
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
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Company</th>
                      <th>Service Company</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length > 0 ? (
                      clients.map((client) => (
                        <tr key={client._id}>
                          <td>{client.name}</td>
                          <td>{client.email}</td>
                          <td>{client.phone || "N/A"}</td>
                          <td>{client.company || "N/A"}</td>
                          <td>
                            {client.serviceCompany ? (
                              <Badge
                                bg={
                                  client.serviceCompany === "We Alll"
                                    ? "primary"
                                    : "info"
                                }
                              >
                                {client.serviceCompany}
                              </Badge>
                            ) : (
                              <span className="text-muted">Not Set</span>
                            )}
                          </td>
                          <td>{formatDate(client.createdAt)}</td>
                          <td>
                            <div className="btn-group" role="group">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() =>
                                  navigate(`/clients/${client._id}`)
                                }
                              >
                                <FaEye />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleShowModal(client)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(client._id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          No clients found
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

      {/* Add/Edit Client Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Client" : "Add New Client"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Client Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
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
                    value={formData.email}
                    onChange={handleChange}
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
                    value={formData.phone}
                    onChange={handleChange}
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
                    value={formData.whatsappnumber}
                    onChange={handleChange}
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
                    value={formData.company}
                    onChange={handleChange}
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
                    value={formData.ownername}
                    onChange={handleChange}
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
                    value={formData.serviceCompany}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select which company's services</option>
                    <option value="We Alll">We Alll</option>
                    <option value="Kolkata Digital">Kolkata Digital</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Select which company's services this client will be using. Plans and services will be filtered based on this selection.
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
                value={formData.address}
                onChange={handleChange}
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
                    value={formData.industry}
                    onChange={handleChange}
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
                    value={formData.website}
                    onChange={handleChange}
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
                    value={formData.targetAudience}
                    onChange={handleChange}
                    placeholder="Describe your target audience"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Audience Gender</Form.Label>
                  <Form.Select
                    name="audienceGender"
                    value={formData.audienceGender}
                    onChange={handleChange}
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
              <Form.Label>Monthly Marketing Budget</Form.Label>
              <Form.Control
                type="number"
                name="yearlyTurnover"
                value={formData.yearlyTurnover}
                onChange={handleChange}
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
                value={formData.previousChallenges}
                onChange={handleChange}
                placeholder="What challenges have you faced with previous agencies or marketing efforts?"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Legal Guidelines</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="legalGuidelines"
                value={formData.legalGuidelines}
                onChange={handleChange}
                placeholder="Any legal or regulatory guidelines we should be aware of?"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Expectations</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="expectations"
                value={formData.expectations}
                onChange={handleChange}
                placeholder="What do you expect from us?"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editMode ? "Update Client" : "Create Client"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ClientList;
