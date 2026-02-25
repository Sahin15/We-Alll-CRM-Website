import { useState, useEffect } from "react";
import {
  Container,
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Row,
  Col,
  Spinner,
  Alert,
  Form,
  InputGroup
} from "react-bootstrap";
import {
  FaCalendarAlt,
  FaEye,
  FaClock,
  FaVideo,
  FaMapMarkerAlt,
  FaUser,
  FaSearch,
  FaPlus
} from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";

const MyMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Form state for creating meeting
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    meetingLink: "",
    attendees: [],
    type: "team"
  });

  useEffect(() => {
    fetchMyMeetings();
    fetchEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [meetings, searchTerm, statusFilter]);

  const fetchMyMeetings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/meetings/my-meetings");
      setMeetings(response.data);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/users");
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...meetings];

    if (statusFilter) {
      filtered = filtered.filter(meeting => meeting.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(meeting =>
        meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMeetings(filtered);
  };

  const handleCreateMeeting = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      meetingLink: "",
      attendees: [],
      type: "team"
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.attendees.length === 0) {
      toast.error("Please select at least one attendee");
      return;
    }

    try {
      setProcessing(true);
      
      await api.post("/meetings", formData);
      toast.success("Meeting scheduled successfully");
      
      setShowCreateModal(false);
      fetchMyMeetings();
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast.error(error.response?.data?.message || "Failed to schedule meeting");
    } finally {
      setProcessing(false);
    }
  };

  const handleViewMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      scheduled: "primary",
      ongoing: "warning",
      completed: "success",
      cancelled: "danger"
    };
    return <Badge bg={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    const variants = {
      team: "info",
      "one-on-one": "primary",
      client: "success",
      training: "warning",
      other: "secondary"
    };
    const labels = {
      "one-on-one": "1-on-1",
      team: "Team",
      client: "Client",
      training: "Training",
      other: "Other"
    };
    return <Badge bg={variants[type] || "secondary"}>{labels[type] || type}</Badge>;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (time) => {
    if (!time) return "";
    return time;
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading your meetings...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaCalendarAlt className="me-2 text-primary" />
              My Meetings
            </h5>
            <Button variant="primary" size="sm" onClick={handleCreateMeeting}>
              <FaPlus className="me-2" />
              Schedule Meeting
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Filters */}
          <Row className="mb-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search meetings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Col>
          </Row>

          {/* Meetings Table */}
          {filteredMeetings.length > 0 ? (
            <div className="table-responsive">
              <Table hover>
                <thead className="bg-light">
                  <tr>
                    <th>Meeting</th>
                    <th>Organizer</th>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.map((meeting) => (
                    <tr key={meeting._id}>
                      <td>
                        <div>
                          <div className="fw-bold">{meeting.title}</div>
                          <small className="text-muted">
                            {meeting.description?.substring(0, 40)}
                            {meeting.description?.length > 40 ? "..." : ""}
                          </small>
                          {meeting.meetingLink && (
                            <div>
                              <small>
                                <FaVideo className="text-primary me-1" />
                                <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                                  Join Link
                                </a>
                              </small>
                            </div>
                          )}
                          {meeting.location && (
                            <div>
                              <small className="text-muted">
                                <FaMapMarkerAlt className="me-1" />
                                {meeting.location}
                              </small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="text-muted me-2" />
                          <div>
                            <div>{meeting.organizer?.name}</div>
                            <small className="text-muted">{meeting.organizer?.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div>{formatDate(meeting.date)}</div>
                          <small className="text-muted">
                            <FaClock className="me-1" />
                            {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                          </small>
                        </div>
                      </td>
                      <td>{getTypeBadge(meeting.type)}</td>
                      <td>{getStatusBadge(meeting.status)}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleViewMeeting(meeting)}
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info" className="text-center">
              <FaCalendarAlt className="fs-1 mb-3 opacity-25" />
              <p className="mb-0">No meetings found</p>
              <small>Schedule a new meeting to get started</small>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Create Meeting Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Schedule New Meeting</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Meeting Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter meeting title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter meeting description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time *</Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time *</Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Conference Room A"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Meeting Link</Form.Label>
                  <Form.Control
                    type="url"
                    placeholder="e.g., https://zoom.us/j/..."
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Meeting Type</Form.Label>
              <Form.Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="team">Team Meeting</option>
                <option value="one-on-one">1-on-1</option>
                <option value="client">Client Meeting</option>
                <option value="training">Training</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Attendees * (Hold Ctrl/Cmd to select multiple)</Form.Label>
              <Form.Select
                multiple
                value={formData.attendees}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, attendees: selected });
                }}
                style={{ minHeight: "150px" }}
                required
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Selected: {formData.attendees.length} attendee(s)
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={processing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={processing}>
            {processing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Scheduling...
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                Schedule Meeting
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Meeting Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Meeting Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMeeting && (
            <>
              <Row className="mb-3">
                <Col md={12}>
                  <h5>{selectedMeeting.title}</h5>
                  <p className="text-muted">{selectedMeeting.description}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Organizer:</strong>
                  <p>{selectedMeeting.organizer?.name}</p>
                </Col>
                <Col md={6}>
                  <strong>Type:</strong>
                  <p>{getTypeBadge(selectedMeeting.type)}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <strong>Date:</strong>
                  <p>{formatDate(selectedMeeting.date)}</p>
                </Col>
                <Col md={4}>
                  <strong>Start Time:</strong>
                  <p>{formatTime(selectedMeeting.startTime)}</p>
                </Col>
                <Col md={4}>
                  <strong>End Time:</strong>
                  <p>{formatTime(selectedMeeting.endTime)}</p>
                </Col>
              </Row>

              {selectedMeeting.location && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Location:</strong>
                    <p>
                      <FaMapMarkerAlt className="me-2 text-primary" />
                      {selectedMeeting.location}
                    </p>
                  </Col>
                </Row>
              )}

              {selectedMeeting.meetingLink && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Meeting Link:</strong>
                    <p>
                      <FaVideo className="me-2 text-primary" />
                      <a href={selectedMeeting.meetingLink} target="_blank" rel="noopener noreferrer">
                        {selectedMeeting.meetingLink}
                      </a>
                    </p>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col md={12}>
                  <strong>Attendees ({selectedMeeting.attendees?.length}):</strong>
                  <div className="mt-2">
                    {selectedMeeting.attendees?.map((attendee) => (
                      <Badge key={attendee._id} bg="secondary" className="me-2 mb-2">
                        {attendee.name}
                      </Badge>
                    ))}
                  </div>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <strong>Status:</strong>
                  <p>{getStatusBadge(selectedMeeting.status)}</p>
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

export default MyMeetings;
