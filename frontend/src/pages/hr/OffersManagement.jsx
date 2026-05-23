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
  Spinner,
  InputGroup,
} from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaPlus,
  FaFilePdf,
  FaEye,
  FaUserPlus,
  FaSearch,
  FaEdit,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { offerApi } from "../../api/offerApi";
import { hiringRequestApi } from "../../api/hiringRequestApi";
import api from "../../services/api";

const STATUS_VARIANT = {
  draft: "secondary",
  generated: "info",
  sent: "primary",
  accepted: "success",
  declined: "danger",
  expired: "warning",
  converted: "dark",
};

const emptyForm = () => ({
  candidateName: "",
  candidateEmail: "",
  candidatePhone: "",
  proposedDesignation: "",
  proposedDepartment: "",
  proposedJoiningDate: "",
  employmentType: "full-time",
  ctc: "",
  ctcDisplay: "",
  probationPeriod: "6 months",
  noticePeriod: "30 days",
  workLocation: "Kolkata Office",
  offerValidTill: "",
  notes: "",
  customClause: "",
});

const OffersManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hiringRequestFilter, setHiringRequestFilter] = useState("");
  const [hiringRequests, setHiringRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertOffer, setConvertOffer] = useState(null);
  const [convertForm, setConvertForm] = useState({
    password: "",
    employeeId: "",
    designation: "",
    joiningDate: "",
  });
  const [converting, setConverting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (hiringRequestFilter) params.hiringRequestId = hiringRequestFilter;
      const res = await offerApi.list(params);
      setOffers(res.data || []);
    } catch (err) {
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, hiringRequestFilter]);

  useEffect(() => {
    fetchOffers();
    api.get("/departments").then((r) => setDepartments(r.data || [])).catch(() => {});
    hiringRequestApi
      .list()
      .then((r) => setHiringRequests(r.data || []))
      .catch(() => setHiringRequests([]));
  }, [fetchOffers]);

  const openCreate = () => {
    setEditingOffer(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (offer) => {
    setEditingOffer(offer);
    setForm({
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
      workLocation: offer.workLocation || "",
      offerValidTill: offer.offerValidTill
        ? new Date(offer.offerValidTill).toISOString().split("T")[0]
        : "",
      notes: offer.notes || "",
      customClause: offer.variableSnapshot?.customClause || "",
    });
    setShowModal(true);
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    offerApi
      .get(editId)
      .then((res) => {
        if (res.data) openEdit(res.data);
        const next = new URLSearchParams(searchParams);
        next.delete("edit");
        setSearchParams(next, { replace: true });
      })
      .catch(() => toast.error("Could not load offer from hiring pipeline"));
  }, [searchParams, setSearchParams]);

  const handleSave = async () => {
    if (!form.candidateName.trim() || !form.candidateEmail.trim()) {
      toast.error("Candidate name and email are required");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        ctc: form.ctc ? Number(form.ctc) : undefined,
      };
      if (editingOffer) {
        await offerApi.update(editingOffer._id, payload);
        toast.success("Offer updated");
      } else {
        await offerApi.create(payload);
        toast.success("Offer created");
      }
      setShowModal(false);
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (offer) => {
    try {
      const res = await offerApi.preview(offer._id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch (err) {
      toast.error("Failed to preview offer letter");
    }
  };

  const handleGenerate = async (offer) => {
    try {
      await offerApi.generate(offer._id);
      toast.success("Offer letter generated");
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate");
    }
  };

  const openConvert = (offer) => {
    setConvertOffer(offer);
    setConvertForm({
      password: "",
      employeeId: "",
      designation: offer.proposedDesignation || "",
      joiningDate: offer.proposedJoiningDate
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
      const res = await offerApi.convertToEmployee(convertOffer._id, convertForm);
      toast.success("Employee created — offer letter linked");
      setShowConvertModal(false);
      fetchOffers();
      const userId = res.data?.user?._id;
      if (userId) {
        navigate(`/employees/${userId}/profile`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to convert");
    } finally {
      setConverting(false);
    }
  };

  const downloadOfferPdf = (offer) => {
    if (offer.documentUrl) {
      window.open(offer.documentUrl, "_blank");
    } else {
      toast.info("Generate the offer letter first");
    }
  };

  const handleDelete = async (offer) => {
    if (!offer?._id) return;
    if (offer.status === "converted") {
      toast.error("Cannot delete an offer that was converted to an employee");
      return;
    }
    const label = offer.offerNumber || offer.candidateName || "this offer";
    if (
      !window.confirm(
        `Delete offer ${label}? This removes the offer record${offer.documentUrl ? " and its PDF from storage" : ""}. This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(offer._id);
      await offerApi.delete(offer._id);
      toast.success("Offer deleted");
      if (editingOffer?._id === offer._id) {
        setShowModal(false);
        setEditingOffer(null);
        setForm(emptyForm());
      }
      fetchOffers();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 404) {
        toast.error(msg || "Delete failed — offer API not found. Restart the backend server.");
      } else {
        toast.error(msg || err.message || "Failed to delete offer");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Offer Letters</h4>
          <p className="text-muted mb-0 small">
            Create offers before an employee profile exists. Convert to employee when they accept.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <FaPlus className="me-2" />
          New Offer
        </Button>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search name, email, offer #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="generated">Generated</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="converted">Converted</option>
                <option value="declined">Declined</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={hiringRequestFilter}
                onChange={(e) => setHiringRequestFilter(e.target.value)}
              >
                <option value="">All hiring requests</option>
                {hiringRequests.map((hr) => (
                  <option key={hr._id} value={hr._id}>
                    {hr.requestNumber} — {hr.designation}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : offers.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">No offers yet. Create your first offer.</p>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Offer #</th>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Hiring request</th>
                  <th>Joining</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o._id}>
                    <td className="fw-semibold">{o.offerNumber}</td>
                    <td>
                      <div>{o.candidateName}</div>
                      <small className="text-muted">{o.candidateEmail}</small>
                    </td>
                    <td>{o.proposedDesignation || "—"}</td>
                    <td>
                      {o.hiringRequestId?.requestNumber ? (
                        <Button
                          size="sm"
                          variant="link"
                          className="p-0"
                          onClick={() =>
                            navigate(
                              `/hr/hiring/requests/${o.hiringRequestId._id || o.hiringRequestId}`
                            )
                          }
                        >
                          {o.hiringRequestId.requestNumber}
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {o.proposedJoiningDate
                        ? new Date(o.proposedJoiningDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td>
                      <Badge bg={STATUS_VARIANT[o.status] || "secondary"}>
                        {o.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <Button size="sm" variant="outline-secondary" title="Edit" onClick={() => openEdit(o)}>
                          <FaEdit />
                        </Button>
                        <Button size="sm" variant="outline-info" title="Preview" onClick={() => handlePreview(o)}>
                          <FaEye />
                        </Button>
                        {o.status !== "converted" && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            title="Generate PDF"
                            onClick={() => handleGenerate(o)}
                          >
                            <FaFilePdf />
                          </Button>
                        )}
                        {o.documentUrl && (
                          <Button
                            size="sm"
                            variant="outline-success"
                            title="Download"
                            onClick={() => downloadOfferPdf(o)}
                          >
                            PDF
                          </Button>
                        )}
                        {o.status !== "converted" && o.documentUrl && (
                          <Button
                            size="sm"
                            variant="success"
                            title="Convert to employee"
                            onClick={() => openConvert(o)}
                          >
                            <FaUserPlus />
                          </Button>
                        )}
                        {o.convertedUserId && (
                          <Button
                            size="sm"
                            variant="link"
                            onClick={() =>
                              navigate(
                                `/employees/${o.convertedUserId._id || o.convertedUserId}/profile`
                              )
                            }
                          >
                            Profile
                          </Button>
                        )}
                        {o.status !== "converted" && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            title="Delete offer"
                            onClick={() => handleDelete(o)}
                            disabled={deletingId === o._id}
                          >
                            {deletingId === o._id ? (
                              <Spinner size="sm" animation="border" />
                            ) : (
                              <FaTrash />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Create / Edit modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingOffer ? "Edit Offer" : "New Offer"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Candidate name *</Form.Label>
                <Form.Control
                  value={form.candidateName}
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
                  onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
                  disabled={!!editingOffer}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={form.candidatePhone}
                  onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Designation</Form.Label>
                <Form.Control
                  value={form.proposedDesignation}
                  onChange={(e) => setForm({ ...form, proposedDesignation: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Department</Form.Label>
                <Form.Select
                  value={form.proposedDepartment}
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
                  onChange={(e) => setForm({ ...form, ctcDisplay: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Probation</Form.Label>
                <Form.Control
                  value={form.probationPeriod}
                  onChange={(e) => setForm({ ...form, probationPeriod: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Notice period</Form.Label>
                <Form.Control
                  value={form.noticePeriod}
                  onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Work location</Form.Label>
                <Form.Control
                  value={form.workLocation}
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
                  onChange={(e) => setForm({ ...form, customClause: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Convert modal */}
      <Modal show={showConvertModal} onHide={() => setShowConvertModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Convert to Employee</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted">
            Creates an employee account for <strong>{convertOffer?.candidateName}</strong> and
            attaches the generated offer letter to their profile.
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
              placeholder="WA-26-0001"
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
            {converting ? <Spinner size="sm" /> : "Create Employee"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default OffersManagement;
