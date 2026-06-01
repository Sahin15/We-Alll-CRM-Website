import { useState, useEffect } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Spinner,
} from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { hiringRequestApi } from "../../api/hiringRequestApi";

const emptyForm = () => ({
  designation: "",
  employmentType: "full-time",
  headcount: 1,
  skills: "",
  experienceRange: "",
  jobDescription: "",
  urgency: "medium",
  justification: "",
  preferredJoiningDate: "",
  budgetNotes: "",
});

const HoDCreateHiringRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    hiringRequestApi
      .get(editId)
      .then((res) => {
        const r = res.data?.request || res.data;
        if (r.status !== "draft") {
          toast.error("Only draft requests can be edited");
          navigate("/hod/hiring/requests");
          return;
        }
        setForm({
          designation: r.designation || "",
          employmentType: r.employmentType || "full-time",
          headcount: r.headcount || 1,
          skills: r.skills || "",
          experienceRange: r.experienceRange || "",
          jobDescription: r.jobDescription || "",
          urgency: r.urgency || "medium",
          justification: r.justification || "",
          preferredJoiningDate: r.preferredJoiningDate
            ? new Date(r.preferredJoiningDate).toISOString().split("T")[0]
            : "",
          budgetNotes: r.budgetNotes || "",
        });
      })
      .catch(() => toast.error("Failed to load request"))
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const handleSave = async (andSubmit = false) => {
    if (!form.designation.trim() || !form.justification.trim()) {
      toast.error("Designation and justification are required");
      return;
    }
    try {
      setSaving(true);
      let requestId = editId;
      if (editId) {
        await hiringRequestApi.update(editId, form);
        toast.success("Request updated");
      } else {
        const res = await hiringRequestApi.create(form);
        requestId = res.data?._id;
        toast.success("Draft created");
      }
      if (andSubmit && requestId) {
        await hiringRequestApi.submit(requestId);
        toast.success("Submitted to HR");
      }
      navigate("/hod/hiring/requests");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container fluid className="py-4" style={{ maxWidth: 800 }}>
      <h2 className="mb-4">{editId ? "Edit hiring request" : "New hiring request"}</h2>
      <Card className="shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <Form.Group>
                <Form.Label>Designation *</Form.Label>
                <Form.Control
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Headcount *</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={(e) =>
                    setForm({ ...form, headcount: parseInt(e.target.value, 10) || 1 })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Employment type</Form.Label>
                <Form.Select
                  value={form.employmentType}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="intern">Intern</option>
                  <option value="contract">Contract</option>
                  <option value="freelancer">Freelancer</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Urgency</Form.Label>
                <Form.Select
                  value={form.urgency}
                  onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Skills required</Form.Label>
                <Form.Control
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Experience range</Form.Label>
                <Form.Control
                  placeholder="e.g. 2-4 years"
                  value={form.experienceRange}
                  onChange={(e) => setForm({ ...form, experienceRange: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Preferred joining date</Form.Label>
                <Form.Control
                  type="date"
                  value={form.preferredJoiningDate}
                  onChange={(e) =>
                    setForm({ ...form, preferredJoiningDate: e.target.value })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Budget notes</Form.Label>
                <Form.Control
                  value={form.budgetNotes}
                  onChange={(e) => setForm({ ...form, budgetNotes: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Justification *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.justification}
                  onChange={(e) => setForm({ ...form, justification: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Job description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={form.jobDescription}
                  onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex gap-2 mt-4">
            <Button variant="secondary" onClick={() => navigate("/hod/hiring/requests")}>
              Cancel
            </Button>
            <Button variant="outline-primary" disabled={saving} onClick={() => handleSave(false)}>
              Save draft
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => handleSave(true)}>
              {saving ? "Saving..." : "Save & submit to HR"}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HoDCreateHiringRequest;
