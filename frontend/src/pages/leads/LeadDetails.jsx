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
} from "react-icons/fa";
import { toast } from "react-toastify";
import { leadApi } from "../../api/leadApi";
import { formatDate } from "../../utils/helpers";

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    type: "Call",
    scheduledDate: "",
    notes: "",
  });
  const [tempDate, setTempDate] = useState("");
  const [tempTime, setTempTime] = useState("");
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  useEffect(() => {
    fetchLeadDetails();
  }, [id]);

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
      case "Referral":
        return "success";
      case "Social Media":
        return "info";
      case "Advertisement":
        return "warning";
      case "Cold Call":
        return "secondary";
      case "Other":
        return "dark";
      default:
        return "secondary";
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
      toast.error("Failed to save notes");
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

  const handleDeleteNote = async (noteIndex) => {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }
    try {
      await leadApi.deleteNote(id, noteIndex);
      toast.success("Note deleted successfully");
      fetchLeadDetails();
    } catch (error) {
      toast.error("Failed to delete note");
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

                  <Dropdown>
                    <Dropdown.Toggle
                      size="sm"
                      variant="outline-warning"
                      id="dropdown-qualified"
                    >
                      Mark Qualified
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
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
                              onClick={() => handleDeleteNote(index)}
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
