import { useState, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { rawDataApi } from "../../api/rawDataApi";
import api from "../../services/api";

export default function AssignModal({ show, recordIds, onHide, onAssigned }) {
  const [callerId, setCallerId] = useState("");
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch users from Telecaller department
    api.get("/users", { params: { limit: 100, department: "Telecaller", status: "active" } })
      .then(res => setUsers(res.data.users || res.data.data || res.data || []))
      .catch(() => {
        // Fallback: fetch active users if department filter doesn't work
        api.get("/users", { params: { limit: 100, status: "active" } })
          .then(res => setUsers(res.data.users || res.data.data || res.data || []))
          .catch(() => {});
      });
  }, []);

  const handleAssign = async () => {
    if (!callerId) return toast.error("Select a caller");
    setSaving(true);
    try {
      await rawDataApi.bulkAssign(recordIds, callerId);
      toast.success(`${recordIds.length} records assigned`);
      onAssigned();
    } catch {
      toast.error("Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">Assign {recordIds.length} Records</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Label className="small fw-medium">Select Caller</Form.Label>
        <Form.Select size="sm" value={callerId} onChange={e => setCallerId(e.target.value)}>
          <option value="">— Select —</option>
          {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
        </Form.Select>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleAssign} disabled={saving || !callerId}>
          {saving ? "Assigning..." : "Assign"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
