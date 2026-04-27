import { useState } from "react";
import { Modal, Form, Button, Alert, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../services/api";
import StatusBadge from "./StatusBadge";

const TERMINAL_STATUSES = ["terminated", "offboarded"];

const StatusChangeModal = ({ show, onHide, employee, onSuccess }) => {
  const [newStatus, setNewStatus] = useState(employee?.status || "active");
  const [reactivationDate, setReactivationDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isTerminal = TERMINAL_STATUSES.includes(newStatus);
  const requiresConfirmation = isTerminal;
  const canSave = !requiresConfirmation || confirmed;

  const handleStatusChange = (val) => {
    setNewStatus(val);
    setConfirmed(false);
    setReactivationDate("");
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const body = { status: newStatus };
      if (newStatus === "inactive" && reactivationDate) {
        body.reactivationDate = reactivationDate;
      }

      const res = await api.put(`/users/${employee._id}/status`, body);
      const { user, projectsAffected } = res.data;

      let msg = `Status changed to ${newStatus}`;
      if (projectsAffected > 0) {
        msg += `. Removed from ${projectsAffected} project(s).`;
      }
      toast.success(msg);
      onSuccess(user, projectsAffected);
      onHide();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  // Get tomorrow's date as min for reactivation date picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Change Employee Status</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <strong>{employee?.name}</strong>
          <span className="ms-2">
            <StatusBadge status={employee?.status} />
          </span>
        </div>

        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">New Status</Form.Label>
          <Form.Select value={newStatus} onChange={(e) => handleStatusChange(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
            <option value="offboarded">Offboarded</option>
          </Form.Select>
        </Form.Group>

        {/* Reactivation date — only for inactive */}
        {newStatus === "inactive" && (
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Reactivation Date (optional)</Form.Label>
            <Form.Control
              type="date"
              min={tomorrowStr}
              value={reactivationDate}
              onChange={(e) => setReactivationDate(e.target.value)}
            />
            <Form.Text className="text-muted">
              If set, the employee will be automatically reactivated on this date.
            </Form.Text>
          </Form.Group>
        )}

        {/* Confirmation for terminal statuses */}
        {requiresConfirmation && (
          <Alert variant="danger" className="mb-3">
            <Alert.Heading className="fs-6">⚠️ Warning</Alert.Heading>
            <p className="mb-2 small">
              Setting status to <strong>{newStatus}</strong> will:
            </p>
            <ul className="small mb-2">
              <li>Block this employee from logging in immediately</li>
              <li>Remove them from all assigned projects</li>
            </ul>
            <Form.Check
              type="checkbox"
              id="confirm-terminal"
              label="I understand and confirm this action"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
          </Alert>
        )}

        {error && <Alert variant="danger" className="small">{error}</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant={isTerminal ? "danger" : "primary"}
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? (
            <><Spinner size="sm" className="me-1" />Saving…</>
          ) : (
            "Save Status"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default StatusChangeModal;
