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
import { useAuth } from "../../context/AuthContext";
import { leadApi } from "../../api/leadApi";
import { formatDate } from "../../utils/helpers";
import "./LeadList.css";

const LeadList = () => {
  const { user } = useAuth();
  const { id } = useParams(); // For edit mode
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    companyName: "",
    service: [],
    customService: "",
    budget: "",
    source: "",
    reference: "",
    status: "New",
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const navigate = useNavigate();

  // Function to format budget for display (convert old format to new compact format)
  const formatBudgetForDisplay = (budget) => {
    if (!budget) return "N/A";
    
    // Convert old format to new format
    const budgetMap = {
      "20,000 to 50,000 /Month": "20k to 50k /Month",
      "50,000 to 80,000 /Month": "50k to 80k /Month", 
      "80,000 to 100,000 /Month": "80k to 100k /Month",
      "100,000 to 200,000 /Month": "100k to 200k /Month"
    };
    
    return budgetMap[budget] || budget;
  };

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-switch to cards on mobile
      if (mobile) {
        setViewMode('cards');
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    "20k to 50k /Month",
    "50k to 80k /Month",
    "80k to 100k /Month",
    "100k to 200k /Month",
    "Custom",
  ];

  const sourceOptions = [
    "Growth Summit",
    "Website", 
    "Seminar",
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
        service: Array.isArray(response.data.service) ? response.data.service : (response.data.service ? [response.data.service] : []),
        customService: response.data.customService || "",
        budget: response.data.budget || "",
        source: response.data.source || "",
        reference: response.data.reference || "",
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
        service: Array.isArray(lead.service) ? lead.service : (lead.service ? [lead.service] : []),
        customService: lead.customService || "",
        budget: lead.budget || "",
        source: lead.source || "",
        reference: lead.reference || "",
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
        service: [],
        customService: "",
        budget: "",
        source: "",
        reference: "",
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

  // Handle multiple service selection
  const handleServiceChange = (service) => {
    const currentServices = formData.service || [];
    const updatedServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service];
    
    setFormData({ ...formData, service: updatedServices });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare submit data
      const submitData = {
        ...formData,
        phone: formData.phone ? Number(formData.phone) : undefined,
        service: formData.service, // Keep as array
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
      case "Growth Summit":
        return "warning";
      case "Website":
        return "primary";
      case "Seminar":
        return "info";
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

  // Professional mobile card component with enhanced design
  const LeadCard = ({ lead }) => (
    <Card className="mb-3 lead-card shadow-sm">
      <Card.Body className="p-0">
        {/* Header Section with Status */}
        <div className="lead-card-header p-3 pb-2">
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <h5 className="lead-name mb-1">{lead.fullName}</h5>
              <div className="lead-company text-muted">
                {lead.companyName || "Individual Client"}
              </div>
            </div>
            <div className="lead-status-badges">
              <Badge bg={getStatusVariant(lead.status)} className="status-badge mb-1">
                {lead.status}
              </Badge>
              <Badge bg={getSourceVariant(lead.source)} className="source-badge d-block">
                {lead.source}
              </Badge>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="lead-card-content px-3 pb-2">
          <div className="contact-info mb-3">
            <div className="row g-2">
              <div className="col-6">
                <div className="info-item">
                  <div className="info-icon">📞</div>
                  <div className="info-content">
                    <small className="info-label">Phone</small>
                    <div className="info-value">{lead.phone || "Not provided"}</div>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="info-item">
                  <div className="info-icon">✉️</div>
                  <div className="info-content">
                    <small className="info-label">Email</small>
                    <div className="info-value text-truncate" title={lead.email}>
                      {lead.email || "Not provided"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service & Budget Information */}
          <div className="service-budget-info mb-3">
            <div className="row g-2">
              <div className="col-7">
                <div className="info-item">
                  <div className="info-icon">🎯</div>
                  <div className="info-content">
                    <small className="info-label">Service Required</small>
                    <div className="info-value fw-medium text-primary">
                      {Array.isArray(lead.service) && lead.service.length > 0 
                        ? lead.service.join(", ") 
                        : lead.service || "Not specified"}
                      {lead.customService && (
                        <div className="mt-1">
                          <small className="text-muted">Custom: {lead.customService}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-5">
                <div className="info-item">
                  <div className="info-icon">💰</div>
                  <div className="info-content">
                    <small className="info-label">Budget</small>
                    <div className="info-value fw-bold text-success" title={formatBudgetForDisplay(lead.budget)}>
                      {formatBudgetForDisplay(lead.budget)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="lead-card-footer px-3 py-2 bg-light border-top">
          <div className="d-flex justify-content-between align-items-center">
            <div className="lead-meta">
              <small className="text-muted">
                <span className="me-2">📅 {formatDate(lead.createdAt)}</span>
                {lead.reference && (
                  <span className="me-2">👤 Ref: {lead.reference}</span>
                )}
              </small>
            </div>
            <div className="lead-actions">
              <div className="btn-group" role="group">
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => navigate(`/leads/${lead._id}`)}
                  title="View Details"
                  className="action-btn"
                >
                  <FaEye size={11} />
                </Button>
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={() => handleShowModal(lead)}
                  title="Edit Lead"
                  className="action-btn"
                >
                  <FaEdit size={11} />
                </Button>
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDelete(lead._id)}
                    title="Delete Lead"
                    className="action-btn"
                  >
                    <FaTrash size={11} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Lead Management</h2>
            <div className="d-flex align-items-center gap-2">
              {/* View Toggle - Desktop Only */}
              {!isMobile && (
                <div className="btn-group me-2" role="group">
                  <Button
                    variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    title="Table View"
                  >
                    <FaFilter className="me-1" />
                    Table
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    title="Card View"
                  >
                    <FaEye className="me-1" />
                    Cards
                  </Button>
                </div>
              )}
              <Button variant="primary" onClick={() => handleShowModal()}>
                <FaPlus className="me-2" />
                Add Lead
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4 filters-row">
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
              ) : (isMobile || viewMode === 'cards') ? (
                // Mobile Card View
                <div className="mobile-lead-cards">
                  {leads.length > 0 ? (
                    leads.map((lead) => (
                      <LeadCard key={lead._id} lead={lead} />
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-muted">
                        <FaFilter className="mb-2" size={24} />
                        <p className="mb-0">No leads found</p>
                        <small>Try adjusting your filters or add a new lead</small>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Desktop Table View
                <div className="table-responsive">
                  <Table hover className="lead-management-table">
                    <thead className="table-dark">
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
                              <div 
                                className="text-truncate fw-bold" 
                                title={lead.fullName}
                              >
                                {lead.fullName}
                              </div>
                            </td>
                            <td>
                              <div 
                                className="text-truncate" 
                                title={lead.phone || "N/A"}
                              >
                                {lead.phone || "N/A"}
                              </div>
                            </td>
                            <td>
                              <div 
                                className="text-truncate" 
                                title={lead.email || "N/A"}
                              >
                                {lead.email || "N/A"}
                              </div>
                            </td>
                            <td>
                              <div 
                                className="text-truncate" 
                                title={lead.companyName || "N/A"}
                              >
                                {lead.companyName || "N/A"}
                              </div>
                            </td>
                            <td>
                              <div 
                                className="text-truncate" 
                                title={Array.isArray(lead.service) && lead.service.length > 0 
                                  ? lead.service.join(", ") 
                                  : lead.service || "N/A"}
                              >
                                {Array.isArray(lead.service) && lead.service.length > 0 
                                  ? lead.service.slice(0, 2).join(", ") + (lead.service.length > 2 ? "..." : "")
                                  : lead.service || "N/A"}
                              </div>
                            </td>
                            <td>
                              <div 
                                className="text-truncate" 
                                title={formatBudgetForDisplay(lead.budget)}
                              >
                                {formatBudgetForDisplay(lead.budget)}
                              </div>
                            </td>
                            <td>
                              <Badge 
                                bg={getSourceVariant(lead.source)}
                                className="text-truncate d-block"
                                style={{ fontSize: '0.6rem', maxWidth: '100%' }}
                                title={lead.source}
                              >
                                {lead.source}
                              </Badge>
                            </td>
                            <td>
                              <Badge 
                                bg={getStatusVariant(lead.status)}
                                className="text-truncate d-block"
                                style={{ fontSize: '0.6rem', maxWidth: '100%' }}
                                title={lead.status}
                              >
                                {lead.status}
                              </Badge>
                            </td>
                            <td>
                              <div 
                                className="text-truncate small" 
                                title={formatDate(lead.createdAt)}
                              >
                                {formatDate(lead.createdAt)}
                              </div>
                            </td>
                            <td>
                              <div className="d-flex gap-1 flex-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => navigate(`/leads/${lead._id}`)}
                                  title="View Details"
                                  style={{ padding: '0.15rem 0.25rem', fontSize: '0.65rem' }}
                                >
                                  <FaEye size={8} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-success"
                                  onClick={() => handleShowModal(lead)}
                                  title="Edit Lead"
                                  style={{ padding: '0.15rem 0.25rem', fontSize: '0.65rem' }}
                                >
                                  <FaEdit size={8} />
                                </Button>
                                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleDelete(lead._id)}
                                    title="Delete Lead"
                                    style={{ padding: '0.15rem 0.25rem', fontSize: '0.65rem' }}
                                  >
                                    <FaTrash size={8} />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="10" className="text-center py-4">
                            <div className="text-muted">
                              <FaFilter className="mb-2" size={24} />
                              <p className="mb-0">No leads found</p>
                              <small>Try adjusting your filters or add a new lead</small>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Lead Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="xl" centered className="lead-modal">
        <Modal.Header closeButton className="lead-modal-header">
          <Modal.Title className="d-flex align-items-center">
            <div className="modal-icon me-3">
              {editMode ? <FaEdit /> : <FaPlus />}
            </div>
            <div>
              <h4 className="mb-0">{editMode ? "Edit Lead" : "Add New Lead"}</h4>
              <small className="opacity-75">
                {editMode ? "Update lead information" : "Capture new lead details"}
              </small>
            </div>
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="lead-modal-body">
            {/* Personal Information Section */}
            <div className="form-section mb-4">
              <div className="section-header mb-3">
                <h5 className="section-title">👤 Personal Information</h5>
                <p className="section-subtitle">Basic contact details</p>
              </div>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      Full Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      placeholder="Enter full name"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      Phone Number <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="Enter phone number"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="lead@example.com"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Company Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Service Requirements Section */}
            <div className="form-section mb-4">
              <div className="section-header mb-3">
                <h5 className="section-title">🎯 Service Requirements</h5>
                <p className="section-subtitle">What services does the client need?</p>
              </div>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      Services Required <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="services-grid">
                      {serviceOptions.map((service) => (
                        <div key={service} className="service-checkbox-item">
                          <Form.Check
                            type="checkbox"
                            id={`service-${service}`}
                            label={service}
                            checked={formData.service.includes(service)}
                            onChange={() => handleServiceChange(service)}
                            className="service-checkbox"
                          />
                        </div>
                      ))}
                    </div>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Custom Service</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="customService"
                      value={formData.customService}
                      onChange={handleChange}
                      placeholder="Describe any custom service requirements..."
                      className="form-control-modern"
                    />
                    <Form.Text className="text-muted">
                      Specify any services not listed above
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Budget & Source Section */}
            <div className="form-section mb-4">
              <div className="section-header mb-3">
                <h5 className="section-title">💰 Budget & Source</h5>
                <p className="section-subtitle">Budget range and lead source information</p>
              </div>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Budget Range</Form.Label>
                    <Form.Select
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      <option value="">Select budget range</option>
                      {budgetOptions.map((budget) => (
                        <option key={budget} value={budget}>
                          {budget}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Lead Source</Form.Label>
                    <Form.Select
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      <option value="">Select lead source</option>
                      {sourceOptions.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Additional Information Section */}
            <div className="form-section">
              <div className="section-header mb-3">
                <h5 className="section-title">📋 Additional Information</h5>
                <p className="section-subtitle">Reference and status details</p>
              </div>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Reference</Form.Label>
                    <Form.Control
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      placeholder="Who referred this lead?"
                      className="form-control-modern"
                    />
                    <Form.Text className="text-muted">
                      Name of person or company who referred this lead
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">Lead Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Modal.Body>
          
          <Modal.Footer className="lead-modal-footer">
            <Button 
              variant="outline-secondary" 
              onClick={handleCloseModal}
              className="btn-modern btn-cancel"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              className="btn-modern btn-submit"
            >
              <span className="me-2">
                {editMode ? <FaEdit /> : <FaPlus />}
              </span>
              {editMode ? "Update Lead" : "Create Lead"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default LeadList;
