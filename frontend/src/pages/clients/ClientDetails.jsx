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
  Nav,
  Tab,
  Table,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PAGE_ACCESS, checkPageAccess } from "../../constants/pageAccess";
import { canViewAllCompanyProjects } from "../../utils/resourceVisibility";
import BusinessDocumentsTab from "../../components/documents/BusinessDocumentsTab";
import {
  FaArrowLeft,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaMapMarkerAlt,
  FaPlus,
  FaTrash,
  FaUser,
  FaCheck,
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
  const canEdit = canManageClients;
  const canViewAllProjects = canViewAllCompanyProjects(visibilityParams);

  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsSummary, setProjectsSummary] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Form Loading States
  const [editLoading, setEditLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  // Contacts state
  const [contactsList, setContactsList] = useState([]);
  const [editingContactIndex, setEditingContactIndex] = useState(null);
  const [contactFormData, setContactFormData] = useState({
    name: "",
    designation: "",
    type: "Email",
    value: "",
    label: "Primary",
    isPrimary: false,
  });

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
    status: "Active",
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
    fetchClientProjectsSummary();
    fetchClientSubscriptions();
    fetchDepartments();
    fetchUsers();
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      const response = await clientApi.getClientById(id);
      const decodedClient = decodeObjectHtmlEntities(response.data);
      setClient(decodedClient);
      setContactsList(decodedClient.contacts || []);

      if (decodedClient.assignedDepartments) {
        setSelectedDepartments(
          decodedClient.assignedDepartments.map((dept) =>
            typeof dept === "object" ? dept._id : dept
          )
        );
      }

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
        status: decodedClient.status || "Active",
      });
    } catch (error) {
      toast.error("Failed to fetch client details");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientProjectsSummary = async () => {
    try {
      const res = await clientApi.getClientProjectsSummary(id);
      if (res.data && res.data.data) {
        setProjectsSummary(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch project summary:", err);
    }
  };

  const fetchClientProjects = async () => {
    try {
      let response;
      if (canViewAllProjects) {
        response = await projectApi.getAllProjects();
      } else {
        response = await projectApi.getMyProjects();
      }
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
      const data = await departmentApi.getOperationalDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        const employeeUsers = data.filter(
          (userItem) =>
            ["employee", "hod"].includes(userItem.role) &&
            userItem.department?.type !== "administrative"
        );
        setUsers(employeeUsers);
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      await clientApi.updateClient(id, editFormData);
      if (canManageClients) {
        try {
          await clientApi.assignDepartments(id, selectedDepartments);
        } catch (deptError) {
          console.error("Department assignment error:", deptError);
        }
      }
      toast.success("Client updated successfully");
      setShowEditModal(false);
      await fetchClientDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update client");
    } finally {
      setEditLoading(false);
    }
  };

  // Contact Handlers
  const handleOpenAddContactModal = () => {
    setEditingContactIndex(null);
    setContactFormData({
      name: "",
      designation: "",
      type: "Email",
      value: "",
      label: "Primary",
      isPrimary: contactsList.length === 0,
    });
    setShowContactModal(true);
  };

  const handleOpenEditContactModal = (contact, index) => {
    setEditingContactIndex(index);
    setContactFormData({
      name: contact.name || "",
      designation: contact.designation || "",
      type: contact.type || "Email",
      value: contact.value || "",
      label: contact.label || "Primary",
      isPrimary: !!contact.isPrimary,
    });
    setShowContactModal(true);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!contactFormData.name || !contactFormData.value) {
      toast.error("Contact name and value are required");
      return;
    }

    setContactLoading(true);
    try {
      let updatedContacts = [...contactsList];

      if (contactFormData.isPrimary) {
        updatedContacts = updatedContacts.map((c) => ({ ...c, isPrimary: false }));
      }

      if (editingContactIndex !== null) {
        updatedContacts[editingContactIndex] = contactFormData;
      } else {
        updatedContacts.push(contactFormData);
      }

      await clientApi.updateClientContacts(id, updatedContacts);
      toast.success("Contacts updated successfully");
      setContactsList(updatedContacts);
      setShowContactModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save contact");
    } finally {
      setContactLoading(false);
    }
  };

  const handleDeleteContact = async (index) => {
    if (!window.confirm("Are you sure you want to remove this contact?")) return;
    try {
      const updatedContacts = contactsList.filter((_, i) => i !== index);
      await clientApi.updateClientContacts(id, updatedContacts);
      toast.success("Contact removed");
      setContactsList(updatedContacts);
    } catch (err) {
      toast.error("Failed to remove contact");
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
        fetchClientProjects();
        fetchClientProjectsSummary();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create project");
    } finally {
      setProjectLoading(false);
    }
  };

  const handleDepartmentAssignment = async (e) => {
    e.preventDefault();
    setDepartmentLoading(true);
    try {
      await clientApi.assignDepartments(id, selectedDepartments);
      toast.success("Departments assigned successfully!");
      setShowDepartmentModal(false);
      fetchClientDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign departments");
    } finally {
      setDepartmentLoading(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  if (!client) {
    return (
      <Container fluid className="py-5 text-center">
        <Card>
          <Card.Body>
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
    <Container fluid className="py-3">
      {/* Top Bar */}
      <Row className="align-items-center mb-3">
        <Col>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate("/clients")}
            className="mb-2"
          >
            <FaArrowLeft className="me-2" />
            Back to Clients
          </Button>
          <div className="d-flex align-items-center gap-3">
            <h2 className="mb-0">{client.name}</h2>
            <Badge
              bg={
                client.status === "Active"
                  ? "success"
                  : client.status === "On Hold"
                  ? "warning"
                  : "secondary"
              }
            >
              {client.status || "Active"}
            </Badge>
          </div>
        </Col>
        <Col className="text-end">
          {canManageClients && (
            <Button variant="primary" onClick={() => setShowEditModal(true)}>
              <FaEdit className="me-2" />
              Edit Client
            </Button>
          )}
        </Col>
      </Row>

      {/* Tabs Bar */}
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="overview">Overview</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="contacts">
              Contacts ({contactsList.length})
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="projects">
              Projects ({projectsSummary?.totalCount ?? projects.length})
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="services">
              Services ({subscriptions.length})
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="documents">Documents</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* OVERVIEW TAB */}
          <Tab.Pane eventKey="overview">
            <Row className="g-4">
              <Col lg={4}>
                <Card className="shadow-sm h-100">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">Client Information</h5>
                  </Card.Header>
                  <Card.Body>
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
                                    {typeof dept === "object" ? dept.name : dept}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <small className="text-muted">No departments assigned</small>
                            )}
                          </div>
                          {(user?.role === "hr" ||
                            user?.role === "manager" ||
                            user?.role === "admin" ||
                            user?.role === "superadmin") && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => setShowDepartmentModal(true)}
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
                          <ListGroup.Item className="px-0">
                            <strong>Industry:</strong>
                            <br />
                            {client.industry || <span className="text-muted">Not provided</span>}
                          </ListGroup.Item>

                          <ListGroup.Item className="px-0">
                            <strong>Website:</strong>
                            <br />
                            {client.website ? (
                              <a href={client.website} target="_blank" rel="noopener noreferrer">
                                {client.website}
                              </a>
                            ) : (
                              <span className="text-muted">Not provided</span>
                            )}
                          </ListGroup.Item>

                          <ListGroup.Item className="px-0">
                            <strong>Yearly Turnover:</strong>
                            <br />
                            {client.yearlyTurnover ? (
                              `₹ ${client.yearlyTurnover.toLocaleString("en-IN")}`
                            ) : (
                              <span className="text-muted">Not provided</span>
                            )}
                          </ListGroup.Item>
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
                          <ListGroup.Item className="px-0">
                            <strong>Target Audience:</strong>
                            <br />
                            {client.targetAudience || (
                              <span className="text-muted">Not provided</span>
                            )}
                          </ListGroup.Item>

                          <ListGroup.Item className="px-0">
                            <strong>Previous Challenges:</strong>
                            <br />
                            {client.previousChallenges || (
                              <span className="text-muted">Not provided</span>
                            )}
                          </ListGroup.Item>

                          <ListGroup.Item className="px-0">
                            <strong>Expectations Summary:</strong>
                            <br />
                            {client.expectations || (
                              <span className="text-muted">Not provided</span>
                            )}
                          </ListGroup.Item>
                        </ListGroup>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Tab.Pane>

          {/* CONTACTS TAB */}
          <Tab.Pane eventKey="contacts">
            <Card className="shadow-sm">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Client Contacts ({contactsList.length})</h5>
                {canManageClients && (
                  <Button variant="success" size="sm" onClick={handleOpenAddContactModal}>
                    <FaPlus className="me-1" /> Add Contact
                  </Button>
                )}
              </Card.Header>
              <Card.Body>
                {contactsList.length > 0 ? (
                  <Table responsive hover className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Designation</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Label</th>
                        <th>Primary</th>
                        {canManageClients && <th className="text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {contactsList.map((contact, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{contact.name}</strong>
                          </td>
                          <td>{contact.designation || "-"}</td>
                          <td>
                            <Badge bg="info">{contact.type}</Badge>
                          </td>
                          <td>{contact.value}</td>
                          <td>{contact.label || "Primary"}</td>
                          <td>
                            {contact.isPrimary && (
                              <Badge bg="success">
                                <FaCheck className="me-1" /> Primary
                              </Badge>
                            )}
                          </td>
                          {canManageClients && (
                            <td className="text-end">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleOpenEditContactModal(contact, idx)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteContact(idx)}
                              >
                                <FaTrash />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <FaUser size={40} className="mb-3 text-secondary" />
                    <p className="mb-1">No contacts added yet.</p>
                    <small>Click "Add Contact" to record key client stakeholders.</small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* PROJECTS TAB */}
          <Tab.Pane eventKey="projects">
            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  Projects ({projectsSummary?.totalCount ?? projects.length})
                </h5>
                {(user?.role === "admin" ||
                  user?.role === "superadmin" ||
                  user?.role === "hr" ||
                  user?.role === "hod") && (
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
                {/* Summary counters */}
                {projectsSummary && (
                  <Row className="g-3 mb-4">
                    <Col md={3}>
                      <Card className="bg-light border-0 text-center py-2">
                        <small className="text-muted">Active</small>
                        <h4 className="text-success mb-0">{projectsSummary.activeCount}</h4>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="bg-light border-0 text-center py-2">
                        <small className="text-muted">On Hold</small>
                        <h4 className="text-warning mb-0">{projectsSummary.onHoldCount}</h4>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="bg-light border-0 text-center py-2">
                        <small className="text-muted">Completed</small>
                        <h4 className="text-primary mb-0">{projectsSummary.completedCount}</h4>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="bg-light border-0 text-center py-2">
                        <small className="text-muted">Pending</small>
                        <h4 className="text-secondary mb-0">{projectsSummary.pendingCount}</h4>
                      </Card>
                    </Col>
                  </Row>
                )}

                {projects.length > 0 ? (
                  <ListGroup variant="flush">
                    {projects.map((project) => (
                      <ListGroup.Item
                        key={project._id}
                        className="d-flex justify-content-between align-items-center px-0 py-3 border-bottom"
                      >
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <h6 className="mb-0">{project.name}</h6>
                            <Badge
                              bg={
                                project.status === "Active"
                                  ? "success"
                                  : project.status === "On Hold"
                                  ? "warning"
                                  : project.status === "Completed"
                                  ? "primary"
                                  : "secondary"
                              }
                            >
                              {project.status || "Pending"}
                            </Badge>
                          </div>
                          <small className="text-muted">
                            {project.description || "No description provided"}
                          </small>
                          <br />
                          <small className="text-muted">
                            {formatDate(project.startDate)} -{" "}
                            {project.endDate ? formatDate(project.endDate) : "Ongoing"}
                          </small>
                        </div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => navigate(`/projects/${project._id}`)}
                        >
                          View Project
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <p className="mb-0">No projects found for this client.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* SERVICES TAB */}
          <Tab.Pane eventKey="services">
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
                        className="d-flex justify-content-between align-items-start px-0 py-3 border-bottom"
                      >
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <Badge
                              bg={
                                subscription.company === "We Alll"
                                  ? "primary"
                                  : "info"
                              }
                            >
                              {subscription.company}
                            </Badge>
                            <Badge
                              bg={
                                subscription.status === "active"
                                  ? "success"
                                  : subscription.status === "pending"
                                  ? "warning"
                                  : "secondary"
                              }
                            >
                              {subscription.status}
                            </Badge>
                          </div>
                          <h6 className="mb-1">
                            {subscription.planSnapshot?.name || "Service Plan"}
                          </h6>
                          <small className="text-muted">
                            Billing: {subscription.billingCycle} | Amount: ₹
                            {subscription.totalAmount?.toLocaleString("en-IN")}
                          </small>
                        </div>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() =>
                            navigate(`/admin/subscriptions/${subscription._id}`)
                          }
                        >
                          View Details
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <p>No active subscriptions found for this client.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* DOCUMENTS TAB */}
          <Tab.Pane eventKey="documents">
            <BusinessDocumentsTab clientId={id} canEdit={canEdit} />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* CONTACT MODAL */}
      <Modal show={showContactModal} onHide={() => setShowContactModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingContactIndex !== null ? "Edit Contact" : "Add Contact"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveContact}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Contact Name *</Form.Label>
              <Form.Control
                type="text"
                required
                value={contactFormData.name}
                onChange={(e) =>
                  setContactFormData({ ...contactFormData, name: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Designation</Form.Label>
              <Form.Control
                type="text"
                value={contactFormData.designation}
                onChange={(e) =>
                  setContactFormData({ ...contactFormData, designation: e.target.value })
                }
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact Type *</Form.Label>
                  <Form.Select
                    value={contactFormData.type}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, type: e.target.value })
                    }
                  >
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Label</Form.Label>
                  <Form.Select
                    value={contactFormData.label}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, label: e.target.value })
                    }
                  >
                    <option value="Primary">Primary</option>
                    <option value="Office">Office</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Contact Value *</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder={
                  contactFormData.type === "Email"
                    ? "name@company.com"
                    : "+919876543210"
                }
                value={contactFormData.value}
                onChange={(e) =>
                  setContactFormData({ ...contactFormData, value: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Set as Primary Contact"
                checked={contactFormData.isPrimary}
                onChange={(e) =>
                  setContactFormData({ ...contactFormData, isPrimary: e.target.checked })
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowContactModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={contactLoading}>
              {contactLoading ? "Saving..." : "Save Contact"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* EDIT CLIENT MODAL */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Client Details</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    required
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    required
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Company</Form.Label>
                  <Form.Control
                    type="text"
                    name="company"
                    value={editFormData.company}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, company: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Expectations</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="expectations"
                    value={editFormData.expectations}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, expectations: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* DEPARTMENT MODAL */}
      <Modal show={showDepartmentModal} onHide={() => setShowDepartmentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Assign Departments</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleDepartmentAssignment}>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Select Operational Departments</Form.Label>
              <Form.Select
                multiple
                value={selectedDepartments}
                onChange={(e) =>
                  setSelectedDepartments(
                    Array.from(e.target.selectedOptions, (option) => option.value)
                  )
                }
              >
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Hold Ctrl (Cmd) to select multiple departments.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDepartmentModal(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={departmentLoading}>
              {departmentLoading ? "Assigning..." : "Save Assignments"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ClientDetails;
