import { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, ListGroup } from "react-bootstrap";
import { toast } from "react-toastify";
import { rawDataApi } from "../../api/rawDataApi";
import api from "../../services/api";

export default function ConvertToLeadModal({ show, record, onHide, onConverted }) {
  const [leadOwnerId, setLeadOwnerId] = useState("");
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      // Fetch only Sales department employees
      api.get("/users?department=Sales&limit=100")
        .then(res => {
          const userList = Array.isArray(res.data) ? res.data : (res.data.users || res.data.data || []);
          setUsers(userList);
          if (userList.length === 0) {
            toast.warning("No sales team members found");
          }
        })
        .catch(err => {
          console.error("Error fetching sales team:", err);
          toast.error("Failed to load sales team members");
        });
    }
  }, [show]);

  const handleConvert = async () => {
    if (!leadOwnerId) {
      toast.error("Please select a team member to assign the lead");
      return;
    }
    setSaving(true);
    try {
      await rawDataApi.convertToLead(record._id, leadOwnerId);
      toast.success("Converted to Lead successfully");
      onConverted();
    } catch (err) {
      toast.error(err.response?.data?.error || "Conversion failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">Convert to Lead</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="small mb-3">
          <div className="fw-medium mb-2">Record Details</div>
          <ListGroup variant="flush" className="small">
            {[["Name", record?.name], ["Phone", record?.phone], ["Location", record?.location], ["Category", record?.category], ["Source", record?.source], ["Requirement", record?.requirement]].map(([k, v]) => v ? (
              <ListGroup.Item key={k} className="px-0 py-1 d-flex justify-content-between">
                <span className="text-muted">{k}</span><span>{v}</span>
              </ListGroup.Item>
            ) : null)}
          </ListGroup>
        </div>

        <Form.Label className="small fw-medium">Assign to Sales Team Member *</Form.Label>
        <Form.Select 
          size="sm" 
          value={leadOwnerId} 
          onChange={e => setLeadOwnerId(e.target.value)}
          className="mb-3"
        >
          <option value="">— Select Team Member —</option>
          {users.map(u => (
            <option key={u._id} value={u._id}>
              {u.name} {u.designation ? `(${u.designation})` : ''}
            </option>
          ))}
        </Form.Select>

        {users.length === 0 && (
          <div className="alert alert-warning small mb-3">
            No sales team members available. Please add team members to the Sales department first.
          </div>
        )}

        <div className="p-2 bg-light rounded small text-muted">
          ✓ This record will be moved to Leads section<br />
          ✓ Assigned to selected team member<br />
          ✓ Call history will be preserved<br />
          ✓ Record will be locked in Raw Data Sheet
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button>
        <Button variant="success" size="sm" onClick={handleConvert} disabled={saving || !leadOwnerId || users.length === 0}>
          {saving ? "Converting..." : "Convert to Lead"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
