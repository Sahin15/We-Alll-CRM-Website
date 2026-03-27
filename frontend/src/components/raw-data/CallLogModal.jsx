import { useState } from "react";
import { Modal, Form, Button, Row, Col, Badge, ListGroup, ButtonGroup } from "react-bootstrap";
import { toast } from "react-toastify";
import { rawDataApi } from "../../api/rawDataApi";

const OUTCOMES = ["No Response", "Wrong Number", "Not Interested", "Interested", "Follow-up Needed"];

const STATUS_COLORS = {
  "No Response": "dark", "Wrong Number": "danger", "Not Interested": "danger",
  "Interested": "success", "Follow-up Needed": "warning",
};

// Quick follow-up options
const QUICK_OPTIONS = [
  { label: "2 hours", getValue: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
  { label: "Tomorrow 10 AM", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; } },
  { label: "Tomorrow 2 PM", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(14, 0, 0, 0); return d; } },
  { label: "In 3 days", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d; } },
  { label: "Next week", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); return d; } },
];

export default function CallLogModal({ show, record, onHide, onSaved }) {
  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [nextCallDate, setNextCallDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleQuickOption = (option) => {
    const date = option.getValue();
    const isoString = date.toISOString().slice(0, 16);
    setNextCallDate(isoString);
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!status) return toast.error("Select a call outcome");
    setSaving(true);
    try {
      await rawDataApi.updateCallResult(record._id, { status, remarks, nextCallDate: nextCallDate || null });
      toast.success("Call logged");
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const formatDateTimeDisplay = (dateTimeStr) => {
    if (!dateTimeStr) return "Not set";
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">
          Log Call — <strong>{record.name}</strong>
          <a href={`tel:${record.phone}`} className="ms-2 text-dark small" style={{ textDecoration: 'none', fontWeight: '500' }}>{record.phone}</a>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          {/* Contact info */}
          <Col md={5}>
            <div className="bg-light rounded p-3 small">
              <div><span className="text-muted">Location:</span> {record.location || "—"}</div>
              <div><span className="text-muted">Category:</span> {record.category}</div>
              <div><span className="text-muted">Source:</span> {record.source}</div>
              <div><span className="text-muted">Requirement:</span> {record.requirement || "—"}</div>
              <div><span className="text-muted">Attempts:</span> <strong>{record.callAttemptCount}</strong></div>
            </div>

            {/* Previous calls */}
            {record.callHistory?.length > 0 && (
              <div className="mt-3">
                <div className="small fw-medium text-muted mb-1">Call History</div>
                <ListGroup variant="flush" className="small">
                  {record.callHistory.slice(-3).map((h, i) => (
                    <ListGroup.Item key={i} className="px-0 py-1">
                      <Badge bg={STATUS_COLORS[h.status] || "secondary"} className="me-1">{h.status}</Badge>
                      <span className="text-muted">{new Date(h.calledAt).toLocaleDateString()}</span>
                      {h.remarks && <div className="text-muted mt-1">{h.remarks}</div>}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
          </Col>

          {/* Call form */}
          <Col md={7}>
            <Form.Label className="small fw-medium">Call Outcome *</Form.Label>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {OUTCOMES.map(o => (
                <Button key={o} size="sm" variant={status === o ? "primary" : "outline-secondary"} onClick={() => setStatus(o)}>
                  {o}
                </Button>
              ))}
            </div>

            <Form.Label className="small fw-medium">Remarks</Form.Label>
            <Form.Control as="textarea" rows={3} size="sm" placeholder="Notes from this call..." value={remarks} onChange={e => setRemarks(e.target.value)} className="mb-3" />

            {status === "Follow-up Needed" && (
              <>
                <Form.Label className="small fw-medium mb-2">Schedule Next Call</Form.Label>
                
                {/* Quick options */}
                <div className="mb-3">
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {QUICK_OPTIONS.map((option) => (
                      <Button 
                        key={option.label}
                        size="sm" 
                        variant={nextCallDate && new Date(nextCallDate).toDateString() === option.getValue().toDateString() ? "primary" : "outline-secondary"}
                        onClick={() => handleQuickOption(option)}
                        className="small"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom date/time picker */}
                <div className="d-flex gap-2 align-items-center">
                  <Form.Control 
                    type="datetime-local" 
                    size="sm" 
                    value={nextCallDate} 
                    onChange={e => setNextCallDate(e.target.value)}
                    className="flex-grow-1"
                  />
                  {nextCallDate && (
                    <Button 
                      size="sm" 
                      variant="outline-secondary"
                      onClick={() => setNextCallDate("")}
                      title="Clear"
                    >
                      ✕
                    </Button>
                  )}
                </div>
                
                {nextCallDate && (
                  <div className="mt-2 p-2 bg-info bg-opacity-10 rounded small">
                    <strong>Scheduled for:</strong> {formatDateTimeDisplay(nextCallDate)}
                  </div>
                )}
              </>
            )}
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button>
        <Button variant="success" size="sm" onClick={handleSave} disabled={saving || !status}>
          {saving ? "Saving..." : "Save & Next"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
