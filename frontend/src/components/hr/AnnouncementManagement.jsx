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
  FaBullhorn,
  FaPlus,
  FaEye,
  FaSearch,
  FaEdit,
  FaTrash
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../services/api";

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create', 'view', or 'edit'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showAll, setShowAll] = useState(false); // Control showing all announcements

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "general",
    priority: "normal"
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    urgent: 0,
    general: 0,
    event: 0
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [announcements, searchTerm, typeFilter]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get("/announcements");
      const allAnnouncements = response.data;
      
      setAnnouncements(allAnnouncements);
      
      // Calculate statistics
      setStats({
        total: allAnnouncements.length,
        urgent: allAnnouncements.filter(a => a.type === "urgent").length,
        general: allAnnouncements.filter(a => a.type === "general").length,
        event: allAnnouncements.filter(a => a.type === "event").length
      });
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to fetch announcements");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...announcements];

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(announcement => announcement.type === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(announcement =>
        announcement.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.content?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAnnouncements(filtered);
  };

  const handleCreateAnnouncement = () => {
    setModalMode("create");
    setFormData({
      title: "",
      content: "",
      type: "general",
      priority: "normal"
    });
    setShowModal(true);
  };

  const handleViewAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement);
    setModalMode("view");
    setShowModal(true);
  };

  const handleEditAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement);
    setModalMode("edit");
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority || "normal"
    });
    setShowModal(true);
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    try {
      await api.delete(`/announcements/${announcementId}`);
      toast.success("Announcement deleted successfully");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setProcessing(true);

      if (modalMode === "create") {
        await api.post("/announcements", formData);
        toast.success("Announcement created successfully");
      } else if (modalMode === "edit") {
        await api.put(`/announcements/${selectedAnnouncement._id}`, formData);
        toast.success("Announcement updated successfully");
      }
      
      setShowModal(false);
      fetchAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast.error(error.response?.data?.message || "Failed to save announcement");
    } finally {
      setProcessing(false);
    }
  };

  const getTypeBadge = (type) => {
    const variants = {
      general: "primary",
      urgent: "danger",
      event: "success",
      policy: "warning"
    };
    const icons = {
      general: "📢",
      urgent: "⚠️",
      event: "📅",
      policy: "📄"
    };
    return (
      <Badge bg={variants[type] || "secondary"}>
        {icons[type]} {type}
      </Badge>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading announcements...</p>
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
              <FaBullhorn className="me-2 text-primary" />
              Announcement Management
            </h5>
            <Button variant="primary" size="sm" onClick={handleCreateAnnouncement}>
              <FaPlus className="me-2" />
              Create Announcement
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
                  <small className="text-muted">Total</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-danger bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-danger">{stats.urgent}</h3>
                  <small className="text-muted">Urgent</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-success bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-success">{stats.event}</h3>
                  <small className="text-muted">Events</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-info bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-info">{stats.general}</h3>
                  <small className="text-muted">General</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mb-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search announcements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="general">General</option>
                <option value="urgent">Urgent</option>
                <option value="event">Event</option>
                <option value="policy">Policy</option>
              </Form.Select>
            </Col>
          </Row>

          {/* Announcements Table */}
          {filteredAnnouncements.length > 0 ? (
            <>
              <div className="table-responsive" style={{ maxHeight: showAll ? 'none' : '400px', overflowY: 'auto' }}>
                <Table hover>
                  <thead className="bg-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>Announcement</th>
                      <th>Type</th>
                      <th>Created By</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll ? filteredAnnouncements : filteredAnnouncements.slice(0, 5)).map((announcement) => (
                    <tr key={announcement._id}>
                      <td>
                        <div>
                          <div className="fw-bold">{announcement.title}</div>
                          <small className="text-muted">
                            {announcement.content?.substring(0, 80)}
                            {announcement.content?.length > 80 ? "..." : ""}
                          </small>
                        </div>
                      </td>
                      <td>{getTypeBadge(announcement.type)}</td>
                      <td>
                        <small>{announcement.createdBy?.name || "Admin"}</small>
                      </td>
                      <td>
                        <small>{formatDate(announcement.createdAt)}</small>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleViewAnnouncement(announcement)}
                          >
                            <FaEye />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-warning"
                            onClick={() => handleEditAnnouncement(announcement)}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDeleteAnnouncement(announcement._id)}
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
              {filteredAnnouncements.length > 5 && (
                <div className="text-center mt-3 pt-3 border-top">
                  <Button 
                    variant="link" 
                    className="text-decoration-none"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? (
                      <>
                        <span className="fw-semibold">Show Less</span>
                        <Badge bg="secondary" className="ms-2">{filteredAnnouncements.length - 5} hidden</Badge>
                      </>
                    ) : (
                      <>
                        <span className="fw-semibold">Show All Announcements</span>
                        <Badge bg="primary" className="ms-2">{filteredAnnouncements.length - 5} more</Badge>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Alert variant="info" className="text-center">
              <FaBullhorn className="fs-1 mb-3 opacity-25" />
              <p className="mb-0">No announcements found</p>
              <small>Create a new announcement or adjust your filters</small>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Create/Edit/View Announcement Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === "create" && "Create New Announcement"}
            {modalMode === "edit" && "Edit Announcement"}
            {modalMode === "view" && "Announcement Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalMode === "view" && selectedAnnouncement ? (
            <>
              <Row className="mb-3">
                <Col md={12}>
                  <h5>{selectedAnnouncement.title}</h5>
                  <div className="mb-2">{getTypeBadge(selectedAnnouncement.type)}</div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <strong>Content:</strong>
                  <p className="mt-2">{selectedAnnouncement.content}</p>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <strong>Created By:</strong>
                  <p>{selectedAnnouncement.createdBy?.name || "Admin"}</p>
                </Col>
                <Col md={6}>
                  <strong>Created:</strong>
                  <p><small>{formatDate(selectedAnnouncement.createdAt)}</small></p>
                </Col>
              </Row>
            </>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Announcement Title *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter announcement title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Content *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  placeholder="Enter announcement content..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Type</Form.Label>
                    <Form.Select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="general">General</option>
                      <option value="urgent">Urgent</option>
                      <option value="event">Event</option>
                      <option value="policy">Policy</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Priority</Form.Label>
                    <Form.Select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
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
                  {modalMode === "create" ? "Create Announcement" : "Update Announcement"}
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AnnouncementManagement;
