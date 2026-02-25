import { useState } from "react";
import { Card, Button, Badge, ListGroup, Modal, Form, Row, Col } from "react-bootstrap";
import { FaPlus, FaEdit, FaCheck, FaTimes, FaVideo, FaMapMarkerAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import { leadApi } from "../../api/leadApi";
import { formatDate } from "../../utils/helpers";

const MeetingsTab = ({ leadId, meetings, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
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

  const handleOpenModal = (meeting = null) => {
    if (meeting) {
      setEditingMeeting(meeting);
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
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
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
        await leadApi.updateMeeting(leadId, editingMeeting._id, formData);
        toast.success("Meeting updated");
      } else {
        await leadApi.createMeeting(leadId, formData);
        toast.success("Meeting scheduled");
      }
      
      setShowModal(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to save meeting");
    }
  };

  const handleComplete = async (meetingId) => {
    try {
      await leadApi.completeMeeting(leadId, meetingId);
      toast.success("Meeting marked as completed");
      onUpdate();
    } catch (error) {
      toast.error("Failed to complete meeting");
    }
  };

  const handleCancel = async (meetingId) => {
    if (!window.confirm("Cancel this meeting?")) return;
    try {
      await leadApi.cancelMeeting(leadId, meetingId);
      toast.success("Meeting cancelled");
      onUpdate();
    } catch (error) {
      toast.error("Failed to cancel meeting");
    }
  };

  const sortedMeetings = [...meetings].sort((a, b) => 
    new Date(a.scheduledDate) - new Date(b.scheduledDate)
  );

  return (
    <>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Meetings</h5>
          <Button size="sm" variant="primary" onClick={() => handleOpenModal()}>
            <FaPlus className="me-1" /> Schedule Meeting
          </Button>
        </Card.Header>
        <Card.Body className="p-0" style={{ maxHeight: "400px", overflowY: "auto" }}>
          {sortedMeetings.length > 0 ? (
            <ListGroup variant="flush">
              {sortedMeetings.map((meeting) => (
                <ListGroup.Item key={meeting._id} className="px-3 py-3">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        {meeting.meetingType === "Online" ? <FaVideo className="text-primary" /> : <FaMapMarkerAlt className="text-success" />}
                        <strong>{meeting.title}</strong>
                        <Badge bg={
                          meeting.status === "Completed" ? "success" :
                          meeting.status === "Cancelled" ? "secondary" :
                          meeting.status === "Missed" ? "danger" : "primary"
                        }>
                          {meeting.status}
                        </Badge>
                      </div>
                      <small className="text-muted d-block">
                        {formatDate(meeting.scheduledDate)} at {meeting.scheduledTime} ({meeting.duration} min)
                      </small>
                      {meeting.meetingType === "Online" && meeting.meetingLink && (
                        <small className="d-block">
                          <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">Join Meeting</a>
                        </small>
                      )}
                      {meeting.meetingType === "Offline" && meeting.location && (
                        <small className="d-block">Location: {meeting.location}</small>
                      )}
                      {meeting.notes && <small className="d-block mt-1">{meeting.notes}</small>}
                    </div>
                    {meeting.status === "Scheduled" && (
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-primary" onClick={() => handleOpenModal(meeting)}>
                          <FaEdit />
                        </Button>
                        <Button size="sm" variant="outline-success" onClick={() => handleComplete(meeting._id)}>
                          <FaCheck />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleCancel(meeting._id)}>
                          <FaTimes />
                        </Button>
                      </div>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-center text-muted py-4 mb-0">No meetings scheduled</p>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingMeeting ? "Edit" : "Schedule"} Meeting</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
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
          <Button variant="primary" onClick={handleSubmit}>Save</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default MeetingsTab;
