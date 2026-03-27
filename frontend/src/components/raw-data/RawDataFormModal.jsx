import { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import { rawDataApi } from "../../api/rawDataApi";

const CATEGORIES = ["Makeup Artist", "Salon", "Bridal Clients", "Tattoo Artists", "Nail Art", "Other"];
const SOURCES = ["Instagram", "Facebook", "Referral", "Manual", "Website", "Justdial", "Event", "Existing Contact", "Other"];

const EMPTY = { name: "", phone: "", whatsapp: "", location: "", category: "Other", source: "Manual", reference: "", requirement: "", remarks: "" };

export default function RawDataFormModal({ show, onHide, onSaved, record }) {
  const [form, setForm] = useState(record || EMPTY);
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);

  // Reset form whenever modal opens or record changes
  useEffect(() => {
    if (show) {
      setForm(record || EMPTY);
      setDupWarning(null);
    }
  }, [show, record]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const checkDup = async () => {
    if (!form.phone || form.phone.length < 10) return;
    try {
      const res = await rawDataApi.checkDuplicate(form.phone);
      if (res.data.isDuplicate) setDupWarning(res.data.existingRecord);
      else setDupWarning(null);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (record) await rawDataApi.update(record._id, form);
      else await rawDataApi.create(form);
      toast.success(record ? "Updated" : "Record added");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{record ? "Edit Record" : "Add Raw Data Record"}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {dupWarning && (
            <Alert variant="warning" className="small">
              ⚠️ Phone already exists: <strong>{dupWarning.name}</strong> (Status: {dupWarning.status})
            </Alert>
          )}
          <Row className="g-3">
            <Col md={6}>
              <Form.Label className="small fw-medium">Name *</Form.Label>
              <Form.Control size="sm" required value={form.name} onChange={e => set("name", e.target.value)} />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-medium">Phone *</Form.Label>
              <Form.Control size="sm" required value={form.phone} onChange={e => set("phone", e.target.value)} onBlur={checkDup} />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-medium">WhatsApp</Form.Label>
              <Form.Control size="sm" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-medium">Location</Form.Label>
              <Form.Control size="sm" value={form.location} onChange={e => set("location", e.target.value)} />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-medium">Category</Form.Label>
              <Form.Select size="sm" value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-medium">Source</Form.Label>
              <Form.Select size="sm" value={form.source} onChange={e => set("source", e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-medium">Reference</Form.Label>
              <Form.Control size="sm" value={form.reference} onChange={e => set("reference", e.target.value)} />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-medium">Requirement</Form.Label>
              <Form.Control size="sm" value={form.requirement} onChange={e => set("requirement", e.target.value)} />
            </Col>
            <Col md={12}>
              <Form.Label className="small fw-medium">Remarks</Form.Label>
              <Form.Control as="textarea" rows={2} size="sm" value={form.remarks} onChange={e => set("remarks", e.target.value)} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
