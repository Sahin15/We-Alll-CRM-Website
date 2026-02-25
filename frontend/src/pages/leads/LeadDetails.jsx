import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  ListGroup,
  Form,
  Dropdown,
  Modal,
  Table,
  ProgressBar,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaUser,
  FaPhoneAlt,
  FaEnvelopeOpen,
  FaCalendarAlt,
  FaBell,
  FaCheck,
  FaTimes,
  FaHistory,
  FaChartLine,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { leadApi } from "../../api/leadApi";
import emailService from "../../services/emailService";
import { formatDate } from "../../utils/helpers";
import ContactsTab from "../../components/leads/ContactsTab";
import HistoryTab from "../../components/leads/HistoryTab";

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [emailHistory, setEmailHistory] = useState([]);
  const [emailStats, setEmailStats] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    type: "Call",
    scheduledDate: "",
    notes: "",
  });
  const [tempDate, setTempDate] = useState("");
  const [tempTime, setTempTime] = useState("");
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    fetchLeadDetails();
    fetchEmailHistory();
  }, [id]);

  const fetchEmailHistory = async () => {
    try {
      setEmailLoading(true);
      const response = await emailService.getLeadEmailHistory(id);
      if (response.success) {
        setEmailHistory(response.data.campaigns);
        setEmailStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching email history:', error);
    } finally {
      setEmailLoading(false);
    }
  };

  const fetchLeadDetails = async () => {
    try {
      const response = await leadApi.getLeadById(id);
      setLead(response.data);
    } catch (error) {
      toast.error("Failed to fetch lead details");
    } finally {
      setLoading(false);
    }
  };

  // Check if current user can edit this lead
  const canEditLead = () => {
    if (!user || !lead) return false;
    
    // Admin, superadmin, and manager can edit any lead
    if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'manager') {
      return true;
    }
    
    // Sales department employees can edit any lead
    if (user.department && user.department.name === 'Sales') {
      return true;
    }
    
    // User can edit if they are assigned to the lead
    if (lead.assignedTo && lead.assignedTo._id === user.id) {
      return true;
    }
    
    // User can edit if they created the lead
    if (lead.createdBy && lead.createdBy._id === user.id) {
      return true;
    }
    
    return false;
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "New":
        return "secondary";
      case "Contacted":
        return "info";
      case "Qualified":
        return "primary";
      case "Proposal Sent":
        return "warning";
      case "Negotiation":
        return "dark";
      case "Won":
        return "success";
      case "Lost":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getSourceVariant = (source) => {
    switch (source) {
      case "Website":
        return "primary";
      case "Seminar":
        return "info";
      case "Vyapaar Expo":
        return "warning"; // Orange/yellow for Vyapaar Expo
      case "Referral":
        return "success";
      case "Social Media":
        return "info";
      case "Advertisement":
        return "warning";
      case "Cold Call":
        return "danger";
      case "Kaustav Mukherjee":
        return "success"; // Green for personal referral
      case "Rahul Shaw":
        return "info"; // Blue for personal referral
      case "Other":
        return "dark";
      default:
        return "secondary"; // Gray for unknown sources
    }
  };

  const handleNotesChange = (value) => {
    setNotes(value);
  };

  const handleSaveNotes = async () => {
    try {
      if (!notes.trim()) {
        toast.error("Please enter a note");
        return;
      }
      await leadApi.updateLead(id, { notes });
      toast.success("Notes saved successfully");
      setNotes(""); 
      fetchLeadDetails();
    } catch (error) {
      console.error("Error saving notes:", error);
      const errorMessage = error.response?.data?.message || "Failed to save notes";
      toast.error(errorMessage);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await leadApi.updateLeadStatus(id, newStatus);
      toast.success(`Lead status updated to ${newStatus}`);
      fetchLeadDetails();
    } catch (error) {
      toast.error("Failed to update lead status");
    }
  };

  const handleTemperatureChange = async (temperature) => {
    try {
      await leadApi.updateLeadTemperature(id, temperature);
      toast.success(`Lead marked as ${temperature} and Qualified`);
      fetchLeadDetails();
    } catch (error) {
      console.error("Temperature update error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update lead temperature";
      toast.error(errorMessage);
    }
  };

  const handleOpenDateTimePicker = () => {
    // Initialize with current values or defaults
    const now = new Date();
    const currentDate = followUpData.scheduledDate
      ? followUpData.scheduledDate.split("T")[0]
      : now.toISOString().split("T")[0];
    const currentTime = followUpData.scheduledDate
      ? followUpData.scheduledDate.split("T")[1]?.substring(0, 5)
      : now.toTimeString().substring(0, 5);

    setTempDate(currentDate);
    setTempTime(currentTime);
    setShowDateTimePicker(true);
  };

  const handleConfirmDateTime = () => {
    if (!tempDate || !tempTime) {
      toast.error("Please select both date and time");
      return;
    }
    const dateTimeString = `${tempDate}T${tempTime}`;
    setFollowUpData({ ...followUpData, scheduledDate: dateTimeString });
    setShowDateTimePicker(false);
  };

  const handleCancelDateTime = () => {
    setShowDateTimePicker(false);
    setTempDate("");
    setTempTime("");
  };

  const handleScheduleFollowUp = async () => {
    try {
      if (!followUpData.scheduledDate) {
        toast.error("Please select a date and time");
        return;
      }
      await leadApi.scheduleFollowUp(id, followUpData);
      toast.success("Follow-up scheduled successfully");
      setShowFollowUpModal(false);
      setFollowUpData({ type: "Call", scheduledDate: "", notes: "" });
      setTempDate("");
      setTempTime("");
      fetchLeadDetails();
    } catch (error) {
      toast.error("Failed to schedule follow-up");
    }
  };

  const handleCompleteFollowUp = async (followUpId) => {
    try {
      await leadApi.completeFollowUp(id, followUpId);
      toast.success("Follow-up marked as completed");
      fetchLeadDetails();
    } catch (error) {
      toast.error("Failed to complete follow-up");
    }
  };

  const handleCancelFollowUp = async (followUpId) => {
    try {
      await leadApi.cancelFollowUp(id, followUpId);
      toast.success("Follow-up cancelled");
      fetchLeadDetails();
    } catch (error) {
      toast.error("Failed to cancel follow-up");
    }
  };

  const handleDeleteNote = async (noteItem) => {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }
    try {
      // Use the note's _id directly
      await leadApi.deleteNote(id, noteItem._id);
      toast.success("Note deleted successfully");
      fetchLeadDetails();
    } catch (error) {
      console.error("Error deleting note:", error);
      const errorMessage = error.response?.data?.message || "Failed to delete note";
      toast.error(errorMessage);
    }
  };

  const handleAddRemark = async () => {
    try {
      if (!remarks.trim()) {
        toast.error("Please enter a remark");
        return;
      }
      
      console.log('📝 Adding remark:', remarks);
      
      // Add remark to lead history (not notes)
      // This will be handled by the backend addHistory method
      const response = await leadApi.updateLead(id, { 
        addRemark: remarks // Special flag to add to history instead of notes
      });
      
      console.log('✅ Response received:', response.data);
      console.log('📊 History count in response:', response.data.lead?.history?.length);
      
      toast.success("Remark added to lead history");
      setRemarks("");
      fetchLeadDetails();
    } catch (error) {
      console.error('❌ Error adding remark:', error);
      toast.error("Failed to add remark");
    }
  };

  const getTemperatureColor = (temp) => {
    switch (temp) {
      case "Hot":
        return "danger";
      case "Warm":
        return "warning";
      case "Cold":
        return "info";
      default:
        return "secondary";
    }
  };

  const getTemperatureIcon = (temp) => {
    switch (temp) {
      case "Hot":
        return "🔴";
      case "Warm":
        return "🟡";
      case "Cold":
        return "🔵";
      default:
        return "";
    }
  };

  const getEmailStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <FaCheck className="text-success" />;
      case 'failed':
        return <FaTimes className="text-danger" />;
      case 'bounced':
        return <FaExclamationTriangle className="text-warning" />;
      case 'pending':
        return <FaClock className="text-info" />;
      default:
        return <FaClock className="text-muted" />;
    }
  };

  const getEmailStatusVariant = (status) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'failed':
        return 'danger';
      case 'bounced':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getTemplateColor = (template) => {
    switch (template) {
      case 'vyapaar-expo':
        return 'primary';
      case 'vyapaar-expo-2':
        return 'success';
      case 'general-followup':
        return 'info';
      case 'service-inquiry':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getFollowUpIcon = (followUpType) => {
    switch (followUpType) {
      case "Call":
        return <FaPhoneAlt className="me-1" />;
      case "Email":
        return <FaEnvelopeOpen className="me-1" />;
      case "Meeting":
        return <FaCalendarAlt className="me-1" />;
      case "Reminder":
        return <FaBell className="me-1" />;
      default:
        return null;
    }
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

  if (!lead) {
    return (
      <Container fluid>
        <Card>
          <Card.Body className="text-center py-5">
            <h4>Lead not found</h4>
            <Button variant="primary" onClick={() => navigate("/leads")}>
              Back to Leads
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
            onClick={() => navigate("/leads")}
            className="mb-3"
          >
            <FaArrowLeft className="me-2" />
            Back to Leads
          </Button>
          <h2>Lead Details</h2>
        </Col>
        <Col className="text-end">
          <Button
            variant="primary"
            onClick={() => navigate(`/leads/${id}/edit`)}
            disabled={!canEditLead()}
            title={canEditLead() ? "Edit Lead" : "You don't have permission to edit this lead"}
          >
            <FaEdit className="me-2" />
            Edit Lead
          </Button>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Lead Information</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h4 className="mb-1">{lead.fullName}</h4>
                <div className="d-flex gap-2 mb-2 flex-wrap">
                  <Badge bg={getStatusVariant(lead.status)}>
                    {lead.status}
                  </Badge>
                  <Badge bg={getSourceVariant(lead.source)}>
                    {lead.source}
                  </Badge>
                  {lead.temperature && (
                    <Badge bg={getTemperatureColor(lead.temperature)}>
                      {getTemperatureIcon(lead.temperature)} {lead.temperature}
                    </Badge>
                  )}
                </div>
                {lead.companyName && (
                  <p className="text-muted mb-0">{lead.companyName}</p>
                )}
              </div>

              <ListGroup variant="flush">
                <ListGroup.Item className="px-0">
                  <FaEnvelope className="me-2 text-primary" />
                  <strong>Email:</strong>
                  <br />
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                </ListGroup.Item>

                <ListGroup.Item className="px-0">
                  <FaPhone className="me-2 text-primary" />
                  <strong>Phone (WhatsApp):</strong>
                  <br />
                  <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                </ListGroup.Item>

                <ListGroup.Item className="px-0">
                  <FaBuilding className="me-2 text-primary" />
                  <strong>Service:</strong>
                  <br />
                  {lead.service || "Not specified"}
                </ListGroup.Item>

                <ListGroup.Item className="px-0">
                  <FaUser className="me-2 text-primary" />
                  <strong>Budget:</strong>
                  <br />
                  {lead.budget || "Not specified"}
                </ListGroup.Item>

                <ListGroup.Item className="px-0">
                  <strong>Created:</strong>
                  <br />
                  {formatDate(lead.createdAt)}
                </ListGroup.Item>

                <ListGroup.Item className="px-0">
                  <strong>Last Updated:</strong>
                  <br />
                  {formatDate(lead.updatedAt)}
                </ListGroup.Item>

                {/* Email Statistics */}
                <ListGroup.Item className="px-0">
                  <FaEnvelope className="me-2 text-primary" />
                  <strong>Email Status:</strong>
                  <br />
                  <div className="d-flex align-items-center gap-2 mt-1">
                    {lead.emailStats ? (
                      <>
                        <Badge bg={lead.emailStats.emailStatus === 'sent' ? 'success' : 
                                   lead.emailStats.emailStatus === 'failed' ? 'danger' : 'secondary'}>
                          {lead.emailStats.emailStatus === 'sent' ? 
                            `${lead.emailStats.totalEmailsSent} Sent` : 
                            lead.emailStats.emailStatus === 'failed' ? 'Failed' : 'No Emails'}
                        </Badge>
                        {lead.emailStats.lastEmailSentAt && (
                          <small className="text-muted">
                            Last: {formatDate(lead.emailStats.lastEmailSentAt)}
                          </small>
                        )}
                      </>
                    ) : (
                      <Badge bg="secondary">No Emails</Badge>
                    )}
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm mb-3">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Lead Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong className="text-muted d-block mb-2">
                  Status Updates
                </strong>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleStatusChange("Contacted")}
                  >
                    Mark Contacted
                  </Button>

                  <Dropdown drop="down">
                    <Dropdown.Toggle
                      size="sm"
                      variant="outline-warning"
                      id="dropdown-qualified"
                    >
                      Mark Qualified
                    </Dropdown.Toggle>
                    <Dropdown.Menu
                      popperConfig={{
                        strategy: 'fixed',
                        modifiers: [
                          {
                            name: 'offset',
                            options: {
                              offset: [0, 8],
                            },
                          },
                        ],
                      }}
                    >
                      <Dropdown.Item
                        onClick={() => handleTemperatureChange("Hot")}
                      >
                        🔴 Hot Lead
                        <small className="d-block text-muted">
                          Ready to buy, high priority
                        </small>
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={() => handleTemperatureChange("Warm")}
                      >
                        🟡 Warm Lead
                        <small className="d-block text-muted">
                          Interested, needs more info
                        </small>
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={() => handleTemperatureChange("Cold")}
                      >
                        🔵 Cold Lead
                        <small className="d-block text-muted">
                          Low interest, needs nurturing
                        </small>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>

                  <Button
                    size="sm"
                    variant="outline-info"
                    onClick={() => handleStatusChange("Proposal Sent")}
                  >
                    Proposal Sent
                  </Button>

                  <Button
                    size="sm"
                    variant="outline-dark"
                    onClick={() => handleStatusChange("Negotiation")}
                  >
                    Negotiation
                  </Button>

                  <Button
                    size="sm"
                    variant="outline-success"
                    onClick={() => handleStatusChange("Won")}
                  >
                    Mark Won
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleStatusChange("Lost")}
                  >
                    Mark Lost
                  </Button>
                </div>
              </div>

              <div className="mb-3">
                <strong className="text-muted d-block mb-2">
                  Follow-up Actions
                </strong>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowFollowUpModal(true)}
                  >
                    <FaPhoneAlt className="me-1" />
                    Schedule Follow-up
                  </Button>
                </div>
              </div>

              {lead.nextFollowUpDate && (
                <div className="alert alert-info mb-0">
                  <strong>
                    <FaCalendarAlt className="me-2" />
                    Next Follow-up:
                  </strong>{" "}
                  {formatDate(lead.nextFollowUpDate)}
                </div>
              )}
            </Card.Body>
          </Card>

          <Row className="g-3">
            <Col md={6}>
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Follow-up History</h5>
                </Card.Header>
                <Card.Body
                  className="p-0"
                  style={{
                    maxHeight: "350px",
                    overflowY: "scroll",
                    overflowX: "hidden",
                  }}
                >
                  {lead.followUps && lead.followUps.length > 0 ? (
                    <ListGroup variant="flush">
                      {lead.followUps
                        .sort(
                          (a, b) =>
                            new Date(b.scheduledDate) -
                            new Date(a.scheduledDate)
                        )
                        .map((followUp) => (
                          <ListGroup.Item
                            key={followUp._id}
                            className="px-3 py-3"
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  {getFollowUpIcon(followUp.followUpType)}
                                  <strong>{followUp.followUpType}</strong>
                                  <Badge
                                    bg={
                                      followUp.status === "Completed"
                                        ? "success"
                                        : followUp.status === "Cancelled"
                                        ? "secondary"
                                        : "warning"
                                    }
                                  >
                                    {followUp.status}
                                  </Badge>
                                </div>
                                <small className="text-muted d-block">
                                  Scheduled: {formatDate(followUp.scheduledDate)}
                                </small>
                                {followUp.notes && (
                                  <small className="d-block mt-1">
                                    {followUp.notes}
                                  </small>
                                )}
                                {followUp.completedAt && (
                                  <small className="text-success d-block">
                                    Completed: {formatDate(followUp.completedAt)}
                                  </small>
                                )}
                              </div>
                              {followUp.status === "Pending" && (
                                <div className="d-flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline-success"
                                    onClick={() =>
                                      handleCompleteFollowUp(followUp._id)
                                    }
                                  >
                                    <FaCheck />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() =>
                                      handleCancelFollowUp(followUp._id)
                                    }
                                  >
                                    <FaTimes />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </ListGroup.Item>
                        ))}
                    </ListGroup>
                  ) : (
                    <p className="text-muted text-center py-3 mb-0">
                      No follow-ups scheduled yet
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Notes History</h5>
                </Card.Header>
                <Card.Body
                  className="p-0"
                  style={{
                    maxHeight: "350px",
                    overflowY: "scroll",
                    overflowX: "hidden",
                  }}
                >
                  {lead.notesHistory && lead.notesHistory.length > 0 ? (
                    <ListGroup variant="flush">
                      {lead.notesHistory
                        .sort(
                          (a, b) =>
                            new Date(b.addedAt) - new Date(a.addedAt)
                        )
                        .slice(0, showAllNotes ? lead.notesHistory.length : 3)
                        .map((noteItem, index) => (
                          <ListGroup.Item
                            key={index}
                            className="d-flex justify-content-between align-items-start px-3 py-3"
                          >
                            <div className="flex-grow-1">
                              <div className="mb-1">
                                <small className="text-muted">
                                  {formatDate(noteItem.addedAt)}
                                  {noteItem.addedBy && (
                                    <span> by {noteItem.addedBy.name}</span>
                                  )}
                                </small>
                              </div>
                              <p className="mb-0">{noteItem.note}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDeleteNote(noteItem)}
                              style={{ minWidth: "30px" }}
                            >
                              <FaTimes />
                            </Button>
                          </ListGroup.Item>
                        ))}
                    </ListGroup>
                  ) : (
                    <p className="text-muted text-center py-3 mb-0">
                      No notes added yet
                    </p>
                  )}
                </Card.Body>
                {lead.notesHistory && lead.notesHistory.length > 3 && (
                  <Card.Footer className="bg-white text-center py-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowAllNotes(!showAllNotes)}
                    >
                      {showAllNotes
                        ? "Show Less"
                        : `Show All (${lead.notesHistory.length})`}
                    </Button>
                  </Card.Footer>
                )}
              </Card>
            </Col>
          </Row>

          {/* Add Notes - Moved above Lead History */}
          <Card className="shadow-sm mt-3">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Add Notes</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Add notes about this lead..."
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                />
                <div className="mt-2">
                  <Button size="sm" variant="primary" onClick={handleSaveNotes}>
                    Save Notes
                  </Button>
                </div>
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Manage Contacts */}
          <Card className="shadow-sm mt-3">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Manage Contacts</h5>
            </Card.Header>
            <Card.Body className="py-2">
              <ContactsTab 
                leadId={id} 
                contacts={lead.contacts || []} 
                onUpdate={fetchLeadDetails} 
              />
            </Card.Body>
          </Card>

          {/* Lead History & Remarks */}
          <Card className="shadow-sm mt-3">
            <Card.Header className="bg-white py-2">
              <h6 className="mb-0">Lead History & Remarks</h6>
              <small className="text-muted">Complete activity log including meetings, follow-ups, status changes, and remarks</small>
            </Card.Header>
            <Card.Body className="py-2">
              <HistoryTab history={lead.history || []} />
              
              {/* Add to Lead History Section */}
              <Card className="mt-2 border">
                <Card.Header className="bg-light py-2">
                  <h6 className="mb-0">Add to Lead History</h6>
                  <small className="text-muted">Add remarks, meeting notes, or important updates</small>
                </Card.Header>
                <Card.Body className="py-2">
                  <Form.Group className="mb-2">
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="E.g., 'Had a meeting with client, discussed pricing. Client interested in premium package. Follow up next week.'"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                    <div className="mt-2">
                      <Button size="sm" variant="primary" onClick={handleAddRemark}>
                        Add to History
                      </Button>
                    </div>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>

          {/* Email History Section */}
          <Card className="shadow-sm mt-3">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaEnvelope className="me-2" />
                Email History & Statistics
              </h5>
              <Button
                size="sm"
                variant="outline-primary"
                onClick={fetchEmailHistory}
                disabled={emailLoading}
              >
                <FaHistory className="me-1" />
                Refresh
              </Button>
            </Card.Header>
            <Card.Body>
              {emailLoading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 mb-0">Loading email history...</p>
                </div>
              ) : (
                <>
                  {/* Email Statistics Cards */}
                  {emailStats && (
                    <Row className="mb-4">
                      <Col md={3}>
                        <Card className="text-center h-100 border-primary">
                          <Card.Body className="py-3">
                            <h4 className="text-primary mb-1">{emailStats.totalEmails}</h4>
                            <small className="text-muted">Total Emails</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="text-center h-100 border-success">
                          <Card.Body className="py-3">
                            <h4 className="text-success mb-1">{emailStats.sentEmails}</h4>
                            <small className="text-muted">Successfully Sent</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="text-center h-100 border-danger">
                          <Card.Body className="py-3">
                            <h4 className="text-danger mb-1">{emailStats.failedEmails}</h4>
                            <small className="text-muted">Failed</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="text-center h-100 border-info">
                          <Card.Body className="py-3">
                            <h6 className="text-info mb-1">
                              {emailStats.lastEmailSent ? formatDate(emailStats.lastEmailSent) : 'Never'}
                            </h6>
                            <small className="text-muted">Last Email</small>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {/* Success Rate Progress Bar */}
                  {emailStats && emailStats.totalEmails > 0 && (
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>Email Success Rate</strong>
                        <span className="text-muted">
                          {Math.round((emailStats.sentEmails / emailStats.totalEmails) * 100)}%
                        </span>
                      </div>
                      <ProgressBar 
                        now={(emailStats.sentEmails / emailStats.totalEmails) * 100}
                        variant={emailStats.sentEmails === emailStats.totalEmails ? 'success' : 
                                emailStats.failedEmails > emailStats.sentEmails ? 'danger' : 'warning'}
                        style={{ height: '8px' }}
                      />
                    </div>
                  )}

                  {/* Email History Table */}
                  {emailHistory.length > 0 ? (
                    <>
                      <div className="table-responsive">
                        <Table hover size="sm">
                          <thead className="table-light">
                            <tr>
                              <th>Status</th>
                              <th>Template</th>
                              <th>Subject</th>
                              <th>Sent By</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emailHistory
                              .slice(0, showAllEmails ? emailHistory.length : 5)
                              .map((campaign, index) => (
                                <tr key={campaign._id || index}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      {getEmailStatusIcon(campaign.status)}
                                      <Badge 
                                        bg={getEmailStatusVariant(campaign.status)} 
                                        className="ms-2"
                                        style={{ fontSize: '0.7rem' }}
                                      >
                                        {campaign.status}
                                      </Badge>
                                    </div>
                                  </td>
                                  <td>
                                    <Badge 
                                      bg={getTemplateColor(campaign.template)}
                                      style={{ fontSize: '0.7rem' }}
                                    >
                                      {campaign.templateName}
                                    </Badge>
                                  </td>
                                  <td>
                                    <div 
                                      className="text-truncate" 
                                      style={{ maxWidth: '200px' }}
                                      title={campaign.subject}
                                    >
                                      {campaign.subject}
                                    </div>
                                  </td>
                                  <td>
                                    <div>
                                      <div className="fw-bold" style={{ fontSize: '0.85rem' }}>
                                        {campaign.sentByName}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div>
                                      <div style={{ fontSize: '0.85rem' }}>
                                        {formatDate(campaign.sentAt)}
                                      </div>
                                      <small className="text-muted">
                                        {new Date(campaign.sentAt).toLocaleTimeString()}
                                      </small>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </Table>
                      </div>
                      
                      {emailHistory.length > 5 && (
                        <div className="text-center mt-3">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => setShowAllEmails(!showAllEmails)}
                          >
                            {showAllEmails ? 'Show Less' : `Show All (${emailHistory.length})`}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <FaEnvelope size={48} className="text-muted mb-3" />
                      <h5 className="text-muted">No Email History</h5>
                      <p className="text-muted mb-0">
                        No emails have been sent to this lead yet.
                      </p>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Follow-up Modal */}
      <Modal
        show={showFollowUpModal}
        onHide={() => setShowFollowUpModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Schedule Follow-up</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Follow-up Type</Form.Label>
              <Form.Select
                value={followUpData.type}
                onChange={(e) =>
                  setFollowUpData({ ...followUpData, type: e.target.value })
                }
              >
                <option value="Call">📞 Phone Call</option>
                <option value="Email">✉️ Email</option>
                <option value="Meeting">📅 Meeting</option>
                <option value="Reminder">🔔 Reminder</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Scheduled Date & Time</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Control
                  type="text"
                  value={
                    followUpData.scheduledDate
                      ? new Date(
                          followUpData.scheduledDate
                        ).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Not selected"
                  }
                  readOnly
                  placeholder="Select date and time"
                />
                <Button
                  variant="outline-primary"
                  onClick={handleOpenDateTimePicker}
                >
                  <FaCalendarAlt />
                </Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Add any notes or reminders..."
                value={followUpData.notes}
                onChange={(e) =>
                  setFollowUpData({ ...followUpData, notes: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowFollowUpModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleScheduleFollowUp}>
            Schedule Follow-up
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Date & Time Picker Modal */}
      <Modal
        show={showDateTimePicker}
        onHide={handleCancelDateTime}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title>Select Date & Time</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Time</Form.Label>
              <Form.Control
                type="time"
                value={tempTime}
                onChange={(e) => setTempTime(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelDateTime}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmDateTime}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LeadDetails;
   
