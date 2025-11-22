import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Form, InputGroup, Modal } from "react-bootstrap";
import { FaSearch, FaFileAlt, FaShieldAlt, FaFilter } from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";

const Policies = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  useEffect(() => {
    fetchPolicies();
  }, [selectedCategory, selectedPriority]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      let url = "/policies?limit=50";
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (selectedPriority) url += `&priority=${selectedPriority}`;
      
      const response = await api.get(url);
      setPolicies(response.data.policies || response.data);
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPolicy = async (policyId) => {
    try {
      const response = await api.get(`/policies/${policyId}`);
      setSelectedPolicy(response.data);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching policy details:", error);
      toast.error("Failed to load policy details");
    }
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

  const getPriorityColor = (priority) => {
    const colors = {
      critical: "danger",
      high: "warning",
      medium: "info",
      low: "secondary"
    };
    return colors[priority] || "secondary";
  };

  const filteredPolicies = policies.filter(policy =>
    policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <FaShieldAlt className="me-2 text-primary" />
                Company Policies
              </h2>
              <p className="text-muted">Stay informed about company policies and guidelines</p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
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
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Policies List */}
      <Row>
        {filteredPolicies.length > 0 ? (
          filteredPolicies.map((policy) => (
            <Col md={6} lg={4} key={policy._id} className="mb-4">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="fs-2">{getCategoryIcon(policy.category)}</div>
                    {policy.priority !== "low" && (
                      <Badge bg={getPriorityColor(policy.priority)}>
                        {policy.priority}
                      </Badge>
                    )}
                  </div>
                  
                  <h5 className="mb-2">{policy.title}</h5>
                  <p className="text-muted small mb-3">
                    {policy.description.length > 100
                      ? `${policy.description.substring(0, 100)}...`
                      : policy.description}
                  </p>
                  
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <small className="text-muted">
                      <strong>Category:</strong> {policy.category.replace("-", " ")}
                    </small>
                    <small className="text-muted">
                      v{policy.version || "1.0"}
                    </small>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <strong>Effective:</strong>{" "}
                      {new Date(policy.effectiveDate).toLocaleDateString()}
                    </small>
                    {policy.expiryDate && (
                      <small className="text-muted d-block">
                        <strong>Expires:</strong>{" "}
                        {new Date(policy.expiryDate).toLocaleDateString()}
                      </small>
                    )}
                  </div>
                  
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-100"
                    onClick={() => handleViewPolicy(policy._id)}
                  >
                    <FaFileAlt className="me-2" />
                    View Policy
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5">
                <FaFileAlt className="fs-1 mb-3 opacity-25" />
                <h5>No policies found</h5>
                <p className="text-muted">
                  {searchTerm || selectedCategory || selectedPriority
                    ? "Try adjusting your filters"
                    : "No policies available at the moment"}
                </p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Policy Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedPolicy && (
              <>
                <span className="me-2">{getCategoryIcon(selectedPolicy.category)}</span>
                {selectedPolicy.title}
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPolicy && (
            <>
              <div className="mb-3">
                <Badge bg={getPriorityColor(selectedPolicy.priority)} className="me-2">
                  {selectedPolicy.priority}
                </Badge>
                <Badge bg="secondary">{selectedPolicy.category.replace("-", " ")}</Badge>
                <Badge bg="info" className="ms-2">v{selectedPolicy.version || "1.0"}</Badge>
              </div>
              
              <div className="mb-3">
                <h6>Description</h6>
                <p className="text-muted">{selectedPolicy.description}</p>
              </div>
              
              <div className="mb-3">
                <h6>Policy Content</h6>
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {selectedPolicy.content}
                </div>
              </div>
              
              <hr />
              
              <Row>
                <Col md={6}>
                  <small className="text-muted d-block">
                    <strong>Effective Date:</strong>{" "}
                    {new Date(selectedPolicy.effectiveDate).toLocaleDateString()}
                  </small>
                  {selectedPolicy.expiryDate && (
                    <small className="text-muted d-block">
                      <strong>Expiry Date:</strong>{" "}
                      {new Date(selectedPolicy.expiryDate).toLocaleDateString()}
                    </small>
                  )}
                </Col>
                <Col md={6}>
                  <small className="text-muted d-block">
                    <strong>Created By:</strong> {selectedPolicy.createdBy?.name || "Admin"}
                  </small>
                  <small className="text-muted d-block">
                    <strong>Last Updated:</strong>{" "}
                    {new Date(selectedPolicy.updatedAt).toLocaleDateString()}
                  </small>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Policies;
