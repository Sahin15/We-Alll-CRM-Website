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
import { FaPlus, FaEdit, FaTrash, FaEye, FaFilter } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { leadApi } from "../../api/leadApi";
import { formatDate } from "../../utils/helpers";

const LeadList = () => {
  const { id } = useParams(); // For edit mode
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    companyName: "",
    service: "",
    budget: "",
    source: "Website",
    status: "New",
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const navigate = useNavigate();

  const serviceOptions = [
    "Marketing",
    "SEO",
    "SSM",
    "Logo Designing",
    "Web Development",
    "Web Designing",
    "App Development",
    "Facebook Page Recovery",
    "Bridal Package",
  ];

  const budgetOptions = [
    "20,000 to 50,000 /Month",
    "50,000 to 80,000 /Month",
    "80,000 to 100,000 /Month",
    "100,000 to 200,000 /Month",
    "Custom",
  ];

  const sourceOptions = [
    "Website",
    "Referral",
    "Social Media",
    "Advertisement",
    "Cold Call",
    "Other",
  ];
  const statusOptions = [
    "New",
    "Contacted",
    "Qualified",
    "Proposal Sent",
    "Negotiation",
    "Won",
    "Lost",
  ];

  useEffect(() => {
    fetchLeads();
  }, [filterStatus, filterSource]);

  // Handle edit mode when ID is present in URL
  useEffect(() => {
    if (id) {
      fetchLeadForEdit(id);
    }
  }, [id]);

  const fetchLeadForEdit = async (leadId) => {
    try {
      const response = await leadApi.getLeadById(leadId);
      setEditMode(true);
      setCurrentLead(response.data);
      setShowModal(true);
      setFormData({
        fullName: response.data.fullName || "",
        phone: response.data.phone || "",
        email: response.data.email || "",
        companyName: response.data.companyName || "",
        service: response.data.service || "",
        budget: response.data.budget || "",
        source: response.data.source || "Website",
        status: response.data.status || "New",
      });
    } catch (error) {
      console.error("Lead fetch error:", error);
      toast.error("Failed to fetch lead for editing");
      navigate("/leads");
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSource) params.source = filterSource;

      const response = await leadApi.getAllLeads(params);
      setLeads(response.data);
    } catch (error) {
      console.error("Lead fetch error:", error);
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (lead = null) => {
    if (lead) {
      setEditMode(true);
      setCurrentLead(lead);
      setFormData({
        fullName: lead.fullName || "",
        phone: lead.phone || "",
        email: lead.email || "",
        companyName: lead.companyName || "",
        service: lead.service || "",
        budget: lead.budget || "",
        source: lead.source || "Website",
        status: lead.status || "New",
      });
    } else {
      setEditMode(false);
      setCurrentLead(null);
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        companyName: "",
        service: "",
        budget: "",
        source: "Website",
        status: "New",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentLead(null);
    // If we were in edit mode from URL, navigate back to list
    if (id) {
      navigate("/leads");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert phone to number for backend
      const submitData = {
        ...formData,
        phone: formData.phone ? Number(formData.phone) : undefined,
      };

      if (editMode) {
        await leadApi.updateLead(currentLead._id, submitData);
        toast.success("Lead updated successfully");
      } else {
        await leadApi.createLead(submitData);
        toast.success("Lead created successfully");
      }
      handleCloseModal();
      fetchLeads();
      // If we were in edit mode from URL, navigate back to list
      if (id) {
        navigate("/leads");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${editMode ? "update" : "create"} lead`
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      try {
        await leadApi.deleteLead(id);
        toast.success("Lead deleted successfully");
        fetchLeads();
      } catch (error) {
        toast.error("Failed to delete lead");
      }
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "New":
        return "secondary";
      case "Contacted":
        return "info";
      case "Qualified":
        return "primary";
      case "Proposal Sent":
        return "warning";
      case "Negotiation":
        return "dark";
      case "Won":
        return "success";
      case "Lost":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getSourceVariant = (source) => {
    switch (source) {
      case "Website":
        return "primary";
      case "Referral":
        return "success";
      case "Social Media":
        return "info";
      case "Advertisement":
        return "warning";
      case "Cold Call":
        return "secondary";
      case "Other":
        return "dark";
      default:
        return "secondary";
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Lead Management</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" />
            Add Lead
          </Button>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Source</Form.Label>
            <Form.Select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="">All Sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6} className="d-flex align-items-end">
          <Button
            variant="outline-secondary"
            onClick={() => {
              setFilterStatus("");
              setFilterSource("");
            }}
          >
            <FaFilter className="me-2" />
            Clear Filters
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
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Company</th>
                      <th>Service</th>
                      <th>Budget</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length > 0 ? (
                      leads.map((lead) => (
                        <tr key={lead._id}>
                          <td>
                            <strong>{lead.fullName}</strong>
                          </td>
                          <td>{lead.phone || "N/A"}</td>
                          <td>{lead.email || "N/A"}</td>
                          <td>{lead.companyName || "N/A"}</td>
                          <td>{lead.service || "N/A"}</td>
                          <td>{lead.budget || "N/A"}</td>
                          <td>
                            <Badge bg={getSourceVariant(lead.source)}>
                              {lead.source}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getStatusVariant(lead.status)}>
                              {lead.status}
                            </Badge>
                          </td>
                          <td>{formatDate(lead.createdAt)}</td>
                          <td>
                            <div className="btn-group" role="group">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => navigate(`/leads/${lead._id}`)}
                              >
                                <FaEye />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleShowModal(lead)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(lead._id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          No leads found
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

      {/* Add/Edit Lead Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? "Edit Lead" : "Add New Lead"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number (WhatsApp) *</Form.Label>
                  <Form.Control
                    type="number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter phone number"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}    

                    placeholder="lead@example.com"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Company Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter company name"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Services</Form.Label>
                  <Form.Select
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                  >
                    <option value="">Select a service</option>
                    {serviceOptions.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Budget</Form.Label>
                  <Form.Select
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                  >
                    <option value="">Select a budget range</option>
                    {budgetOptions.map((budget) => (
                      <option key={budget} value={budget}>
                        {budget}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editMode ? "Update Lead" : "Create Lead"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default LeadList;
