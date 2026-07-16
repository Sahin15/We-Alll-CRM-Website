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
  FaCalendarAlt,
  FaPlus,
  FaEye,
  FaSearch,
  FaUser,
  FaClock,
  FaVideo,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaUserPlus
} from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";
import meetingApi from "../../api/meetingApi";
import { useAuth } from "../../context/AuthContext";
import AttendeeSearchPicker from "../common/AttendeeSearchPicker";
import "./MeetingManagement.css";

const MeetingManagement = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'view'
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [confirmMeeting, setConfirmMeeting] = useState(null); // meeting to confirm complete
  const [showAddAttendeesModal, setShowAddAttendeesModal] = useState(false);
  const [addAttendeesMeeting, setAddAttendeesMeeting] = useState(null);
  const [addAttendeesSelection, setAddAttendeesSelection] = useState([]);

  // Form state
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

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    scheduled: 0,
    ongoing: 0,
    completed: 0,
    total: 0
  });

  // Show all state
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchMeetings();
    fetchEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [meetings, searchTerm, statusFilter, typeFilter, dateFilter]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      // Fetch all company meetings
      const response = await api.get("/meetings");
      const allMeetings = response.data;
      
      setMeetings(allMeetings);
      setFilteredMeetings(allMeetings);
      
      // Calculate statistics
      setStats({
        scheduled: allMeetings.filter(m => m.status === "scheduled").length,
        ongoing: allMeetings.filter(m => m.status === "ongoing").length,
        completed: allMeetings.filter(m => m.status === "completed").length,
        total: allMeetings.length
      });
    } catch (error) {
      console.error("Error fetching meetings:", error);
      if (error.response?.status === 403) {
        console.error("403 Forbidden - User role may not have permission");
        toast.error("You don't have permission to view meetings");
      } else if (error.response?.status === 404) {
        toast.error("Meetings endpoint not found");
      } else {
        toast.error("Failed to fetch meetings");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/users", { params: { status: 'active', limit: 1000 } });
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...meetings];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(meeting => meeting.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(meeting => meeting.type === typeFilter);
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(meeting => {
        const meetingDate = new Date(meeting.date).toDateString();
        const filterDate = new Date(dateFilter).toDateString();
        return meetingDate === filterDate;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(meeting =>
        meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.organizer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMeetings(filtered);
  };

  const handleCreateMeeting = () => {
    setModalMode("create");
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
    setShowModal(true);
  };

  const handleViewMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setModalMode("view");
    setShowModal(true);
  };

  const handleCompleteMeeting = (meeting) => {
    setConfirmMeeting(meeting);
  };

  const confirmComplete = async () => {
    if (!confirmMeeting) return;
    setProcessing(true);
    try {
      await api.patch(`/meetings/${confirmMeeting._id}/complete`);
      toast.success("Meeting marked as completed");
      setConfirmMeeting(null);
      setShowModal(false);
      fetchMeetings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete meeting");
    } finally {
      setProcessing(false);
    }
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
      
      setShowModal(false);
      fetchMeetings();
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast.error(error.response?.data?.message || "Failed to schedule meeting");
    } finally {
      setProcessing(false);
    }
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

  const getOrganizerId = (meeting) =>
    String(meeting?.organizer?._id || meeting?.organizer || "");

  const canEditMeetingAttendees = (meeting) => {
    if (!meeting || !user) return false;
    if (!["scheduled", "ongoing"].includes(meeting.status)) return false;

    if (["admin", "superadmin", "hr", "manager"].includes(user.role)) {
      return true;
    }

    return getOrganizerId(meeting) === String(user._id);
  };

  const getExistingAttendeeIds = (meeting) => {
    const ids = new Set();
    const organizerId = getOrganizerId(meeting);
    if (organizerId) ids.add(organizerId);

    (meeting?.attendees || []).forEach((attendee) => {
      const attendeeId = String(attendee?._id || attendee || "");
      if (attendeeId) ids.add(attendeeId);
    });

    return ids;
  };

  const getAvailableAttendeeOptions = (meeting) => {
    const existingIds = getExistingAttendeeIds(meeting);
    return employees.filter((employee) => !existingIds.has(String(employee._id)));
  };

  const handleOpenAddAttendees = (meeting) => {
    setAddAttendeesMeeting(meeting);
    setAddAttendeesSelection([]);
    setShowAddAttendeesModal(true);
  };

  const handleAddAttendeesSubmit = async () => {
    if (!addAttendeesMeeting?._id) return;

    if (addAttendeesSelection.length === 0) {
      toast.error("Please select at least one person to add");
      return;
    }

    try {
      setProcessing(true);
      const response = await meetingApi.addMeetingAttendees(
        addAttendeesMeeting._id,
        addAttendeesSelection
      );

      toast.success(response.data?.message || "Attendees added successfully");

      const updatedMeeting = response.data?.meeting;
      const meetingId = addAttendeesMeeting._id;

      setShowAddAttendeesModal(false);
      setAddAttendeesMeeting(null);
      setAddAttendeesSelection([]);

      if (showModal && selectedMeeting?._id === meetingId && updatedMeeting) {
        setSelectedMeeting(updatedMeeting);
      }

      fetchMeetings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add attendees");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading meetings...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3 position-relative meeting-management-header">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 flex-grow-1">
              <FaCalendarAlt className="me-2 text-primary" />
              Meeting Management
            </h5>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleCreateMeeting}
            className="meeting-management-button"
          >
            <FaPlus className="me-2" />
            Schedule Meeting
          </Button>
        </Card.Header>
        <Card.Body>
          {/* Statistics */}
          <Row className="mb-4">
            <Col xs={6} md={3} className="mb-3">
              <Card className="border-0 bg-primary bg-opacity-10 meeting-stats-card">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-primary">{stats.scheduled}</h3>
                  <small className="text-muted">Scheduled</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3} className="mb-3">
              <Card className="border-0 bg-warning bg-opacity-10 meeting-stats-card">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-warning">{stats.ongoing}</h3>
                  <small className="text-muted">Ongoing</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3} className="mb-3">
              <Card className="border-0 bg-success bg-opacity-10 meeting-stats-card">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-success">{stats.completed}</h3>
                  <small className="text-muted">Completed</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3} className="mb-3">
              <Card className="border-0 bg-info bg-opacity-10 meeting-stats-card">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-info">{stats.total}</h3>
                  <small className="text-muted">Total Meetings</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mb-3 meeting-filters">
            <Col xs={12} md={4} className="mb-2 mb-md-0">
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
            <Col xs={12} sm={6} md={3} className="mb-2 mb-md-0">
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
            <Col xs={12} sm={6} md={2} className="mb-2 mb-md-0">
              <Form.Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="team">Team</option>
                <option value="one-on-one">1-on-1</option>
                <option value="client">Client</option>
                <option value="training">Training</option>
                <option value="other">Other</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={3} className="mb-2 mb-md-0">
              <Form.Control
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </Col>
          </Row>

          {/* Meetings Table */}
          {filteredMeetings.length > 0 ? (
            <div className="table-responsive meeting-table-responsive" style={{ maxHeight: showAll ? 'none' : '350px', overflowY: 'auto' }}>
              <Table hover>
                <thead className="bg-light">
                  <tr>
                    <th>Meeting</th>
                    <th className="hide-on-mobile organizer-column">Organizer</th>
                    <th>Date & Time</th>
                    <th className="hide-on-mobile">Attendees</th>
                    <th className="hide-on-mobile">Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.map((meeting) => (
                    <tr key={meeting._id}>
                      <td className="meeting-title-cell">
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
                                  Join
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
                      <td className="hide-on-mobile organizer-column">
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
                      <td className="hide-on-mobile">
                        <Badge bg="secondary">{meeting.attendees?.length || 0} people</Badge>
                      </td>
                      <td className="hide-on-mobile">{getTypeBadge(meeting.type)}</td>
                      <td>{getStatusBadge(meeting.status)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleViewMeeting(meeting)}
                            title="View meeting details"
                          >
                            <FaEye />
                          </Button>
                          {canEditMeetingAttendees(meeting) && (
                            <Button
                              size="sm"
                              variant="outline-info"
                              onClick={() => handleOpenAddAttendees(meeting)}
                              disabled={processing}
                              title="Add attendees"
                            >
                              <FaUserPlus />
                            </Button>
                          )}
                          {/* Mark as Done — only organizer, only when scheduled */}
                          {meeting.status === "scheduled" &&
                            getOrganizerId(meeting) === String(user?._id) && (
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => handleCompleteMeeting(meeting)}
                              disabled={processing}
                              title="Mark meeting as completed"
                            >
                              <FaCheckCircle />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}

          {/* Show All / Show Less Button */}
          {filteredMeetings.length > 5 && (
            <div className="text-center mt-3 pt-3 border-top meeting-show-all-button">
              <Button 
                variant="link" 
                className="text-decoration-none"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <span className="fw-semibold">Show Less</span>
                    <Badge bg="secondary" className="ms-2">{filteredMeetings.length - 5} hidden</Badge>
                  </>
                ) : (
                  <>
                    <span className="fw-semibold">Show All Meetings</span>
                    <Badge bg="primary" className="ms-2">{filteredMeetings.length - 5} more</Badge>
                  </>
                )}
              </Button>
            </div>
          )}

          {filteredMeetings.length === 0 && (
            <Alert variant="info" className="text-center meeting-empty-state">
              <FaCalendarAlt className="fs-1 mb-3 opacity-25" />
              <p className="mb-0">No meetings found</p>
              <small>Schedule a new meeting or adjust your filters</small>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Create/View Meeting Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton style={{
          background: modalMode === 'view' ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : '#fff',
          color: modalMode === 'view' ? '#fff' : 'inherit',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          padding: '16px 24px',
        }}>
          <Modal.Title style={{ fontWeight: '700', fontSize: '1rem' }}>
            {modalMode === "create" ? "Schedule New Meeting" : "Meeting Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '20px 24px' }}>
          {modalMode === "create" ? (
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

              <AttendeeSearchPicker
                employees={employees}
                selectedIds={formData.attendees}
                onChange={(attendees) => setFormData({ ...formData, attendees })}
                label="Attendees"
                required
              />
            </Form>
          ) : (
            selectedMeeting && (
              <>
                {/* Header banner */}
                <div style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  marginBottom: '20px',
                  color: '#fff',
                }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontWeight: '700', margin: '0 0 6px', fontSize: '1.1rem' }}>
                        {selectedMeeting.title}
                      </h5>
                      {selectedMeeting.description && (
                        <p style={{ margin: 0, opacity: 0.85, fontSize: '0.85rem', lineHeight: '1.5' }}>
                          {selectedMeeting.description}
                        </p>
                      )}
                    </div>
                    <div className="ms-3 flex-shrink-0">
                      {getStatusBadge(selectedMeeting.status)}
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <Row className="g-3 mb-3">
                  {/* Organizer */}
                  <Col md={6}>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        <FaUser className="me-1" /> Organizer
                      </div>
                      <div style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.95rem' }}>
                        {selectedMeeting.organizer?.name}
                      </div>
                      {selectedMeeting.organizer?.email && (
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                          {selectedMeeting.organizer.email}
                        </div>
                      )}
                    </div>
                  </Col>

                  {/* Type */}
                  <Col md={6}>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        Meeting Type
                      </div>
                      <div>{getTypeBadge(selectedMeeting.type)}</div>
                    </div>
                  </Col>

                  {/* Date */}
                  <Col md={4}>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        <FaCalendarAlt className="me-1" /> Date
                      </div>
                      <div style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.95rem' }}>
                        {formatDate(selectedMeeting.date)}
                      </div>
                    </div>
                  </Col>

                  {/* Start Time */}
                  <Col md={4}>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        <FaClock className="me-1" /> Start Time
                      </div>
                      <div style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.95rem' }}>
                        {formatTime(selectedMeeting.startTime)}
                      </div>
                    </div>
                  </Col>

                  {/* End Time */}
                  <Col md={4}>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        <FaClock className="me-1" /> End Time
                      </div>
                      <div style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.95rem' }}>
                        {formatTime(selectedMeeting.endTime)}
                      </div>
                    </div>
                  </Col>

                  {/* Location */}
                  {selectedMeeting.location && (
                    <Col md={selectedMeeting.meetingLink ? 6 : 12}>
                      <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E2E8F0', height: '100%' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                          <FaMapMarkerAlt className="me-1" /> Location
                        </div>
                        <div style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.95rem' }}>
                          {selectedMeeting.location}
                        </div>
                      </div>
                    </Col>
                  )}

                  {/* Meeting Link */}
                  {selectedMeeting.meetingLink && (
                    <Col md={selectedMeeting.location ? 6 : 12}>
                      <div style={{ background: '#EFF6FF', borderRadius: '10px', padding: '14px 16px', border: '1px solid #BFDBFE', height: '100%' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                          <FaVideo className="me-1" /> Meeting Link
                        </div>
                        <a
                          href={selectedMeeting.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: '600', color: '#2563EB', fontSize: '0.88rem', wordBreak: 'break-all', textDecoration: 'none' }}
                        >
                          🔗 Join Meeting
                        </a>
                      </div>
                    </Col>
                  )}
                </Row>

                {/* Attendees */}
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Attendees ({selectedMeeting.attendees?.length || 0})
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedMeeting.attendees?.length > 0 ? (
                      selectedMeeting.attendees.map((attendee) => (
                        <div key={attendee._id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          background: '#fff', border: '1px solid #E2E8F0', borderRadius: '20px',
                          padding: '4px 12px', fontSize: '0.82rem', fontWeight: '500', color: '#374151',
                        }}>
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '0.65rem', fontWeight: '700', flexShrink: 0,
                          }}>
                            {attendee.name?.charAt(0).toUpperCase()}
                          </div>
                          {attendee.name}
                        </div>
                      ))
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>No attendees</span>
                    )}
                  </div>

                  {canEditMeetingAttendees(selectedMeeting) && (
                    <div className="mt-3 pt-3 border-top">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleOpenAddAttendees(selectedMeeting)}
                        disabled={processing}
                      >
                        <FaUserPlus className="me-2" />
                        Add Attendees
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={processing}>
            Close
          </Button>
          {/* Mark as Done button in view modal — organizer only, scheduled only */}
          {modalMode === "view" &&
            selectedMeeting?.status === "scheduled" &&
            getOrganizerId(selectedMeeting) === String(user?._id) && (
            <Button
              variant="success"
              onClick={() => handleCompleteMeeting(selectedMeeting)}
              disabled={processing}
            >
              <FaCheckCircle className="me-2" />
              Mark as Completed
            </Button>
          )}
          {modalMode === "create" && (
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
          )}
        </Modal.Footer>
      </Modal>

      {/* Add Attendees Modal */}
      <Modal
        show={showAddAttendeesModal}
        onHide={() => {
          setShowAddAttendeesModal(false);
          setAddAttendeesMeeting(null);
          setAddAttendeesSelection([]);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Attendees</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {addAttendeesMeeting && (
            <>
              <p className="text-muted mb-3">
                Add people to <strong>{addAttendeesMeeting.title}</strong>
              </p>
              <AttendeeSearchPicker
                employees={employees}
                selectedIds={addAttendeesSelection}
                onChange={setAddAttendeesSelection}
                excludeIds={Array.from(getExistingAttendeeIds(addAttendeesMeeting))}
                label="Select employees"
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAddAttendeesModal(false);
              setAddAttendeesMeeting(null);
              setAddAttendeesSelection([]);
            }}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddAttendeesSubmit}
            disabled={
              processing ||
              addAttendeesSelection.length === 0 ||
              !addAttendeesMeeting ||
              getAvailableAttendeeOptions(addAttendeesMeeting).length === 0
            }
          >
            {processing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Adding...
              </>
            ) : (
              <>
                <FaUserPlus className="me-2" />
                Add to Meeting
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Mark as Completed — Confirmation Modal */}
      <Modal show={!!confirmMeeting} onHide={() => setConfirmMeeting(null)} centered size="sm">
        <Modal.Body style={{ padding: '32px 28px', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
          }}>
            <FaCheckCircle size={28} color="#fff" />
          </div>

          <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '8px', fontSize: '1.05rem' }}>
            Mark as Completed?
          </h6>
          <p style={{ color: '#6B7280', fontSize: '0.88rem', margin: '0 0 24px', lineHeight: '1.5' }}>
            <strong style={{ color: '#374151' }}>"{confirmMeeting?.title}"</strong>
            <br />
            This will mark the meeting as done and cannot be undone.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setConfirmMeeting(null)}
              disabled={processing}
              style={{
                flex: 1, padding: '11px', borderRadius: '10px',
                border: '1.5px solid #E5E7EB', background: '#fff',
                color: '#374151', fontWeight: '600', cursor: 'pointer',
                fontSize: '0.9rem', transition: 'all 0.2s',
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmComplete}
              disabled={processing}
              style={{
                flex: 1, padding: '11px', borderRadius: '10px',
                border: 'none',
                background: processing ? '#6EE7B7' : 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', fontWeight: '700', cursor: processing ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem', transition: 'all 0.2s',
                boxShadow: processing ? 'none' : '0 4px 12px rgba(16,185,129,0.35)',
              }}
            >
              {processing ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Spinner animation="border" size="sm" />
                  Saving...
                </span>
              ) : (
                '✓ Mark Done'
              )}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default MeetingManagement;
