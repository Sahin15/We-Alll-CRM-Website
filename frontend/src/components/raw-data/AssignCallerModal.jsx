import { useState, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../services/api";

export default function AssignCallerModal({ show, record, onHide, onAssigned }) {
  const [callerId, setCallerId] = useState("");
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setCallerId(record?.assignedCaller?._id || "");
      setLoading(true);
      // Fetch users from Telecaller department
      api.get("/users", { params: { department: "Telecaller", status: "active", limit: 1000 } })
        .then(res => {
          const userList = Array.isArray(res.data) ? res.data : (res.data.users || res.data.data || []);
          setUsers(userList);
          if (userList.length === 0) {
            toast.warning("No telecallers found. Make sure the Telecaller department exists.");
          }
        })
        .catch(err => {
          console.error("Error fetching telecallers:", err);
          toast.error("Failed to load telecallers");
          setUsers([]);
        })
        .finally(() => setLoading(false));
    }
  }, [show, record]);

  const handleAssign = async () => {
    if (!callerId) return toast.error("Select a caller");
    setSaving(true);
    try {
      onAssigned(callerId);
    } catch {
      toast.error("Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">Assign Caller</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Label className="small fw-medium">Select Caller</Form.Label>
        {loading ? (
          <div className="text-center py-2 text-muted small">Loading telecallers...</div>
        ) : (
          <Form.Select size="sm" value={callerId} onChange={e => setCallerId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {users.length === 0 ? (
              <option disabled>No telecallers available</option>
            ) : (
              users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)
            )}
          </Form.Select>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleAssign} disabled={saving || loading || users.length === 0}>
          {saving ? "Assigning..." : "Assign"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
