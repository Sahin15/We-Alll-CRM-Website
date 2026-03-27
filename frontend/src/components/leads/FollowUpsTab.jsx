import { useState } from "react";
import { Card, Button, Badge, ListGroup, Modal, Form } from "react-bootstrap";
import { FaPhoneAlt, FaEnvelopeOpen, FaCalendarAlt, FaBell, FaCheck, FaTimes, FaPlus, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { leadApi } from "../../api/leadApi";
import { formatDate } from "../../utils/helpers";

// Quick follow-up options
const QUICK_OPTIONS = [
  { label: "2 hours", getValue: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
  { label: "Tomorrow 10 AM", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; } },
  { label: "Tomorrow 2 PM", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(14, 0, 0, 0); return d; } },
  { label: "In 3 days", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d; } },
  { label: "Next week", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); return d; } },
];

const FollowUpsTab = ({ leadId, followUps, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [formData, setFormData] = useState({
    followUpType: "Call",
    scheduledDate: "",
    scheduledTime: "",
    notes: "",
    assignedTo: "",
  });

  const getFollowUpIcon = (type) => {
    switch (type) {
      case "Call": return <FaPhoneAlt className="me-1" />;
      case "Email": return <FaEnvelopeOpen className="me-1" />;
      case "Meeting": return <FaCalendarAlt className="me-1" />;
      case "Reminder": return <FaBell className="me-1" />;
      default: return null;
    }
  };

  const isOverdue = (scheduledDate, status) => {
    if (status !== "Pending") return false;
    return new Date(scheduledDate) < new Date();
  };

  const handleOpenModal = (followUp = null) => {
    if (followUp) {
      setEditingFollowUp(followUp);
      setFormData({
        followUpType: followUp.followUpType,
        scheduledDate: followUp.scheduledDate?.split("T")[0] || "",
        scheduledTime: followUp.scheduledTime || "",
        notes: followUp.notes || "",
        assignedTo: followUp.assignedTo?._id || "",
      });
    } else {
      setEditingFollowUp(null);
      setFormData({
        followUpType: "Call",
        scheduledDate: "",
        scheduledTime: "",
        notes: "",
        assignedTo: "",
      });
    }
    setShowModal(true);
  };

  const handleQuickOption = (option) => {
    const date = option.getValue();
    setFormData({
      ...formData,
      scheduledDate: date.toISOString().split("T")[0],
      scheduledTime: date.toTimeString().slice(0, 5),
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.scheduledDate || !formData.scheduledTime) {
        toast.error("Please select date and time");
        return;
      }

      if (editingFollowUp) {
        await leadApi.updateFollowUp(leadId, editingFollowUp._id, formData);
        toast.success("Follow-up updated");
      } else {
        await leadApi.createFollowUp(leadId, formData);
        toast.success("Follow-up created");
      }
      
      setShowModal(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to save follow-up");
    }
  };

  const handleComplete = async (followUpId) => {
    try {
      await leadApi.completeFollowUp(leadId, followUpId);
      toast.success("Follow-up completed");
      onUpdate();
    } catch (error) {
      toast.error("Failed to complete follow-up");
    }
  };

  const handleDelete = async (followUpId) => {
    if (!window.confirm("Delete this follow-up?")) return;
    try {
      await leadApi.deleteFollowUp(leadId, followUpId);
      toast.success("Follow-up deleted");
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete follow-up");
    }
  };

  // Sort: nearest upcoming first, then overdue
  const sortedFollowUps = [...followUps].sort((a, b) => {
    if (a.status !== "Pending" && b.status === "Pending") return 1;
    if (a.status === "Pending" && b.status !== "Pending") return -1;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });

  const formatDateTimeDisplay = (date, time) => {
    if (!date || !time) return "Not set";
    const dateObj = new Date(date + "T" + time);
    return dateObj.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Follow-Ups</h5>
          <Button size="sm" variant="primary" onClick={() => handleOpenModal()}>
            <FaPlus className="me-1" /> Add Follow-Up
          </Button>
        </Card.Header>
        <Card.Body className="p-0" style={{ maxHeight: "400px", overflowY: "auto" }}>
          {sortedFollowUps.length > 0 ? (
            <ListGroup variant="flush">
              {sortedFollowUps.map((followUp) => (
                <ListGroup.Item
                  key={followUp._id}
                  className={`px-3 py-2 ${isOverdue(followUp.scheduledDate, followUp.status) ? "bg-danger bg-opacity-10 border-danger" : ""}`}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        {getFollowUpIcon(followUp.followUpType)}
                        <strong>{followUp.followUpType}</strong>
                        <Badge bg={followUp.status === "Completed" ? "success" : followUp.status === "Missed" ? "danger" : "warning"}>
                          {followUp.status}
                        </Badge>
                        {isOverdue(followUp.scheduledDate, followUp.status) && (
                          <Badge bg="danger">Overdue</Badge>
                        )}
                      </div>
                      <small className="text-muted d-block">
                        {formatDate(followUp.scheduledDate)} {followUp.scheduledTime && `at ${followUp.scheduledTime}`}
                      </small>
                      {followUp.assignedTo && (
                        <small className="text-muted d-block">Assigned: {followUp.assignedTo.name}</small>
                      )}
                      {followUp.notes && <small className="d-block mt-1">{followUp.notes}</small>}
                    </div>
                    {followUp.status === "Pending" && (
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-primary" onClick={() => handleOpenModal(followUp)}>
                          <FaEdit />
                        </Button>
                        <Button size="sm" variant="outline-success" onClick={() => handleComplete(followUp._id)}>
                          <FaCheck />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(followUp._id)}>
                          <FaTimes />
                        </Button>
                      </div>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-center text-muted py-4 mb-0">No follow-ups scheduled</p>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingFollowUp ? "Edit" : "Add"} Follow-Up</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select value={formData.followUpType} onChange={(e) => setFormData({ ...formData, followUpType: e.target.value })}>
                <option value="Call">Call</option>
                <option value="Email">Email</option>
                <option value="Meeting">Meeting</option>
                <option value="Reminder">Reminder</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-medium mb-2">Quick Schedule</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {QUICK_OPTIONS.map((option) => (
                  <Button 
                    key={option.label}
                    size="sm" 
                    variant="outline-primary"
                    onClick={() => handleQuickOption(option)}
                    className="small"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Time</Form.Label>
              <Form.Control type="time" value={formData.scheduledTime} onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })} />
            </Form.Group>

            {formData.scheduledDate && formData.scheduledTime && (
              <div className="p-2 bg-info bg-opacity-10 rounded small mb-3">
                <strong>Scheduled for:</strong> {formatDateTimeDisplay(formData.scheduledDate, formData.scheduledTime)}
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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

export default FollowUpsTab;
