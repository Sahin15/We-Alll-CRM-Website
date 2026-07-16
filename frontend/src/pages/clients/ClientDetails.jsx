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
  Alert,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PAGE_ACCESS, checkPageAccess } from "../../constants/pageAccess";
import { canViewAllCompanyProjects } from "../../utils/resourceVisibility";
import {
  FaArrowLeft,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaMapMarkerAlt,
  FaSave,
  FaTimes,
  FaPlus,
  FaProjectDiagram,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { clientApi } from "../../api/clientApi";
import { departmentApi } from "../../api/departmentApi";
import { projectApi } from "../../api/projectApi";
import { subscriptionAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import { decodeObjectHtmlEntities } from "../../utils/htmlDecoder";

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canAccess, authzEffective, canPermission } = useAuth();
  const visibilityParams = { user, authzEffective, canPermission };
  const canManageClients = checkPageAccess(canAccess, PAGE_ACCESS.crmClientManage);
  const canViewAllProjects = canViewAllCompanyProjects(visibilityParams);
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
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
    status: "Active", // Add status field
  });
  const [newProjectData, setNewProjectData] = useState({
    name: "",
    description: "",
    department: "",
    startDate: "",
    endDate: "",
    budget: "",
    priority: "medium",
    status: "Pending",
    assignedUsers: [],
  });

  useEffect(() => {
    fetchClientDetails();
    fetchClientProjects();
    fetchClientSubscriptions();
    fetchDepartments();
    fetchUsers();
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      const response = await clientApi.getClientById(id);
      const decodedClient = decodeObjectHtmlEntities(response.data);
      setClient(decodedClient);
      
      // Set selected departments if they exist
      if (decodedClient.assignedDepartments) {
        setSelectedDepartments(decodedClient.assignedDepartments.map(dept => 
          typeof dept === 'object' ? dept._id : dept
        ));
      }
      
      // Populate edit form data
      setEditFormData({
        name: decodedClient.name || "",
        email: decodedClient.email || "",
        phone: decodedClient.phone || "",
        whatsappnumber: decodedClient.whatsappnumber || "",
        company: decodedClient.company || "",
        ownername: decodedClient.ownername || "",
        address: decodedClient.address || "",
        industry: decodedClient.industry || "",
        website: decodedClient.website || "",
        targetAudience: decodedClient.targetAudience || "",
        audienceGender: decodedClient.audienceGender || "",
        previousChallenges: decodedClient.previousChallenges || "",
        legalGuidelines: decodedClient.legalGuidelines || "",
        yearlyTurnover: decodedClient.yearlyTurnover || "",
        expectations: decodedClient.expectations || "",
        serviceCompany: decodedClient.serviceCompany || "",
        status: decodedClient.status || "Active", // Add status field
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
      
      // Update client basic information
      await clientApi.updateClient(id, editFormData);
      
      // Update department assignments if user has permission
      if (canManageClients) {
        try {
          await clientApi.assignDepartments(id, selectedDepartments);
        } catch (deptError) {
          console.error('Department assignment error:', deptError);
          toast.warning("Client updated successfully, but department assignment failed.");
        }
      }
      
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
      
      // Reset selected departments to original client departments
      if (client.assignedDepartments) {
        setSelectedDepartments(client.assignedDepartments.map(dept => 
          typeof dept === 'object' ? dept._id : dept
        ));
      } else {
        setSelectedDepartments([]);
      }
    }
  };

  const fetchClientProjects = async () => {
    try {
      // Use appropriate API method based on user role
      let response;
      if (canViewAllProjects) {
        response = await projectApi.getAllProjects();
      } else {
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

  const fetchDepartments = async () => {
    try {
      // Fetch only operational departments for client assignment
      const data = await departmentApi.getOperationalDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      toast.error("Failed to load departments");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to get only employees and HoDs from operational departments
        const employeeUsers = data.filter(user => 
          ['employee', 'hod'].includes(user.role) &&
          user.department?.type !== 'administrative' // Exclude administrative department staff
        );
        setUsers(employeeUsers);
      } else {
        console.error('Failed to fetch users:', response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
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

  const handleAddProject = async (e) => {
    e.preventDefault();
    setProjectLoading(true);

    try {
      const projectData = {
        ...newProjectData,
        client: id,
        createdBy: user.id,
      };

      const response = await projectApi.createProject(projectData);
      
      if (response.data) {
        toast.success("Project created successfully!");
        setShowAddProjectModal(false);
        setNewProjectData({
          name: "",
          description: "",
          department: "",
          startDate: "",
          endDate: "",
          budget: "",
          priority: "medium",
          status: "Pending",
          assignedUsers: [],
        });
        // Refresh projects list
        fetchClientProjects();
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(error.response?.data?.message || "Failed to create project");
    } finally {
      setProjectLoading(false);
    }
  };

  const handleProjectInputChange = (e) => {
    const { name, value } = e.target;
    setNewProjectData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssignedUsersChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setNewProjectData(prev => ({
      ...prev,
      assignedUsers: selectedOptions
    }));
  };

  const handleDepartmentAssignment = async (e) => {
    e.preventDefault();
    setDepartmentLoading(true);

    try {
      await clientApi.assignDepartments(id, selectedDepartments);
      toast.success("Departments assigned successfully!");
      setShowDepartmentModal(false);
      // Refresh client data
      fetchClientDetails();
    } catch (error) {
      console.error("Error assigning departments:", error);
      toast.error(error.response?.data?.message || "Failed to assign departments");
    } finally {
      setDepartmentLoading(false);
    }
  };

  const handleDepartmentSelectionChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedDepartments(selectedOptions);
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
                <Badge 
                  bg={
                    client.status === "Active" ? "success" : 
                    client.status === "On Hold" ? "warning" : 
                    client.status === "Lost" ? "danger" : "success"
                  }
                >
                  {client.status || "Active"}
                </Badge>
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

                {/* Department Assignment Section */}
                <ListGroup.Item className="px-0">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <FaBuilding className="me-2 text-success" />
                      <strong>Assigned Departments:</strong>
                      <br />
                      {client.assignedDepartments && client.assignedDepartments.length > 0 ? (
                        <div className="mt-2">
                          {client.assignedDepartments.map((dept, index) => (
                            <Badge key={index} bg="success" className="me-1 mb-1">
                              {typeof dept === 'object' ? dept.name : dept}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <small className="text-muted">No departments assigned</small>
                      )}
                    </div>
                    {(user?.role === 'hr' || user?.role === 'manager' || user?.role === 'admin' || user?.role === 'superadmin') && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => setShowDepartmentModal(true)}
                        title="Assign Departments"
                      >
                        <FaEdit size={12} />
                      </Button>
                    )}
                  </div>
                </ListGroup.Item>

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
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Projects ({projects.length})</h5>
              {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'hr' || user?.role === 'hod') && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setShowAddProjectModal(true)}
                >
                  <FaPlus className="me-1" />
                  Add Project
                </Button>
              )}
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
                  <FaProjectDiagram size={48} className="mb-3 opacity-50" />
                  <p className="mb-3">No projects found for this client</p>
                  {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'hr' || user?.role === 'hod') ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowAddProjectModal(true)}
                    >
                      <FaPlus className="me-1" />
                      Create First Project
                    </Button>
                  ) : (
                    <Alert variant="info" className="mt-3">
                      Contact your administrator to create projects for this client.
                    </Alert>
                  )}
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
              <Col md={6}>
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Client Status *</Form.Label>
                  <Form.Select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
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
            {canManageClients && (
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
                      {departments.length > 0 ? (
                        <Row>
                          {departments.map((department) => (
                            <Col md={6} key={department._id} className="mb-2">
                              <Form.Check
                                type="checkbox"
                                id={`edit-dept-${department._id}`}
                                label={department.name}
                                checked={selectedDepartments.includes(department._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDepartments(prev => [...prev, department._id]);
                                  } else {
                                    setSelectedDepartments(prev => prev.filter(id => id !== department._id));
                                  }
                                }}
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

      {/* Add Project Modal */}
      <Modal show={showAddProjectModal} onHide={() => setShowAddProjectModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaPlus className="me-2" />
            Add New Project for {client?.name}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddProject}>
          <Modal.Body>
            <Alert variant="info" className="mb-4">
              <strong>Multi-Service Client:</strong> Create additional projects for different services 
              (e.g., Social Media Marketing, Website Development, SEO, etc.)
            </Alert>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Project Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={newProjectData.name}
                    onChange={handleProjectInputChange}
                    placeholder="e.g., Website Development, Social Media Campaign"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department/Service *</Form.Label>
                  <Form.Select
                    name="department"
                    value={newProjectData.department}
                    onChange={handleProjectInputChange}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Project Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={newProjectData.description}
                onChange={handleProjectInputChange}
                placeholder="Describe the project scope and objectives..."
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    name="priority"
                    value={newProjectData.priority}
                    onChange={handleProjectInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={newProjectData.startDate}
                    onChange={handleProjectInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={newProjectData.endDate}
                    onChange={handleProjectInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Budget (Optional)</Form.Label>
                  <Form.Control
                    type="number"
                    name="budget"
                    value={newProjectData.budget}
                    onChange={handleProjectInputChange}
                    placeholder="Enter project budget"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Assign Team Members</Form.Label>
                  <Form.Select
                    multiple
                    name="assignedUsers"
                    value={newProjectData.assignedUsers}
                    onChange={handleAssignedUsersChange}
                    size={4}
                  >
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.role}) - {user.department?.name || 'No Dept'}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Hold Ctrl/Cmd to select multiple team members
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowAddProjectModal(false)} 
              disabled={projectLoading}
            >
              <FaTimes className="me-2" />
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={projectLoading}>
              {projectLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Creating Project...
                </>
              ) : (
                <>
                  <FaPlus className="me-2" />
                  Create Project
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Department Assignment Modal */}
      <Modal show={showDepartmentModal} onHide={() => setShowDepartmentModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBuilding className="me-2" />
            Assign Departments to {client?.name}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleDepartmentAssignment}>
          <Modal.Body>
            <Alert variant="info" className="mb-4">
              <strong>Department Assignment:</strong> Select which departments will work with this client. 
              Staff can see this client in My Clients only when they are the account manager or on an active project team for that client.
            </Alert>
            
            <Form.Group className="mb-3">
              <Form.Label>Select Departments *</Form.Label>
              <Form.Select
                multiple
                value={selectedDepartments}
                onChange={handleDepartmentSelectionChange}
                size={6}
                required
              >
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Hold Ctrl/Cmd to select multiple departments. Only employees from selected departments will see this client.
              </Form.Text>
            </Form.Group>

            {selectedDepartments.length > 0 && (
              <Alert variant="success" className="mt-3">
                <strong>Selected Departments:</strong>
                <div className="mt-2">
                  {selectedDepartments.map((deptId) => {
                    const dept = departments.find(d => d._id === deptId);
                    return dept ? (
                      <Badge key={deptId} bg="success" className="me-1 mb-1">
                        {dept.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowDepartmentModal(false)} 
              disabled={departmentLoading}
            >
              <FaTimes className="me-2" />
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={departmentLoading || selectedDepartments.length === 0}>
              {departmentLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Assigning...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  Assign Departments
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
