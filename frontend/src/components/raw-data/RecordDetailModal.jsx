import { useState, useEffect } from "react";
import { Modal, Badge, Button, ListGroup, Spinner, Row, Col } from "react-bootstrap";
import { toast } from "react-toastify";
import { rawDataApi } from "../../api/rawDataApi";
import ConvertToLeadModal from "./ConvertToLeadModal";

const STATUS_COLORS = {
  "New": "secondary", "Pending Call": "warning", "Called": "info",
  "No Response": "dark", "Wrong Number": "danger", "Not Interested": "danger",
  "Interested": "success", "Follow-up Needed": "warning",
  "Converted to Lead": "primary", "Rejected": "danger",
};

export default function RecordDetailModal({ show, recordId, onHide, onConverted }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConvert, setShowConvert] = useState(false);

  useEffect(() => {
    if (show && recordId) {
      setLoading(true);
      rawDataApi.getById(recordId)
        .then(res => setRecord(res.data))
        .catch(() => toast.error("Failed to load record"))
        .finally(() => setLoading(false));
    }
  }, [show, recordId]);

  if (!show) return null;

  return (
    <>
      <Modal show={show && !showConvert} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">
            {record?.name} — <span className="text-muted">{record?.phone}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
          ) : record && (
            <Row className="g-3">
              <Col md={6}>
                <div className="small">
                  <div className="fw-medium text-muted mb-2">Contact Info</div>
                  <table className="w-100">
                    <tbody>
                      {[["Phone", record.phone], ["WhatsApp", record.whatsapp], ["Location", record.location], ["Category", record.category], ["Source", record.source], ["Reference", record.reference], ["Requirement", record.requirement]].map(([k, v]) => v ? (
                        <tr key={k}><td className="text-muted pe-2 py-1">{k}</td><td>{v}</td></tr>
                      ) : null)}
                    </tbody>
                  </table>
                </div>
              </Col>
              <Col md={6}>
                <div className="small">
                  <div className="fw-medium text-muted mb-2">Calling Info</div>
                  <div className="mb-1">Status: <Badge bg={STATUS_COLORS[record.status]}>{record.status}</Badge></div>
                  <div className="mb-1">Caller: {record.assignedCaller?.name || "Unassigned"}</div>
                  <div className="mb-1">Attempts: <strong>{record.callAttemptCount}</strong></div>
                  <div className="mb-1">Last Call: {record.lastCallDate ? new Date(record.lastCallDate).toLocaleString() : "—"}</div>
                  {record.remarks && <div className="mt-2 p-2 bg-light rounded">{record.remarks}</div>}
                </div>
              </Col>

              {/* Call History */}
              {record.callHistory?.length > 0 && (
                <Col md={12}>
                  <div className="fw-medium text-muted small mb-2">Call History ({record.callHistory.length} calls)</div>
                  <ListGroup variant="flush" className="small">
                    {record.callHistory.map((h, i) => (
                      <ListGroup.Item key={i} className="px-0">
                        <div className="d-flex justify-content-between">
                          <div>
                            <Badge bg={STATUS_COLORS[h.status] || "secondary"} className="me-2">{h.status}</Badge>
                            <span className="text-muted">by {h.calledBy?.name || "Unknown"}</span>
                          </div>
                          <span className="text-muted">{new Date(h.calledAt).toLocaleString()}</span>
                        </div>
                        {h.remarks && <div className="text-muted mt-1 ps-1">{h.remarks}</div>}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={onHide}>Close</Button>
          {record?.status === "Interested" && !record?.convertedToLead && (
            <Button variant="success" size="sm" onClick={() => setShowConvert(true)}>
              Convert to Lead
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {record && showConvert && (
        <ConvertToLeadModal show={showConvert} record={record} onHide={() => setShowConvert(false)} onConverted={() => { setShowConvert(false); onConverted(); }} />
      )}
    </>
  );
}
