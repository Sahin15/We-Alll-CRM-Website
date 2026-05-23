import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Card,
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Row,
  Col,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaSearch, FaFileAlt, FaTrash, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { applicantApi } from "../../api/applicantApi";

const SOURCE_OPTIONS = [
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "naukri", label: "Naukri" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  skills: "",
  experienceYears: "",
  currentCompany: "",
  expectedCtc: "",
  source: "other",
  tags: "",
  notes: "",
});

const ApplicantCVBank = () => {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [resumeFile, setResumeFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await applicantApi.list({ search: search || undefined });
      setApplicants(res.data || []);
    } catch {
      toast.error("Failed to load applicants");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setResumeFile(null);
    setShowModal(true);
  };

  const openEdit = (applicant) => {
    setEditingId(applicant._id);
    setForm({
      name: applicant.name || "",
      email: applicant.email || "",
      phone: applicant.phone || "",
      skills: applicant.skills || "",
      experienceYears: applicant.experienceYears ?? "",
      currentCompany: applicant.currentCompany || "",
      expectedCtc: applicant.expectedCtc || "",
      source: applicant.source || "other",
      tags: Array.isArray(applicant.tags) ? applicant.tags.join(", ") : applicant.tags || "",
      notes: applicant.notes || "",
    });
    setResumeFile(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone || undefined,
          skills: form.skills || undefined,
          experienceYears: form.experienceYears !== "" ? form.experienceYears : undefined,
          currentCompany: form.currentCompany || undefined,
          expectedCtc: form.expectedCtc || undefined,
          source: form.source,
          tags: form.tags
            ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : undefined,
          notes: form.notes || undefined,
        };
        await applicantApi.update(editingId, payload);
        if (resumeFile) {
          const fd = new FormData();
          fd.append("resume", resumeFile);
          await applicantApi.uploadResume(editingId, fd);
        }
        toast.success("Applicant updated");
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v !== "") fd.append(k, v);
        });
        if (resumeFile) fd.append("resume", resumeFile);
        await applicantApi.create(fd);
        toast.success("Applicant added");
      }
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm());
      setResumeFile(null);
      fetchApplicants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save applicant");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Archive this applicant?")) return;
    try {
      await applicantApi.archive(id);
      toast.success("Applicant archived");
      fetchApplicants();
    } catch {
      toast.error("Failed to archive");
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">CV Bank</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={() => navigate("/hr/hiring")}>
            Back to Hiring
          </Button>
          <Button variant="primary" onClick={openCreate}>
            <FaPlus className="me-2" />
            Add applicant
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <InputGroup className="mb-3" style={{ maxWidth: 320 }}>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search by name, email, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Experience</th>
                  <th>Resume</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {applicants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No applicants in CV bank
                    </td>
                  </tr>
                ) : (
                  applicants.map((a) => (
                    <tr key={a._id}>
                      <td>{a.name}</td>
                      <td>{a.email}</td>
                      <td>{a.source}</td>
                      <td>{a.experienceYears != null ? `${a.experienceYears} yrs` : "—"}</td>
                      <td>
                        {a.resumeUrl ? (
                          <a href={a.resumeUrl} target="_blank" rel="noreferrer">
                            <FaFileAlt /> View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Badge
                          bg={
                            a.status === "hired"
                              ? "success"
                              : a.status === "active"
                                ? "primary"
                                : "secondary"
                          }
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td>
                        {a.status === "active" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="me-1"
                              onClick={() => openEdit(a)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleArchive(a._id)}
                            >
                              <FaTrash />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setEditingId(null);
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? "Edit applicant" : "Add applicant"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Name *</Form.Label>
                <Form.Control
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Source</Form.Label>
                <Form.Select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Experience (years)</Form.Label>
                <Form.Control
                  type="number"
                  value={form.experienceYears}
                  onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Expected CTC</Form.Label>
                <Form.Control
                  value={form.expectedCtc}
                  onChange={(e) => setForm({ ...form, expectedCtc: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Skills</Form.Label>
                <Form.Control
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>{editingId ? "Replace resume (optional)" : "Resume (PDF/DOC)"}</Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : editingId ? "Update" : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ApplicantCVBank;
