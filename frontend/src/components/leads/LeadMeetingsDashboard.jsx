import { useState, useEffect } from "react";
import { Card, Table, Badge, Button, Modal, Form, Row, Col, Spinner, Alert } from "react-bootstrap";
import { FaPlus, FaEdit, FaCheck, FaTimes, FaVideo, FaMapMarkerAlt, FaCalendar, FaClock, FaUser, FaUsers, FaEye, FaExternalLinkAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import { leadApi } from "../../api/leadApi";
import { formatDate } from "../../utils/helpers";
import { useAuth } from "../../context/AuthContext";
import { checkPageAccess, PAGE_ACCESS } from "../../constants/pageAccess";
import { useNavigate } from "react-router-dom";

const LeadMeetingsDashboard = () => {
  const { canAccess } = useAuth();
  const navigate = useNavigate();
  const isManager = checkPageAccess(canAccess, PAGE_ACCESS.crmLeadManage);
  // Sales employees default to "Mine", managers default to "All"
  const [myOnly, setMyOnly] = useState(!isManager);
  const [meetings, setMeetings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState(null);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [selectedLead, setSelectedLead] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    scheduledDate: "",
    scheduledTime: "",
    duration: 30,
    meetingType: "Online",
    meetingLink: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [myOnly]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const leadsResponse = await leadApi.getAllLeads();
      setLeads(leadsResponse.data || []);

      // Use myMeetings or allMeetings based on toggle
      const meetingsResponse = myOnly
        ? await leadApi.getMyMeetings()
        : await leadApi.getAllMeetings();

      const meetingsData = meetingsResponse.data?.meetings || [];
      setMeetings(meetingsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (meeting = null, leadId = "") => {
    if (meeting) {
      setEditingMeeting(meeting);
      setSelectedLead(meeting.leadId);
      const matchedLead = leads.find(l => l._id === meeting.leadId);
      setLeadSearch(matchedLead ? `${matchedLead.fullName}${matchedLead.companyName ? ` (${matchedLead.companyName})` : ''}` : '');
      setFormData({
        title: meeting.title,
        scheduledDate: meeting.scheduledDate?.split("T")[0] || "",
        scheduledTime: meeting.scheduledTime || "",
        duration: meeting.duration || 30,
        meetingType: meeting.meetingType,
        meetingLink: meeting.meetingLink || "",
        location: meeting.location || "",
        notes: meeting.notes || "",
      });
    } else {
      setEditingMeeting(null);
      setSelectedLead(leadId);
      const matchedLead = leadId ? leads.find(l => l._id === leadId) : null;
      setLeadSearch(matchedLead ? `${matchedLead.fullName}${matchedLead.companyName ? ` (${matchedLead.companyName})` : ''}` : '');
      setFormData({
        title: "",
        scheduledDate: "",
        scheduledTime: "",
        duration: 30,
        meetingType: "Online",
        meetingLink: "",
        location: "",
        notes: "",
      });
    }
    setShowLeadDropdown(false);
    setShowModal(true);
  };

  const handleViewDetails = (meeting) => {
    setViewingMeeting(meeting);
    setShowViewModal(true);
  };

  const getGoogleMapsUrl = (location) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  const handleSubmit = async () => {
    try {
      if (!selectedLead) {
        toast.error("Please select a lead");
        return;
      }

      if (!formData.title || !formData.scheduledDate || !formData.scheduledTime) {
        toast.error("Please fill all required fields");
        return;
      }

      if (formData.meetingType === "Online" && !formData.meetingLink) {
        toast.error("Please provide meeting link for online meetings");
        return;
      }

      if (formData.meetingType === "Offline" && !formData.location) {
        toast.error("Please provide location for offline meetings");
        return;
      }

      if (editingMeeting) {
        await leadApi.updateMeeting(selectedLead, editingMeeting._id, formData);
        toast.success("Meeting updated");
      } else {
        await leadApi.createMeeting(selectedLead, formData);
        toast.success("Meeting scheduled");
      }
      
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Save meeting error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || "Failed to save meeting");
    }
  };

  const handleComplete = async (leadId, meetingId) => {
    try {
      await leadApi.completeMeeting(leadId, meetingId);
      toast.success("Meeting marked as completed");
      fetchData();
    } catch (error) {
      toast.error("Failed to complete meeting");
    }
  };

  const handleCancel = async (leadId, meetingId) => {
    if (!window.confirm("Cancel this meeting?")) return;
    try {
      await leadApi.cancelMeeting(leadId, meetingId);
      toast.success("Meeting cancelled");
      fetchData();
    } catch (error) {
      console.error('Cancel meeting error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || "Failed to cancel meeting");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      Scheduled: "primary",
      Completed: "success",
      Cancelled: "secondary",
      Missed: "danger",
    };
    return <Badge bg={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    return type === "Online" ? (
      <Badge bg="info" className="d-flex align-items-center gap-1">
        <FaVideo size={10} /> Online
      </Badge>
    ) : (
      <Badge bg="success" className="d-flex align-items-center gap-1">
        <FaMapMarkerAlt size={10} /> Offline
      </Badge>
    );
  };

  // Filter meetings
  const filteredMeetings = meetings.filter(meeting => {
    const statusMatch = !filterStatus || meeting.status === filterStatus;
    const typeMatch = !filterType || meeting.meetingType === filterType;
    return statusMatch && typeMatch;
  });

  // Sort meetings by date (upcoming first)
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    // Parse ISO date string properly
    const dateA = new Date(a.scheduledDate);
    const timeA = a.scheduledTime.split(':');
    dateA.setHours(parseInt(timeA[0]), parseInt(timeA[1]), 0, 0);
    
    const dateB = new Date(b.scheduledDate);
    const timeB = b.scheduledTime.split(':');
    dateB.setHours(parseInt(timeB[0]), parseInt(timeB[1]), 0, 0);
    
    return dateA - dateB;
  });

  // Separate upcoming and past meetings
  const now = new Date();
  
  const upcomingMeetings = sortedMeetings.filter(m => {
    const meetingDate = new Date(m.scheduledDate);
    const time = m.scheduledTime.split(':');
    meetingDate.setHours(parseInt(time[0]), parseInt(time[1]), 0, 0);
    
    return meetingDate >= now && m.status === "Scheduled";
  });
  
  const pastMeetings = sortedMeetings.filter(m => {
    const meetingDate = new Date(m.scheduledDate);
    const time = m.scheduledTime.split(':');
    meetingDate.setHours(parseInt(time[0]), parseInt(time[1]), 0, 0);
    
    return meetingDate < now || m.status !== "Scheduled";
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading meetings...</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-1">Lead Meetings Dashboard</h5>
            <small className="text-muted">
              {upcomingMeetings.length} upcoming • {pastMeetings.length} past
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="btn-group btn-group-sm">
              <button
                className={`btn btn-sm ${!myOnly ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setMyOnly(false)}
              >
                <FaUsers size={11} className="me-1" /> All
              </button>
              <button
                className={`btn btn-sm ${myOnly ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setMyOnly(true)}
              >
                <FaUser size={11} className="me-1" /> Mine
              </button>
            </div>
            <Button size="sm" variant="primary" onClick={() => handleOpenModal()}>
              <FaPlus className="me-1" /> Schedule Meeting
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Filters */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small">Filter by Status</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Missed">Missed</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small">Filter by Type</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <>
              <h6 className="mb-3">
                <FaCalendar className="me-2" />
                Upcoming Meetings ({upcomingMeetings.length})
              </h6>
              <div className="table-responsive mb-4">
                <Table hover size="sm">
                  <thead className="table-light">
                    <tr>
                      <th>Lead</th>
                      <th>Meeting</th>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingMeetings.map((meeting) => (
                      <tr key={meeting._id}>
                        <td>
                          <div>
                            <strong 
                              className="text-primary" 
                              style={{ cursor: "pointer" }}
                              onClick={() => navigate(`/leads/${meeting.leadId}`)}
                            >
                              {meeting.leadName}
                            </strong>
                            {meeting.leadCompany && (
                              <small className="d-block text-muted">{meeting.leadCompany}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{meeting.title}</strong>
                            <small className="d-block text-muted">
                              <FaClock size={10} className="me-1" />
                              {meeting.duration} min
                            </small>
                          </div>
                        </td>
                        <td>
                          <div>
                            {formatDate(meeting.scheduledDate)}
                            <small className="d-block">{meeting.scheduledTime}</small>
                          </div>
                        </td>
                        <td>{getTypeBadge(meeting.meetingType)}</td>
                        <td>{getStatusBadge(meeting.status)}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline-info" 
                              onClick={() => handleViewDetails(meeting)}
                              title="View Details"
                            >
                              <FaEye size={10} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline-primary" 
                              onClick={() => handleOpenModal(meeting)}
                              title="Edit"
                            >
                              <FaEdit size={10} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline-success" 
                              onClick={() => handleComplete(meeting.leadId, meeting._id)}
                              title="Mark Complete"
                            >
                              <FaCheck size={10} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline-danger" 
                              onClick={() => handleCancel(meeting.leadId, meeting._id)}
                              title="Cancel"
                            >
                              <FaTimes size={10} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <>
              <h6 className="mb-3">
                <FaCalendar className="me-2" />
                Past Meetings ({pastMeetings.length})
              </h6>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead className="table-light">
                    <tr>
                      <th>Lead</th>
                      <th>Meeting</th>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastMeetings.map((meeting) => (
                      <tr key={meeting._id} className="text-muted">
                        <td>
                          <div>
                            <strong 
                              className="text-primary" 
                              style={{ cursor: "pointer" }}
                              onClick={() => navigate(`/leads/${meeting.leadId}`)}
                            >
                              {meeting.leadName}
                            </strong>
                            {meeting.leadCompany && (
                              <small className="d-block text-muted">{meeting.leadCompany}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{meeting.title}</strong>
                            <small className="d-block text-muted">
                              <FaClock size={10} className="me-1" />
                              {meeting.duration} min
                            </small>
                          </div>
                        </td>
                        <td>
                          <div>
                            {formatDate(meeting.scheduledDate)}
                            <small className="d-block">{meeting.scheduledTime}</small>
                          </div>
                        </td>
                        <td>{getTypeBadge(meeting.meetingType)}</td>
                        <td>{getStatusBadge(meeting.status)}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline-info" 
                              onClick={() => handleViewDetails(meeting)}
                              title="View Details"
                            >
                              <FaEye size={10} />
                            </Button>
                            {meeting.status === "Scheduled" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline-success" 
                                  onClick={() => handleComplete(meeting.leadId, meeting._id)}
                                  title="Mark Complete"
                                >
                                  <FaCheck size={10} />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline-danger" 
                                  onClick={() => handleCancel(meeting.leadId, meeting._id)}
                                  title="Cancel Meeting"
                                >
                                  <FaTimes size={10} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}

          {filteredMeetings.length === 0 && (
            <Alert variant="info" className="text-center">
              <FaCalendar size={24} className="mb-2" />
              <p className="mb-0">No meetings found</p>
              <small>Schedule a meeting to get started</small>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Meeting Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingMeeting ? "Edit" : "Schedule"} Meeting</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Lead *</Form.Label>
              {editingMeeting ? (
                <Form.Control
                  type="text"
                  value={leads.find(l => l._id === selectedLead)
                    ? `${leads.find(l => l._id === selectedLead).fullName}${leads.find(l => l._id === selectedLead).companyName ? ` (${leads.find(l => l._id === selectedLead).companyName})` : ''}`
                    : selectedLead}
                  disabled
                />
              ) : (
                <div style={{ position: 'relative' }}>
                  <Form.Control
                    type="text"
                    placeholder="Search lead by name or company..."
                    value={leadSearch}
                    onChange={(e) => {
                      setLeadSearch(e.target.value);
                      setShowLeadDropdown(true);
                      if (!e.target.value) setSelectedLead("");
                    }}
                    onFocus={() => setShowLeadDropdown(true)}
                    onBlur={() => setTimeout(() => setShowLeadDropdown(false), 200)}
                    autoComplete="off"
                  />
                  {selectedLead && (
                    <span style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)', color: '#28a745', fontSize: '0.8rem'
                    }}>✓</span>
                  )}
                  {showLeadDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#fff', border: '1px solid #ced4da', borderRadius: '0 0 4px 4px',
                      maxHeight: '220px', overflowY: 'auto', zIndex: 9999,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                      {leads
                        .filter(lead => {
                          const q = leadSearch.toLowerCase();
                          return !q ||
                            lead.fullName?.toLowerCase().includes(q) ||
                            lead.companyName?.toLowerCase().includes(q);
                        })
                        .map(lead => (
                          <div
                            key={lead._id}
                            onMouseDown={() => {
                              setSelectedLead(lead._id);
                              setLeadSearch(`${lead.fullName}${lead.companyName ? ` (${lead.companyName})` : ''}`);
                              setShowLeadDropdown(false);
                            }}
                            style={{
                              padding: '8px 12px', cursor: 'pointer',
                              background: selectedLead === lead._id ? '#e8f4fd' : 'transparent',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: '0.9rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                            onMouseLeave={e => e.currentTarget.style.background = selectedLead === lead._id ? '#e8f4fd' : 'transparent'}
                          >
                            <strong>{lead.fullName}</strong>
                            {lead.companyName && <span className="text-muted ms-1">({lead.companyName})</span>}
                          </div>
                        ))}
                      {leads.filter(lead => {
                        const q = leadSearch.toLowerCase();
                        return !q || lead.fullName?.toLowerCase().includes(q) || lead.companyName?.toLowerCase().includes(q);
                      }).length === 0 && (
                        <div style={{ padding: '10px 12px', color: '#6c757d', fontSize: '0.9rem' }}>
                          No leads found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Meeting Title *</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g., Product Demo, Proposal Discussion" 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={formData.scheduledDate} 
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Time *</Form.Label>
                  <Form.Control 
                    type="time" 
                    value={formData.scheduledTime} 
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })} 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Duration (minutes)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={formData.duration} 
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Meeting Type *</Form.Label>
                  <Form.Select 
                    value={formData.meetingType} 
                    onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {formData.meetingType === "Online" && (
              <Form.Group className="mb-3">
                <Form.Label>Meeting Link *</Form.Label>
                <Form.Control 
                  type="url" 
                  placeholder="https://meet.google.com/..." 
                  value={formData.meetingLink} 
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })} 
                />
              </Form.Group>
            )}

            {formData.meetingType === "Offline" && (
              <Form.Group className="mb-3">
                <Form.Label>Location *</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Office address or meeting venue" 
                  value={formData.location} 
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Agenda, topics to discuss..." 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editingMeeting ? "Update" : "Schedule"} Meeting
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Meeting Details Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendar className="me-2" />
            Meeting Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingMeeting && (
            <div>
              {/* Meeting Title & Status */}
              <div className="mb-4">
                <h5 className="mb-2">{viewingMeeting.title}</h5>
                <div className="d-flex gap-2 align-items-center">
                  {getTypeBadge(viewingMeeting.meetingType)}
                  {getStatusBadge(viewingMeeting.status)}
                </div>
              </div>

              {/* Lead Information */}
              <Card className="mb-3 border-0 bg-light">
                <Card.Body>
                  <h6 className="mb-2">
                    <FaUser className="me-2" />
                    Lead Information
                  </h6>
                  <div>
                    <strong 
                      className="text-primary" 
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setShowViewModal(false);
                        navigate(`/leads/${viewingMeeting.leadId}`);
                      }}
                    >
                      {viewingMeeting.leadName}
                    </strong>
                    {viewingMeeting.leadCompany && (
                      <div className="text-muted">{viewingMeeting.leadCompany}</div>
                    )}
                  </div>
                </Card.Body>
              </Card>

              {/* Date & Time */}
              <Row className="mb-3">
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <FaCalendar className="me-2 text-primary" />
                    <div>
                      <small className="text-muted d-block">Date</small>
                      <strong>{formatDate(viewingMeeting.scheduledDate)}</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <FaClock className="me-2 text-primary" />
                    <div>
                      <small className="text-muted d-block">Time & Duration</small>
                      <strong>{viewingMeeting.scheduledTime} ({viewingMeeting.duration} min)</strong>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Online Meeting Link */}
              {viewingMeeting.meetingType === "Online" && viewingMeeting.meetingLink && (
                <Card className="mb-3 border-primary">
                  <Card.Body>
                    <h6 className="mb-3">
                      <FaVideo className="me-2 text-primary" />
                      Online Meeting Link
                    </h6>
                    <div className="d-flex align-items-center gap-2">
                      <Form.Control 
                        type="text" 
                        value={viewingMeeting.meetingLink} 
                        readOnly 
                        className="bg-light"
                      />
                      <Button 
                        variant="primary" 
                        href={viewingMeeting.meetingLink} 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaExternalLinkAlt className="me-1" /> Join
                      </Button>
                    </div>
                    <small className="text-muted d-block mt-2">
                      Click the Join button to open the meeting in a new tab
                    </small>
                  </Card.Body>
                </Card>
              )}

              {/* Offline Meeting Location */}
              {viewingMeeting.meetingType === "Offline" && viewingMeeting.location && (
                <Card className="mb-3 border-success">
                  <Card.Body>
                    <h6 className="mb-3">
                      <FaMapMarkerAlt className="me-2 text-success" />
                      Meeting Location
                    </h6>
                    <div className="mb-3">
                      <Form.Control 
                        as="textarea" 
                        rows={2} 
                        value={viewingMeeting.location} 
                        readOnly 
                        className="bg-light"
                      />
                    </div>
                    <Button 
                      variant="success" 
                      href={getGoogleMapsUrl(viewingMeeting.location)} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100"
                    >
                      <FaMapMarkerAlt className="me-2" />
                      Open in Google Maps
                    </Button>
                    <small className="text-muted d-block mt-2">
                      View the location on Google Maps for directions
                    </small>
                  </Card.Body>
                </Card>
              )}

              {/* Assigned To */}
              {viewingMeeting.assignedTo && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Assigned To</small>
                  <div>
                    <FaUser className="me-2" />
                    <strong>{viewingMeeting.assignedTo.name}</strong>
                    <small className="text-muted ms-2">{viewingMeeting.assignedTo.email}</small>
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingMeeting.notes && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Notes</small>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                        {viewingMeeting.notes}
                      </p>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {/* Created At */}
              {viewingMeeting.createdAt && (
                <div className="text-muted small">
                  Created on {formatDate(viewingMeeting.createdAt)}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          {viewingMeeting && viewingMeeting.status === "Scheduled" && (
            <Button 
              variant="primary" 
              onClick={() => {
                setShowViewModal(false);
                handleOpenModal(viewingMeeting);
              }}
            >
              <FaEdit className="me-1" /> Edit Meeting
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default LeadMeetingsDashboard;
