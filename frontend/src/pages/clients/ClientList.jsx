import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  Badge,
  InputGroup,
  Spinner,
  Dropdown,
  Alert,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaUserTie, 
  FaBuilding, 
  FaEnvelope, 
  FaPhone, 
  FaSearch, 
  FaFilter,
  FaTrophy,
  FaBell, 
  FaDownload,
  FaChartLine,
  FaUsers,
  FaHandshake,
  FaMapMarkerAlt,
  FaIndustry,
  FaWhatsapp
} from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { notifyClientWon } from "../../services/notificationHelpers";
import { clientApi } from "../../api/clientApi";
import { formatDate } from "../../utils/helpers";

// CSS to fix dropdown z-index issues
const dropdownStyles = `
  .client-card .dropdown-menu {
    z-index: 9999 !important;
    position: absolute !important;
    transform: translate3d(0, 0, 0) !important;
  }
  
  .client-card {
    overflow: visible !important;
    position: relative !important;
  }
  
  .client-card .card-body {
    overflow: visible !important;
    position: relative !important;
  }
  
  .client-card .dropdown {
    position: static !important;
  }
  
  .client-card .dropdown-toggle::after {
    margin-left: 0.5em;
  }
`;

const ClientList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWonModal, setShowWonModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [wonClientData, setWonClientData] = useState({
    projectValue: '',
    projectName: '',
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
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

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clients, searchTerm, serviceFilter]);

  // Handle edit query parameter
  useEffect(() => {
    const editClientId = searchParams.get('edit');
    if (editClientId && clients.length > 0) {
      const clientToEdit = clients.find(client => client._id === editClientId);
      if (clientToEdit) {
        handleShowModal(clientToEdit);
        // Remove the edit parameter from URL after opening modal
        setSearchParams({});
      }
    }
  }, [clients, searchParams, setSearchParams]);

  const applyFilters = () => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone?.includes(searchTerm)
      );
    }

    // Service company filter
    if (serviceFilter) {
      filtered = filtered.filter((client) => client.serviceCompany === serviceFilter);
    }

    setFilteredClients(filtered);
  };

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
    // Clear URL parameters when modal is closed
    setSearchParams({});
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
        // Create the client (backend will automatically create project)
        console.log('Creating client with data:', formData);
        const response = await clientApi.createClient(formData);
        console.log('Client creation response:', response);
        console.log('Response data:', response.data);
        console.log('Response data keys:', Object.keys(response.data || {}));
        
        // Check if project was also created
        if (response.data?.project) {
          console.log('Project created:', response.data.project);
          toast.success("Client and project created successfully!");
        } else if (response.data?.projectError) {
          console.log('Project creation failed:', response.data.projectError);
          toast.success("Client created successfully, but project creation failed. You can create the project manually.");
        } else {
          console.log('No project in response, only client created');
          console.log('Full response.data:', JSON.stringify(response.data, null, 2));
          toast.success("Client created successfully!");
        }
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

  const handleMarkAsWon = (client) => {
    setCurrentClient(client);
    setShowWonModal(true);
  };

  const handleWonSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send notification about client won
      await notifyClientWon(currentClient, currentUser, wonClientData);
      
      toast.success(`🎉 ${currentClient.name} marked as won! Notifications sent to team.`);
      setShowWonModal(false);
      setWonClientData({
        projectValue: '',
        projectName: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error sending won client notification:', error);
      toast.error('Failed to send won client notification. Please try again.');
    }
  };

  const handleSendNotification = (client) => {
    // Navigate to notification creation with pre-filled client data
    navigate('/admin/notifications/create', {
      state: {
        prefilledData: {
          title: `Update regarding ${client.name}`,
          message: `Important update about client ${client.name} from ${client.company || 'company'}`,
          type: 'client_update',
          clientId: client._id
        }
      }
    });
  };

  const handleToggleVip = async (client) => {
    try {
      const newVipStatus = !client.isVip;
      const vipData = {
        isVip: newVipStatus,
        vipLevel: newVipStatus ? 'gold' : 'standard',
        vipNotes: newVipStatus ? 'Marked as VIP client for priority service' : ''
      };

      await clientApi.toggleClientVip(client._id, vipData);
      
      // Update the client in the local state
      setClients(prevClients => 
        prevClients.map(c => 
          c._id === client._id 
            ? { ...c, isVip: newVipStatus, vipLevel: vipData.vipLevel }
            : c
        )
      );

      toast.success(
        newVipStatus 
          ? `${client.name} has been marked as VIP client!` 
          : `VIP status removed from ${client.name}`
      );
    } catch (error) {
      console.error('Error toggling VIP status:', error);
      toast.error('Failed to update VIP status. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading clients...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <style>{dropdownStyles}</style>
      <Container fluid className="py-4" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', minHeight: '100vh' }}>
        {/* Modern Header */}
      <Card className="border-0 shadow-lg mb-4" style={{ 
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded-circle me-3">
                  <FaUserTie size={24} className="text-success" />
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-dark">Client Management Hub</h2>
                  <p className="mb-0 text-muted">
                    Comprehensive client relationship management and business insights
                  </p>
                </div>
              </div>
            </Col>
            <Col md={4} className="text-end">
              <Button
                variant="success"
                size="lg"
                onClick={() => handleShowModal()}
                className="shadow-sm fw-semibold"
                style={{ borderRadius: '15px' }}
              >
                <FaPlus className="me-2" />
                Add New Client
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Enhanced Info Alert */}
      <Row className="mb-4">
        <Col>
          <Alert 
            variant="success" 
            className="border-0 shadow-sm"
            style={{ 
              background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
              borderRadius: '15px',
              border: '1px solid rgba(76, 175, 80, 0.2)'
            }}
          >
            <div className="d-flex align-items-center">
              <div className="bg-success bg-opacity-20 p-2 rounded-circle me-3">
                <FaHandshake className="text-success" />
              </div>
              <div>
                <strong className="text-success">Professional Client Management:</strong>
                <p className="mb-0 mt-1 text-muted">
                  Manage client relationships, track business information, and maintain comprehensive 
                  records for better customer service and business growth.
                </p>
              </div>
            </div>
          </Alert>
        </Col>
      </Row>

      {/* Enhanced Stats Cards */}
      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-success fw-semibold">Total Clients</p>
                  <h2 className="mb-0 text-dark fw-bold">{clients.length}</h2>
                  <small className="text-muted">Active relationships</small>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                  <FaUserTie size={28} className="text-success" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-primary fw-semibold">We Alll Clients</p>
                  <h2 className="mb-0 text-dark fw-bold">
                    {clients.filter((c) => c.serviceCompany === "We Alll").length}
                  </h2>
                  <small className="text-muted">Primary service</small>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                  <FaChartLine size={28} className="text-primary" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-info fw-semibold">Kolkata Digital</p>
                  <h2 className="mb-0 text-dark fw-bold">
                    {clients.filter((c) => c.serviceCompany === "Kolkata Digital").length}
                  </h2>
                  <small className="text-muted">Secondary service</small>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                  <FaBuilding size={28} className="text-info" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-warning fw-semibold">This Month</p>
                  <h2 className="mb-0 text-dark fw-bold">
                    {clients.filter((c) => {
                      const clientDate = new Date(c.createdAt);
                      const currentDate = new Date();
                      return clientDate.getMonth() === currentDate.getMonth() && 
                             clientDate.getFullYear() === currentDate.getFullYear();
                    }).length}
                  </h2>
                  <small className="text-muted">New acquisitions</small>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                  <FaUsers size={28} className="text-warning" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Filters and Search */}
      <Card className="border-0 shadow-lg mb-4" style={{ borderRadius: '20px' }}>
        <Card.Header className="bg-white border-0 pt-4 pb-0" style={{ borderRadius: '20px 20px 0 0' }}>
          <h5 className="mb-0 text-dark fw-bold">
            <FaFilter className="me-2 text-success" />
            Advanced Search & Filters
          </h5>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col lg={6} md={8}>
              <Form.Label className="fw-semibold text-muted small">SEARCH CLIENTS</Form.Label>
              <InputGroup className="shadow-sm">
                <InputGroup.Text className="bg-light border-0">
                  <FaSearch className="text-success" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, company, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 bg-light"
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </InputGroup>
            </Col>
            <Col lg={2} md={2}>
              <Form.Label className="fw-semibold text-muted small">SERVICE</Form.Label>
              <Form.Select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="shadow-sm border-0 bg-light"
                style={{ borderRadius: '10px' }}
              >
                <option value="">All Services</option>
                <option value="We Alll">We Alll</option>
                <option value="Kolkata Digital">Kolkata Digital</option>
              </Form.Select>
            </Col>
            <Col lg={4} md={2}>
              <Form.Label className="fw-semibold text-muted small">ACTIONS</Form.Label>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-success" 
                  className="flex-fill shadow-sm fw-semibold"
                  style={{ borderRadius: '10px' }}
                >
                  <FaDownload className="me-2" />
                  Export Data
                </Button>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip>Clear all filters</Tooltip>}
                >
                  <Button 
                    variant="outline-secondary"
                    onClick={() => {
                      setSearchTerm('');
                      setServiceFilter('');
                    }}
                    style={{ borderRadius: '10px' }}
                  >
                    <FaFilter />
                  </Button>
                </OverlayTrigger>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Modern Client Cards */}
      <Card className="border-0 shadow-lg" style={{ borderRadius: '20px' }}>
        <Card.Header className="bg-white border-0 pt-4 pb-0" style={{ borderRadius: '20px 20px 0 0' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 text-dark fw-bold">
              <FaUserTie className="me-2 text-success" />
              Client Directory ({filteredClients.length})
            </h5>
            <Badge bg="success" className="px-3 py-2 rounded-pill">
              {filteredClients.length} Results
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <style>{`
            .client-card {
              transition: all 0.3s ease;
              border-radius: 15px;
              border: 1px solid rgba(0,0,0,0.05);
            }
            .client-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.1);
              border-color: rgba(76, 175, 80, 0.3);
            }
            .client-info-item {
              display: flex;
              align-items: center;
              margin-bottom: 0.5rem;
              color: #6c757d;
              font-size: 0.85rem;
            }
            .client-info-item .icon {
              width: 16px;
              margin-right: 8px;
              color: #28a745;
            }
            .action-btn {
              border-radius: 10px;
              padding: 0.5rem 1rem;
              font-weight: 600;
              transition: all 0.2s ease;
            }
            .action-btn:hover {
              transform: translateY(-1px);
            }
          `}</style>
          
          {filteredClients.length > 0 ? (
            <div className="p-4">
              <Row 
                className="g-4"
                style={{ overflow: 'visible' }}
              >
                {filteredClients.map((client) => (
                  <Col lg={6} xl={4} key={client._id}>
                    <Card 
                      className="client-card h-100 border-0 shadow-sm"
                      style={{ overflow: 'visible', position: 'relative' }}
                    >
                      <Card.Body 
                        className="p-4"
                        style={{ overflow: 'visible', position: 'relative' }}
                      >
                        {/* Client Header */}
                        <div className="d-flex align-items-start mb-3">
                          <div className="bg-success bg-opacity-10 p-3 rounded-circle me-3">
                            <FaUserTie size={24} className="text-success" />
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <h6 className="mb-0 fw-bold text-dark">{client.name}</h6>
                              {client.isVip && (
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip>VIP Client - {client.vipLevel || 'Gold'} Level</Tooltip>}
                                >
                                  <Badge bg="warning" className="d-flex align-items-center gap-1">
                                    <span>⭐</span> VIP
                                  </Badge>
                                </OverlayTrigger>
                              )}
                            </div>
                            <p className="mb-2 text-muted small">{client.company || "Individual Client"}</p>
                            <Badge 
                              bg={client.serviceCompany === "We Alll" ? "primary" : "info"} 
                              className="rounded-pill px-2 py-1"
                            >
                              {client.serviceCompany || "No Service"}
                            </Badge>
                          </div>
                        </div>

                        {/* Client Info */}
                        <div className="mb-3">
                          <div className="client-info-item">
                            <FaEnvelope className="icon" />
                            <span className="text-truncate">{client.email}</span>
                          </div>
                          <div className="client-info-item">
                            <FaPhone className="icon" />
                            <span>{client.phone || "No phone"}</span>
                          </div>
                          {client.whatsappnumber && (
                            <div className="client-info-item">
                              <FaWhatsapp className="icon" />
                              <span>{client.whatsappnumber}</span>
                            </div>
                          )}
                          <div className="client-info-item">
                            <FaIndustry className="icon" />
                            <span>{client.industry || "Industry not specified"}</span>
                          </div>
                          <div className="client-info-item">
                            <FaMapMarkerAlt className="icon" />
                            <span>Joined: {formatDate(client.createdAt)}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            className="action-btn flex-fill"
                            onClick={() => navigate(`/clients/${client._id}`)}
                          >
                            <FaEye className="me-1" />
                            View Details
                          </Button>
                          <Dropdown 
                            align="end"
                            style={{ position: 'static' }}
                          >
                            <Dropdown.Toggle
                              variant="outline-secondary"
                              size="sm"
                              className="action-btn"
                              style={{ minWidth: '40px' }}
                            >
                              <FaEdit />
                            </Dropdown.Toggle>
                            <Dropdown.Menu 
                              className="shadow-lg border-0" 
                              style={{ 
                                borderRadius: '10px',
                                zIndex: 9999,
                                position: 'absolute',
                                willChange: 'transform'
                              }}
                            >
                              <Dropdown.Item
                                onClick={() => handleShowModal(client)}
                                className="py-2"
                              >
                                <FaEdit className="me-2 text-primary" />
                                Edit Client
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => handleMarkAsWon(client)}
                                className="py-2"
                              >
                                <FaTrophy className="me-2 text-warning" />
                                Mark as Won
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => handleSendNotification(client)}
                                className="py-2"
                              >
                                <FaBell className="me-2 text-info" />
                                Send Notification
                              </Dropdown.Item>
                              {/* VIP Status Toggle - Admin/Manager only */}
                              {(currentUser?.role === "admin" || currentUser?.role === "superadmin" || currentUser?.role === "manager" || currentUser?.role === "hr") && (
                                <Dropdown.Item
                                  onClick={() => handleToggleVip(client)}
                                  className="py-2"
                                >
                                  <span className="me-2">⭐</span>
                                  {client.isVip ? 'Remove VIP Status' : 'Mark as VIP Client'}
                                </Dropdown.Item>
                              )}
                              {/* Only admin and superadmin can delete clients */}
                              {(currentUser?.role === "admin" || currentUser?.role === "superadmin") && (
                                <>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    className="py-2 text-danger"
                                    onClick={() => handleDelete(client._id)}
                                  >
                                    <FaTrash className="me-2" />
                                    Delete Client
                                  </Dropdown.Item>
                                </>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-4">
                <FaUserTie size={64} className="text-muted opacity-50" />
              </div>
              <h5 className="text-muted mb-2">No Clients Found</h5>
              <p className="text-muted mb-4">
                {searchTerm || serviceFilter 
                  ? "Try adjusting your search criteria or filters"
                  : "Start by adding your first client to the system"
                }
              </p>
              {!searchTerm && !serviceFilter && (
                <Button
                  variant="success"
                  onClick={() => handleShowModal()}
                  className="action-btn"
                >
                  <FaPlus className="me-2" />
                  Add First Client
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

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

      {/* Mark as Won Modal */}
      <Modal show={showWonModal} onHide={() => setShowWonModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center">
            <div 
              className="rounded-circle p-3 me-3"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
              }}
            >
              <FaTrophy className="text-white" size={24} />
            </div>
            <span>🎉 Mark Client as Won</span>
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleWonSubmit}>
          <Modal.Body className="pt-2 pb-4">
            {currentClient && (
              <>
                <Alert variant="success" className="d-flex align-items-center mb-4">
                  <FaTrophy className="me-2" />
                  <div>
                    <strong>Congratulations!</strong> You're about to mark <strong>{currentClient.name}</strong> as a won client.
                    This will notify the entire team about this achievement.
                  </div>
                </Alert>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Project Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter project name"
                        value={wonClientData.projectName}
                        onChange={(e) => setWonClientData({...wonClientData, projectName: e.target.value})}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Project Value (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        placeholder="Enter project value"
                        value={wonClientData.projectValue}
                        onChange={(e) => setWonClientData({...wonClientData, projectValue: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Additional Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Add any additional details about winning this client..."
                        value={wonClientData.notes}
                        onChange={(e) => setWonClientData({...wonClientData, notes: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="mt-4 p-3 bg-light rounded">
                  <h6 className="mb-2">📢 Notification Details</h6>
                  <p className="mb-1 small text-muted">
                    <strong>Who will be notified:</strong> All HR, Admin, and SuperAdmin users
                  </p>
                  <p className="mb-0 small text-muted">
                    <strong>Notification type:</strong> High priority client won announcement
                  </p>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button 
              variant="light" 
              onClick={() => setShowWonModal(false)}
              className="px-4"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="warning"
              className="px-4 fw-semibold"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
              }}
            >
              <FaTrophy className="me-2" />
              Mark as Won & Notify Team
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
    </>
  );
};

export default ClientList;
