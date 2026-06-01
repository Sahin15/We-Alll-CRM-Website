import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Badge,
  Modal,
  Form,
  Row,
  Col,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FaFilePdf,
  FaEye,
  FaUserPlus,
  FaTrash,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { offerApi } from "../../api/offerApi";
import api from "../../services/api";
import { openOfferLetterPdf } from "../../utils/openOfferLetterPdf";

const STATUS_VARIANT = {
  draft: "secondary",
  generated: "info",
  sent: "primary",
  accepted: "success",
  declined: "danger",
  expired: "warning",
  converted: "dark",
};

const offerToForm = (offer) => ({
  candidateName: offer.candidateName || "",
  candidateEmail: offer.candidateEmail || "",
  candidatePhone: offer.candidatePhone || "",
  proposedDesignation: offer.proposedDesignation || "",
  proposedDepartment: offer.proposedDepartment?._id || offer.proposedDepartment || "",
  proposedJoiningDate: offer.proposedJoiningDate
    ? new Date(offer.proposedJoiningDate).toISOString().split("T")[0]
    : "",
  employmentType: offer.employmentType || "full-time",
  ctc: offer.ctc ?? "",
  ctcDisplay: offer.ctcDisplay || "",
  probationPeriod: offer.probationPeriod || "6 months",
  noticePeriod: offer.noticePeriod || "30 days",
  workLocation: offer.workLocation || "Kolkata Office",
  offerValidTill: offer.offerValidTill
    ? new Date(offer.offerValidTill).toISOString().split("T")[0]
    : "",
  notes: offer.notes || "",
  customClause: offer.variableSnapshot?.customClause || "",
});

/**
 * Inline offer letter edit, PDF generate, convert, and delete (hiring pipeline).
 * @param {{ offerId: string, onOfferUpdated?: () => void, onOfferDeleted?: () => void }} props
 */
