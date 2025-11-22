import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Form,
  Row,
  Col,
  InputGroup,
  Spinner,
  Alert
} from "react-bootstrap";
import {
  FaShieldAlt,
  FaPlus,
  FaEye,
  FaSearch,
  FaEdit,
  FaTrash
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../services/api";

const PolicyManagement = () => {
  const [policies, setPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create', 'view', or 'edit'
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showAll, setShowAll] = useState(false); // Control showing all policies

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "general",
    priority: "medium",
    version: "1.0",
    tags: ""
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    active: 0
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [policies, searchTerm, categoryFilter, priorityFilter]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await api.get("/policies");
      const allPolicies = response.data.policies || response.data;
      
      setPolicies(allPolicies);
      
      // Calculate statistics
      setStats({
        total: allPolicies.length,
        critical: allPolicies.filter(p => p.priority === "critical").length,
        high: allPolicies.filter(p => p.priority === "high").length,
        active: allPolicies.filter(p => p.status === "active").length
      });
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast.error("Failed to fetch policies");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...policies];

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(policy => policy.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter) {
      filtered = filtered.filter(policy => policy.priority === priorityFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(policy =>
        policy.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPolicies(filtered);
  };

  const handleCreatePolicy = () => {
    setModalMode("create");
    setFormData({
      title: "",
      description: "",
      content: "",
      category: "general",
      priority: "medium",
      version: "1.0",
      tags: ""
    });
    setShowModal(true);
  };

  const handleViewPolicy = (policy) => {
    setSelectedPolicy(policy);
    setModalMode("view");
    setShowModal(true);
  };

  const handleEditPolicy = (policy) => {
    setSelectedPolicy(policy);
    setModalMode("edit");
    setFormData({
      title: policy.title,
      description: policy.description,
      content: policy.content,
      category: policy.category,
      priority: policy.priority,
      version: policy.version,
      tags: policy.tags?.join(", ") || ""
    });
    setShowModal(true);
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) {
      return;
    }

    try {
      await api.delete(`/policies/${policyId}`);
      toast.success("Policy deleted successfully");
      fetchPolicies();
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast.error("Failed to delete policy");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setProcessing(true);
      
      const policyData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : []
      };

      if (modalMode === "create") {
        await api.post("/policies", policyData);
        toast.success("Policy created successfully");
      } else if (modalMode === "edit") {
        await api.put(`/policies/${selectedPolicy._id}`, policyData);
        toast.success("Policy updated successfully");
      }
      
      setShowModal(false);
      fetchPolicies();
    } catch (error) {
      console.error("Error saving policy:", error);
      toast.error(error.response?.data?.message || "Failed to save policy");
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      critical: "danger",
      high: "warning",
      medium: "info",
      low: "secondary"
    };
    return <Badge bg={variants[priority] || "secondary"}>{priority}</Badge>;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      hr: "👥",
      it: "💻",
      finance: "💰",
      security: "🔒",
      "health-safety": "🏥",
      "code-of-conduct": "📋",
      leave: "🏖️",
      attendance: "⏰",
      general: "📄",
      other: "📌"
    };
    return icons[category] || "📄";
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading policies...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm mb-4 h-100">
        <Card.Header className="bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaShieldAlt className="me-2 text-primary" />
              Policy Management
            </h5>
            <Button variant="primary" size="sm" onClick={handleCreatePolicy}>
              <FaPlus className="me-2" />
              Create Policy
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Statistics */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border-0 bg-primary bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-primary">{stats.total}</h3>
                  <small className="text-muted">Total Policies</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-danger bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-danger">{stats.critical}</h3>
                  <small className="text-muted">Critical</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-warning bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-warning">{stats.high}</h3>
                  <small className="text-muted">High Priority</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-success bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-success">{stats.active}</h3>
                  <small className="text-muted">Active</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mb-3">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search policies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="hr">HR</option>
                <option value="it">IT</option>
                <option value="finance">Finance</option>
                <option value="security">Security</option>
                <option value="health-safety">Health & Safety</option>
                <option value="code-of-conduct">Code of Conduct</option>
                <option value="leave">Leave</option>
                <option value="attendance">Attendance</option>
                <option value="general">General</option>
                <option value="other">Other</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Form.Select>
            </Col>
          </Row>

          {/* Policies Table */}
          {filteredPolicies.length > 0 ? (
            <>
              <div className="table-responsive" style={{ maxHeight: showAll ? 'none' : '400px', overflowY: 'auto' }}>
                <Table hover>
                  <thead className="bg-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>Policy</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Version</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll ? filteredPolicies : filteredPolicies.slice(0, 5)).map((policy) => (
                    <tr key={policy._id}>
                      <td>
                        <div>
                          <div className="d-flex align-items-center">
                            <span className="me-2 fs-4">{getCategoryIcon(policy.category)}</span>
                            <div>
                              <div className="fw-bold">{policy.title}</div>
                              <small className="text-muted">
                                {policy.description?.substring(0, 60)}
                                {policy.description?.length > 60 ? "..." : ""}
                              </small>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge bg="secondary">{policy.category.replace("-", " ")}</Badge>
                      </td>
                      <td>{getPriorityBadge(policy.priority)}</td>
                      <td>
                        <Badge bg="info">v{policy.version}</Badge>
                      </td>
                      <td>
                        <small>{policy.createdBy?.name || "Admin"}</small>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleViewPolicy(policy)}
                          >
                            <FaEye />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-warning"
                            onClick={() => handleEditPolicy(policy)}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDeletePolicy(policy._id)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {/* Show All / Show Less Button */}
              {filteredPolicies.length > 5 && (
                <div className="text-center mt-3 pt-3 border-top">
                  <Button 
                    variant="link" 
                    className="text-decoration-none"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? (
                      <>
                        <span className="fw-semibold">Show Less</span>
                        <Badge bg="secondary" className="ms-2">{filteredPolicies.length - 5} hidden</Badge>
                      </>
                    ) : (
                      <>
                        <span className="fw-semibold">Show All Policies</span>
                        <Badge bg="primary" className="ms-2">{filteredPolicies.length - 5} more</Badge>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Alert variant="info" className="text-center">
              <FaShieldAlt className="fs-1 mb-3 opacity-25" />
              <p className="mb-0">No policies found</p>
              <small>Create a new policy or adjust your filters</small>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Create/Edit/View Policy Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === "create" && "Create New Policy"}
            {modalMode === "edit" && "Edit Policy"}
            {modalMode === "view" && "Policy Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {modalMode === "view" && selectedPolicy ? (
            <>
              <Row className="mb-3">
                <Col md={12}>
                  <h5>
                    <span className="me-2">{getCategoryIcon(selectedPolicy.category)}</span>
                    {selectedPolicy.title}
                  </h5>
                  <p className="text-muted">{selectedPolicy.description}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <strong>Category:</strong>
                  <p><Badge bg="secondary">{selectedPolicy.category.replace("-", " ")}</Badge></p>
                </Col>
                <Col md={4}>
                  <strong>Priority:</strong>
                  <p>{getPriorityBadge(selectedPolicy.priority)}</p>
                </Col>
                <Col md={4}>
                  <strong>Version:</strong>
                  <p><Badge bg="info">v{selectedPolicy.version}</Badge></p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <strong>Policy Content:</strong>
                  <div className="mt-2 p-3 bg-light rounded" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedPolicy.content}
                  </div>
                </Col>
              </Row>

              {selectedPolicy.tags && selectedPolicy.tags.length > 0 && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Tags:</strong>
                    <div className="mt-2">
                      {selectedPolicy.tags.map((tag, index) => (
                        <Badge key={index} bg="secondary" className="me-2">{tag}</Badge>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}

              <Row>
                <Col md={6}>
                  <strong>Created By:</strong>
                  <p>{selectedPolicy.createdBy?.name || "Admin"}</p>
                </Col>
                <Col md={6}>
                  <strong>Created:</strong>
                  <p><small>{new Date(selectedPolicy.createdAt).toLocaleDateString()}</small></p>
                </Col>
              </Row>
            </>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Policy Title *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter policy title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Brief description of the policy"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Policy Content *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={8}
                  placeholder="Enter the full policy content..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
                <Form.Text className="text-muted">
                  You can use markdown formatting
                </Form.Text>
              </Form.Group>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="general">General</option>
                      <option value="hr">HR</option>
                      <option value="it">IT</option>
                      <option value="finance">Finance</option>
                      <option value="security">Security</option>
                      <option value="health-safety">Health & Safety</option>
                      <option value="code-of-conduct">Code of Conduct</option>
                      <option value="leave">Leave</option>
                      <option value="attendance">Attendance</option>
                      <option value="other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Priority</Form.Label>
                    <Form.Select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Version</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., 1.0"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Tags (comma-separated)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., important, mandatory, new"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={processing}>
            Close
          </Button>
          {modalMode !== "view" && (
            <Button variant="primary" onClick={handleSubmit} disabled={processing}>
              {processing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  {modalMode === "create" ? <FaPlus className="me-2" /> : <FaEdit className="me-2" />}
                  {modalMode === "create" ? "Create Policy" : "Update Policy"}
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PolicyManagement;
