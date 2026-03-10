import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  ButtonGroup,
  Modal,
  Form,
  Badge,
  InputGroup,
  Spinner,
  Dropdown,
  Alert,
  OverlayTrigger,
  Tooltip,
  Table,
} from "react-bootstrap";
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaUserTie, 
  FaEnvelope, 
  FaPhone, 
  FaSearch, 
  FaFilter,
  FaBell, 
  FaDownload,
  FaChartLine,
  FaUsers,
  FaHandshake,
  FaMapMarkerAlt,
  FaIndustry,
  FaWhatsapp,
  FaTh,
  FaList,
  FaBuilding
} from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { clientApi } from "../../api/clientApi";
import { departmentApi } from "../../api/departmentApi";
import { formatDate } from "../../utils/helpers";
import { decodeArrayHtmlEntities } from "../../utils/htmlDecoder";

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
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all"); // Changed default to "all"
  const [viewMode, setViewMode] = useState("cards"); // Default to cards view
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
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
    status: "Active", // Add status field with default value
  });

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchDepartments();
    }
  }, [user]);

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
          client.phone?.toString().includes(searchTerm)
      );
    }

    // Service company filter
    if (serviceFilter && serviceFilter !== "all") {
      filtered = filtered.filter((client) => client.serviceCompany === serviceFilter);
    }

    // Sort clients: Active first, then On Hold, then Lost
    filtered.sort((a, b) => {
      const statusOrder = { "Active": 0, "On Hold": 1, "Lost": 2 };
      const aOrder = statusOrder[a.status] ?? 3;
      const bOrder = statusOrder[b.status] ?? 3;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If same status, sort by name alphabetically
      return (a.name || "").localeCompare(b.name || "");
    });

    setFilteredClients(filtered);
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Check if user is available
      if (!user) {
        console.log("User not available yet, skipping fetch");
        setLoading(false);
        return;
      }
      
      // Use different API endpoint based on user role
      let response;
      if (user?.role === 'employee' || user?.role === 'hod') {
        // Employees and HoDs get clients from their assigned projects
        response = await clientApi.getMyClients();
      } else {
        // Admin, superadmin, hr, manager get all clients
        response = await clientApi.getAllClients();
      }
      
      setClients(decodeArrayHtmlEntities(response.data));
    } catch (error) {
      console.error("Client fetch error:", error);
      console.error("Error response:", error.response);
      
      // Handle 403 errors specifically for employees
      if (error.response?.status === 403 && (user?.role === 'employee' || user?.role === 'hod')) {
        toast.info("You can only see clients from projects you're working on. No clients found in your assigned projects.");
        setClients([]);
      } else {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.statusText ||
          "Failed to fetch clients. Please check your permissions.";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      // Fetch only operational departments for client assignment
      const data = await departmentApi.getOperationalDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      // Show user-friendly error
      toast.error("Failed to load departments. Please refresh the page.");
    } finally {
      setDepartmentsLoading(false);
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
        status: client.status || "Active", // Add status field
      });
      // Set selected departments for edit mode
      const departmentIds = client.assignedDepartments?.map(dept => 
        typeof dept === 'object' ? dept._id : dept
      ) || [];
      setSelectedDepartments(departmentIds);
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
        status: "Active", // Add status field with default value
      });
      // Clear selected departments for new client
      setSelectedDepartments([]);
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
      status: "Active", // Add status field with default value
    });
    // Clear selected departments
    setSelectedDepartments([]);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDepartmentChange = (departmentId) => {
    setSelectedDepartments(prev => {
      if (prev.includes(departmentId)) {
        return prev.filter(id => id !== departmentId);
      } else {
        return [...prev, departmentId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await clientApi.updateClient(currentClient._id, formData);
        
        // Update department assignments if user has permission
        if (['hr', 'manager', 'admin', 'superadmin'].includes(user?.role) && selectedDepartments.length > 0) {
          try {
            await clientApi.assignDepartments(currentClient._id, selectedDepartments);
          } catch (deptError) {
            console.error('Department assignment error:', deptError);
            toast.warning("Client updated successfully, but department assignment failed. You can assign departments from the client details page.");
          }
        }
        
        toast.success("Client updated successfully");
      } else {
        // Create the client (backend will automatically create project)
        console.log('Creating client with data:', formData);
        const response = await clientApi.createClient(formData);
        console.log('Client creation response:', response);
        
        // Assign departments if user has permission and departments are selected
        if (['hr', 'manager', 'admin', 'superadmin'].includes(user?.role) && selectedDepartments.length > 0) {
          try {
            await clientApi.assignDepartments(response.data.client._id, selectedDepartments);
          } catch (deptError) {
            console.error('Department assignment error:', deptError);
            toast.warning("Client created successfully, but department assignment failed. You can assign departments from the client details page.");
          }
        }
        
        // Check if project was also created
        if (response.data?.project) {
          console.log('Project created:', response.data.project);
          toast.success("Client and project created successfully!");
        } else if (response.data?.projectError) {
          console.log('Project creation failed:', response.data.projectError);
          toast.success("Client created successfully, but project creation failed. You can create the project manually.");
        } else {
          console.log('No project in response, only client created');
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

  if (loading || !user) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">
            {!user ? "Loading user information..." : "Loading clients..."}
          </p>
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
                  <h2 className="mb-1 fw-bold text-dark">
                    {user?.role === 'employee' || user?.role === 'hod' 
                      ? 'My Clients' 
                      : 'Client Management Hub'
                    }
                  </h2>
                  <p className="mb-0 text-muted">
                    {user?.role === 'employee' || user?.role === 'hod'
                      ? 'Clients from your assigned projects and work assignments'
                      : 'Comprehensive client relationship management and business insights'
                    }
                  </p>
                </div>
              </div>
            </Col>
            {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'hr') && (
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
            )}
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

      {/* Essential Stats Cards */}
      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-success fw-semibold">Total Clients</p>
                  <h2 className="mb-0 text-dark fw-bold">{clients.length}</h2>
                  <small className="text-muted">All client relationships</small>
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
                  <p className="mb-2 text-primary fw-semibold">Renewed Clients</p>
                  <h2 className="mb-0 text-dark fw-bold">
                    {clients.filter((c) => c.status === "Active").length}
                  </h2>
                  <small className="text-muted">Active & renewed</small>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                  <FaHandshake size={28} className="text-primary" />
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
                  <p className="mb-2 text-info fw-semibold">New Acquisitions</p>
                  <h2 className="mb-0 text-dark fw-bold">
                    {clients.filter((c) => {
                      if (!c.createdAt) return false;
                      const createdDate = new Date(c.createdAt);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return createdDate >= thirtyDaysAgo;
                    }).length}
                  </h2>
                  <small className="text-muted">Last 30 days</small>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                  <FaUsers size={28} className="text-info" />
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
                  <p className="mb-2 text-danger fw-semibold">Lost Clients</p>
                  <h2 className="mb-0 text-dark fw-bold">
                    {clients.filter((c) => c.status === "Lost").length}
                  </h2>
                  <small className="text-muted">Churned clients</small>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
                  <FaChartLine size={28} className="text-danger" />
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
          <Row className="g-3 align-items-end">
            <Col lg={5} md={6}>
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
            <Col lg={4} md={4}>
              <Form.Label className="fw-semibold text-muted small">SERVICE COMPANY</Form.Label>
              <div className="d-flex">
                <ButtonGroup className="w-100 shadow-sm">
                  <Button
                    variant={serviceFilter === "all" ? "success" : "outline-success"}
                    onClick={() => setServiceFilter("all")}
                    className="fw-semibold"
                    style={{ borderRadius: '10px 0 0 10px' }}
                  >
                    All Clients
                    <Badge 
                      bg={serviceFilter === "all" ? "light" : "success"} 
                      text={serviceFilter === "all" ? "dark" : "white"}
                      className="ms-2"
                    >
                      {clients.length}
                    </Badge>
                  </Button>
                  <Button
                    variant={serviceFilter === "We Alll" ? "primary" : "outline-primary"}
                    onClick={() => setServiceFilter("We Alll")}
                    className="fw-semibold"
                  >
                    We Alll
                    <Badge 
                      bg={serviceFilter === "We Alll" ? "light" : "primary"} 
                      text={serviceFilter === "We Alll" ? "dark" : "white"}
                      className="ms-2"
                    >
                      {clients.filter(c => c.serviceCompany === "We Alll").length}
                    </Badge>
                  </Button>
                  <Button
                    variant={serviceFilter === "Kolkata Digital" ? "info" : "outline-info"}
                    onClick={() => setServiceFilter("Kolkata Digital")}
                    className="fw-semibold"
                    style={{ borderRadius: '0 10px 10px 0' }}
                  >
                    Kolkata Digital
                    <Badge 
                      bg={serviceFilter === "Kolkata Digital" ? "light" : "info"} 
                      text={serviceFilter === "Kolkata Digital" ? "dark" : "white"}
                      className="ms-2"
                    >
                      {clients.filter(c => c.serviceCompany === "Kolkata Digital").length}
                    </Badge>
                  </Button>
                </ButtonGroup>
              </div>
            </Col>
            <Col lg={3} md={2}>
              <Form.Label className="fw-semibold text-muted small">VIEW & ACTIONS</Form.Label>
              <div className="d-flex gap-2">
                <ButtonGroup className="shadow-sm">
                  <Button
                    variant={viewMode === "cards" ? "success" : "outline-success"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="fw-semibold"
                    title="Card View"
                  >
                    <FaTh className="me-1" />
                    Cards
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "success" : "outline-success"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="fw-semibold"
                    title="List View"
                  >
                    <FaList className="me-1" />
                    List
                  </Button>
                </ButtonGroup>
                <Button 
                  variant="outline-success" 
                  size="sm"
                  className="shadow-sm fw-semibold"
                  style={{ borderRadius: '10px' }}
                >
                  <FaDownload className="me-1" />
                  Export
                </Button>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip>Clear all filters</Tooltip>}
                >
                  <Button 
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setServiceFilter('all');
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
              {viewMode === "cards" ? (
                // Card View
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
                              <div className="d-flex gap-2 flex-wrap">
                                <Badge 
                                  bg={client.serviceCompany === "We Alll" ? "primary" : "info"} 
                                  className="rounded-pill px-2 py-1"
                                >
                                  {client.serviceCompany || "No Service"}
                                </Badge>
                                <Badge 
                                  bg={
                                    client.status === "Active" ? "success" : 
                                    client.status === "On Hold" ? "warning" : 
                                    client.status === "Lost" ? "danger" : "secondary"
                                  } 
                                  className="rounded-pill px-2 py-1"
                                >
                                  {client.status || "Active"}
                                </Badge>
                              </div>
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
                            {client.assignedDepartments && client.assignedDepartments.length > 0 && (
                              <div className="client-info-item">
                                <FaBuilding className="icon" />
                                <span>Departments: {client.assignedDepartments.map(dept => 
                                  typeof dept === 'object' ? dept.name : dept
                                ).join(', ')}</span>
                              </div>
                            )}
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
                                  onClick={() => handleSendNotification(client)}
                                  className="py-2"
                                >
                                  <FaBell className="me-2 text-info" />
                                  Send Notification
                                </Dropdown.Item>
                                {/* VIP Status Toggle - Admin/Manager only */}
                                {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "manager" || user?.role === "hr") && (
                                  <Dropdown.Item
                                    onClick={() => handleToggleVip(client)}
                                    className="py-2"
                                  >
                                    <span className="me-2">⭐</span>
                                    {client.isVip ? 'Remove VIP Status' : 'Mark as VIP Client'}
                                  </Dropdown.Item>
                                )}
                                {/* Only admin and superadmin can delete clients */}
                                {(user?.role === "admin" || user?.role === "superadmin") && (
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
              ) : (
                // List View
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th className="border-0">Client</th>
                        <th className="border-0">Contact</th>
                        <th className="border-0">Company</th>
                        <th className="border-0">Service</th>
                        <th className="border-0">Status</th>
                        <th className="border-0">Industry</th>
                        <th className="border-0">Departments</th>
                        <th className="border-0">Joined</th>
                        <th className="border-0 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client) => (
                        <tr key={client._id} className="align-middle">
                          <td className="py-3">
                            <div className="d-flex align-items-center">
                              <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                                <FaUserTie size={16} className="text-success" />
                              </div>
                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <h6 className="mb-0 fw-bold text-dark">{client.name}</h6>
                                  {client.isVip && (
                                    <Badge bg="warning" className="d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                      <span>⭐</span> VIP
                                    </Badge>
                                  )}
                                </div>
                                <small className="text-muted">{client.email}</small>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <div>
                              <div className="d-flex align-items-center mb-1">
                                <FaPhone size={12} className="text-success me-2" />
                                <small>{client.phone || "No phone"}</small>
                              </div>
                              {client.whatsappnumber && (
                                <div className="d-flex align-items-center">
                                  <FaWhatsapp size={12} className="text-success me-2" />
                                  <small>{client.whatsappnumber}</small>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div>
                              <div className="fw-semibold text-dark">{client.company || "Individual"}</div>
                              {client.ownername && (
                                <small className="text-muted">Owner: {client.ownername}</small>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge 
                              bg={client.serviceCompany === "We Alll" ? "primary" : "info"} 
                              className="rounded-pill"
                            >
                              {client.serviceCompany || "No Service"}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge 
                              bg={
                                client.status === "Active" ? "success" : 
                                client.status === "On Hold" ? "warning" : 
                                client.status === "Lost" ? "danger" : "secondary"
                              } 
                              className="rounded-pill"
                            >
                              {client.status || "Active"}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <small className="text-muted">{client.industry || "Not specified"}</small>
                          </td>
                          <td className="py-3">
                            {client.assignedDepartments && client.assignedDepartments.length > 0 ? (
                              <div>
                                {client.assignedDepartments.slice(0, 2).map((dept, index) => (
                                  <Badge key={index} bg="success" className="me-1 mb-1" style={{ fontSize: '0.7rem' }}>
                                    {typeof dept === 'object' ? dept.name : dept}
                                  </Badge>
                                ))}
                                {client.assignedDepartments.length > 2 && (
                                  <small className="text-muted">+{client.assignedDepartments.length - 2} more</small>
                                )}
                              </div>
                            ) : (
                              <small className="text-muted">Not assigned</small>
                            )}
                          </td>
                          <td className="py-3">
                            <small className="text-muted">{formatDate(client.createdAt)}</small>
                          </td>
                          <td className="py-3 text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => navigate(`/clients/${client._id}`)}
                                title="View Details"
                                style={{ padding: '0.25rem 0.5rem' }}
                              >
                                <FaEye size={12} />
                              </Button>
                              <Dropdown align="end">
                                <Dropdown.Toggle
                                  variant="outline-secondary"
                                  size="sm"
                                  style={{ padding: '0.25rem 0.5rem' }}
                                >
                                  <FaEdit size={12} />
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="shadow-lg border-0" style={{ borderRadius: '10px' }}>
                                  <Dropdown.Item
                                    onClick={() => handleShowModal(client)}
                                    className="py-2"
                                  >
                                    <FaEdit className="me-2 text-primary" />
                                    Edit Client
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    onClick={() => handleSendNotification(client)}
                                    className="py-2"
                                  >
                                    <FaBell className="me-2 text-info" />
                                    Send Notification
                                  </Dropdown.Item>
                                  {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "manager" || user?.role === "hr") && (
                                    <Dropdown.Item
                                      onClick={() => handleToggleVip(client)}
                                      className="py-2"
                                    >
                                      <span className="me-2">⭐</span>
                                      {client.isVip ? 'Remove VIP Status' : 'Mark as VIP Client'}
                                    </Dropdown.Item>
                                  )}
                                  {(user?.role === "admin" || user?.role === "superadmin") && (
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-4">
                <FaUserTie size={64} className="text-muted opacity-50" />
              </div>
              <h5 className="text-muted mb-2">No Clients Found</h5>
              <p className="text-muted mb-4">
                {searchTerm || (serviceFilter && serviceFilter !== "all")
                  ? "Try adjusting your search criteria or filters"
                  : "Start by adding your first client to the system"
                }
              </p>
              {!searchTerm && (!serviceFilter || serviceFilter === "all") && (
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
              <Col md={6}>
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Client Status *</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Lost">Lost</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Current status of the client relationship.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Department Assignment Section - Only for HR/Manager/Admin */}
            {['hr', 'manager', 'admin', 'superadmin'].includes(user?.role) && (
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaBuilding className="me-2 text-primary" />
                      Department Assignment
                      <small className="ms-2 text-muted">({departments.length} available)</small>
                    </Form.Label>
                    <div className="border rounded p-3" style={{ backgroundColor: '#f8f9fa' }}>
                      <Form.Text className="text-muted d-block mb-3">
                        Select which operational departments will work with this client. HR and administrative departments have access to all clients by default.
                      </Form.Text>
                      {departmentsLoading ? (
                        <div className="text-center py-3">
                          <Spinner animation="border" size="sm" className="me-2" />
                          <span className="text-muted">Loading departments...</span>
                        </div>
                      ) : departments.length > 0 ? (
                        <Row>
                          {departments.map((department) => (
                            <Col md={6} key={department._id} className="mb-2">
                              <Form.Check
                                type="checkbox"
                                id={`dept-${department._id}`}
                                label={department.name}
                                checked={selectedDepartments.includes(department._id)}
                                onChange={() => handleDepartmentChange(department._id)}
                                className="fw-semibold"
                              />
                            </Col>
                          ))}
                        </Row>
                      ) : (
                        <div className="text-center py-3">
                          <FaBuilding size={32} className="text-muted mb-2" />
                          <p className="text-muted mb-0">No departments available</p>
                          <small className="text-muted">Contact your administrator to set up departments</small>
                          <div className="mt-2">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={fetchDepartments}
                              disabled={departmentsLoading}
                            >
                              {departmentsLoading ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Loading...
                                </>
                              ) : (
                                'Retry Loading Departments'
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedDepartments.length > 0 && (
                        <div className="mt-3 pt-3 border-top">
                          <small className="text-success fw-semibold">
                            Selected Departments ({selectedDepartments.length}):
                          </small>
                          <div className="mt-2">
                            {departments
                              .filter(dept => selectedDepartments.includes(dept._id))
                              .map(dept => (
                                <Badge key={dept._id} bg="success" className="me-2 mb-1">
                                  {dept.name}
                                </Badge>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            )}

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
    </>
  );
};

export default ClientList;