const OfferLetterEditor = ({ offerId, onOfferUpdated, onOfferDeleted }) => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [form, setForm] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({
    password: "",
    employeeId: "",
    designation: "",
    joiningDate: "",
  });
  const [converting, setConverting] = useState(false);

  const loadOffer = useCallback(async () => {
    if (!offerId) return;
    try {
      setLoading(true);
      const res = await offerApi.get(offerId);
      setOffer(res.data);
      setForm(offerToForm(res.data));
    } catch {
      toast.error("Failed to load offer");
      setOffer(null);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    loadOffer();
    api.get("/departments").then((r) => setDepartments(r.data || [])).catch(() => {});
  }, [loadOffer]);

  const handleSave = async () => {
    if (!form?.candidateName?.trim() || !form?.candidateEmail?.trim()) {
      toast.error("Candidate name and email are required");
      return;
    }
    try {
      setSaving(true);
      await offerApi.update(offerId, {
        ...form,
        ctc: form.ctc ? Number(form.ctc) : undefined,
      });
      toast.success("Offer saved");
      await loadOffer();
      onOfferUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => openOfferLetterPdf(offerId);

  const handleGenerate = async () => {
    try {
      setGeneratingPdf(true);
      await offerApi.generate(offerId);
      toast.success("Offer letter PDF generated");
      await loadOffer();
      onOfferUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDelete = async () => {
    if (!offer || offer.status === "converted") return;
    const label = offer.offerNumber || offer.candidateName || "this offer";
    if (
      !window.confirm(
        `Delete offer ${label}? This removes the offer record${offer.documentUrl ? " and its PDF" : ""}.`
      )
    ) {
      return;
    }
    try {
      setDeleting(true);
      await offerApi.delete(offerId);
      toast.success("Offer deleted");
      onOfferDeleted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete offer");
    } finally {
      setDeleting(false);
    }
  };

  const openConvert = () => {
    setConvertForm({
      password: "",
      employeeId: "",
      designation: offer?.proposedDesignation || "",
      joiningDate: offer?.proposedJoiningDate
        ? new Date(offer.proposedJoiningDate).toISOString().split("T")[0]
        : "",
    });
    setShowConvertModal(true);
  };

  const handleConvert = async () => {
    if (!convertForm.password || convertForm.password.length < 6) {
      toast.error("Set a password (min 6 characters) for the new employee account");
      return;
    }
    try {
      setConverting(true);
      const res = await offerApi.convertToEmployee(offerId, convertForm);
      toast.success("Employee created — offer letter linked");
      setShowConvertModal(false);
      await loadOffer();
      onOfferUpdated?.();
      const userId = res.data?.user?._id;
      if (userId) navigate(`/employees/${userId}/profile`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to convert");
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!offer || !form) {
    return <p className="text-muted mb-0">Offer not found.</p>;
  }

  const isConverted = offer.status === "converted";

  return (
    <>
      <Card className="border-0 shadow-sm">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-white">
          <div>
            <span className="fw-semibold">{offer.offerNumber}</span>
            <Badge bg={STATUS_VARIANT[offer.status] || "secondary"} className="ms-2">
              {offer.status}
            </Badge>
          </div>
          <div className="d-flex flex-wrap gap-1">
            <Button size="sm" variant="primary" onClick={handleSave} disabled={saving || isConverted}>
              {saving ? <Spinner size="sm" animation="border" /> : "Save"}
            </Button>
            <Button size="sm" variant="outline-info" onClick={handlePreview} title="Preview">
              <FaEye />
            </Button>
            {!isConverted && (
              <Button
                size="sm"
                variant="outline-primary"
                onClick={handleGenerate}
                disabled={generatingPdf}
                title="Generate PDF"
              >
                {generatingPdf ? <Spinner size="sm" animation="border" /> : <FaFilePdf />}
              </Button>
            )}
            {offer.documentUrl && (
              <Button
                size="sm"
                variant="outline-success"
                title="View saved PDF (same as hiring pipeline template)"
                onClick={() => openOfferLetterPdf(offerId)}
              >
                View PDF
              </Button>
            )}
            {!isConverted && offer.documentUrl && (
              <Button size="sm" variant="success" onClick={openConvert} title="Convert to employee">
                <FaUserPlus />
              </Button>
            )}
            {offer.convertedUserId && (
              <Button
                size="sm"
                variant="link"
                onClick={() =>
                  navigate(
                    `/employees/${offer.convertedUserId._id || offer.convertedUserId}/profile`
                  )
                }
              >
                Employee profile
              </Button>
            )}
            {!isConverted && (
              <Button
                size="sm"
                variant="outline-danger"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete offer"
              >
                {deleting ? <Spinner size="sm" animation="border" /> : <FaTrash />}
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Candidate name *</Form.Label>
                <Form.Control
                  value={form.candidateName}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={form.candidateEmail}
                  disabled
                  onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={form.candidatePhone}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Designation</Form.Label>
                <Form.Control
                  value={form.proposedDesignation}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, proposedDesignation: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Department</Form.Label>
                <Form.Select
                  value={form.proposedDepartment}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, proposedDepartment: e.target.value })}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Employment type</Form.Label>
                <Form.Select
                  value={form.employmentType}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="intern">Intern</option>
                  <option value="contract">Contract</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Proposed joining date</Form.Label>
                <Form.Control
                  type="date"
                  value={form.proposedJoiningDate}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, proposedJoiningDate: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Offer valid till</Form.Label>
                <Form.Control
                  type="date"
                  value={form.offerValidTill}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, offerValidTill: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>CTC (number)</Form.Label>
                <Form.Control
                  type="number"
                  value={form.ctc}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, ctc: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>CTC (display text)</Form.Label>
                <Form.Control
                  placeholder="e.g. ₹6,00,000 per annum"
                  value={form.ctcDisplay}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, ctcDisplay: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Probation</Form.Label>
                <Form.Control
                  value={form.probationPeriod}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, probationPeriod: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Notice period</Form.Label>
                <Form.Control
                  value={form.noticePeriod}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Work location</Form.Label>
                <Form.Control
                  value={form.workLocation}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, workLocation: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Additional clause (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.customClause}
                  disabled={isConverted}
                  onChange={(e) => setForm({ ...form, customClause: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Modal show={showConvertModal} onHide={() => setShowConvertModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Convert to employee</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted">
            Creates an employee account for <strong>{offer.candidateName}</strong> and attaches the
            offer letter to their profile.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Login password *</Form.Label>
            <Form.Control
              type="password"
              value={convertForm.password}
              onChange={(e) => setConvertForm({ ...convertForm, password: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Employee ID (optional)</Form.Label>
            <Form.Control
              value={convertForm.employeeId}
              onChange={(e) => setConvertForm({ ...convertForm, employeeId: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Designation</Form.Label>
            <Form.Control
              value={convertForm.designation}
              onChange={(e) => setConvertForm({ ...convertForm, designation: e.target.value })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Joining date</Form.Label>
            <Form.Control
              type="date"
              value={convertForm.joiningDate}
              onChange={(e) => setConvertForm({ ...convertForm, joiningDate: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConvertModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleConvert} disabled={converting}>
            {converting ? <Spinner size="sm" /> : "Create employee"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default OfferLetterEditor;
