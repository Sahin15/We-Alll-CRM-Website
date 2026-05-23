import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Card,
  Table,
  Button,
  Badge,
  Form,
  Row,
  Col,
  Spinner,
  InputGroup,
  Modal,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaFilePdf, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { offerApi } from "../../api/offerApi";
import { hiringRequestApi } from "../../api/hiringRequestApi";
import api from "../../services/api";
import { openOfferLetterPdf } from "../../utils/openOfferLetterPdf";
import OfferLetterEditor from "../../components/hr/OfferLetterEditor";

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
  hiringRequestId: "",
});

const HiringOfferLetters = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [hiringRequests, setHiringRequests] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageOfferId, setManageOfferId] = useState(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await offerApi.list(params);
      setOffers(res.data || []);
    } catch {
      toast.error("Failed to load offer letters");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOffers();
    api.get("/departments").then((r) => setDepartments(r.data || [])).catch(() => {});
    hiringRequestApi
      .list()
      .then((r) => setHiringRequests(r.data || []))
      .catch(() => {});
  }, [fetchOffers]);

  const openOffer = (offer) => {
    const appId = offer.hiringApplicationId?._id || offer.hiringApplicationId;
    if (appId) {
      navigate(`/hr/hiring/applications/${appId}?tab=offer`);
      return;
    }
    setManageOfferId(String(offer._id));
    setShowManageModal(true);
  };

  const openCreateModal = () => {
    setCreateForm(emptyForm());
    setShowCreateModal(true);
  };

  const buildCreatePayload = () => ({
    ...createForm,
    ctc: createForm.ctc ? Number(createForm.ctc) : undefined,
    proposedDepartment: createForm.proposedDepartment || undefined,
    hiringRequestId: createForm.hiringRequestId || undefined,
  });

  const handleCreate = async (generatePdf = false) => {
    if (!createForm.candidateName.trim() || !createForm.candidateEmail.trim()) {
      toast.error("Candidate name and email are required");
      return;
    }
    try {
      setCreating(true);
      const res = await offerApi.create(buildCreatePayload());
      const newOffer = res.data;
      const offerId = newOffer?._id;

      if (generatePdf && offerId) {
        await offerApi.generate(offerId);
        toast.success("Offer created and PDF generated");
      } else {
        toast.success("Offer created");
      }

      setShowCreateModal(false);
      setCreateForm(emptyForm());
      await fetchOffers();

      if (offerId) {
        setManageOfferId(String(offerId));
        setShowManageModal(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create offer");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <Button
        variant="link"
        className="p-0 mb-3 text-decoration-none"
        onClick={() => navigate("/hr/hiring")}
      >
        <FaArrowLeft className="me-1" />
        Hiring overview
      </Button>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h2 className="mb-1">Offer letters</h2>
          <p className="text-muted mb-0">
            Create, edit, and generate offer letter PDFs. Letters from the interview pipeline also
            appear here.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <FaPlus className="me-2" />
          Create offer letter
        </Button>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col md={8}>
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
            <p className="text-muted text-center py-4 mb-0">
              No offer letters yet. Click <strong>Create offer letter</strong> to get started.
            </p>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Offer #</th>
                  <th>Candidate</th>
                  <th>Hiring request</th>
                  <th>Status</th>
                  <th>PDF</th>
                  <th></th>
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
                      <Badge bg={STATUS_VARIANT[o.status] || "secondary"}>{o.status}</Badge>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-success"
                        title="View offer letter PDF"
                        onClick={() => openOfferLetterPdf(o._id)}
                      >
                        <FaFilePdf />
                      </Button>
                    </td>
                    <td>
                      <Button size="sm" variant="primary" onClick={() => openOffer(o)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Create offer letter</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Candidate name *</Form.Label>
                <Form.Control
                  value={createForm.candidateName}
                  onChange={(e) => setCreateForm({ ...createForm, candidateName: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={createForm.candidateEmail}
                  onChange={(e) => setCreateForm({ ...createForm, candidateEmail: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={createForm.candidatePhone}
                  onChange={(e) => setCreateForm({ ...createForm, candidatePhone: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Designation</Form.Label>
                <Form.Control
                  value={createForm.proposedDesignation}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, proposedDesignation: e.target.value })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Department</Form.Label>
                <Form.Select
                  value={createForm.proposedDepartment}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, proposedDepartment: e.target.value })
                  }
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
                <Form.Label>Link to hiring request (optional)</Form.Label>
                <Form.Select
                  value={createForm.hiringRequestId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, hiringRequestId: e.target.value })
                  }
                >
                  <option value="">None</option>
                  {hiringRequests.map((hr) => (
                    <option key={hr._id} value={hr._id}>
                      {hr.requestNumber} — {hr.designation}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Employment type</Form.Label>
                <Form.Select
                  value={createForm.employmentType}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, employmentType: e.target.value })
                  }
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
                  value={createForm.proposedJoiningDate}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, proposedJoiningDate: e.target.value })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>CTC (number)</Form.Label>
                <Form.Control
                  type="number"
                  value={createForm.ctc}
                  onChange={(e) => setCreateForm({ ...createForm, ctc: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>CTC (display text)</Form.Label>
                <Form.Control
                  placeholder="e.g. ₹6,00,000 per annum"
                  value={createForm.ctcDisplay}
                  onChange={(e) => setCreateForm({ ...createForm, ctcDisplay: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Probation</Form.Label>
                <Form.Control
                  value={createForm.probationPeriod}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, probationPeriod: e.target.value })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Notice period</Form.Label>
                <Form.Control
                  value={createForm.noticePeriod}
                  onChange={(e) => setCreateForm({ ...createForm, noticePeriod: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Work location</Form.Label>
                <Form.Control
                  value={createForm.workLocation}
                  onChange={(e) => setCreateForm({ ...createForm, workLocation: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Additional clause (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={createForm.customClause}
                  onChange={(e) => setCreateForm({ ...createForm, customClause: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
            Cancel
          </Button>
          <Button variant="outline-primary" onClick={() => handleCreate(false)} disabled={creating}>
            {creating ? <Spinner size="sm" animation="border" /> : "Save as draft"}
          </Button>
          <Button variant="primary" onClick={() => handleCreate(true)} disabled={creating}>
            {creating ? (
              <Spinner size="sm" animation="border" />
            ) : (
              <>
                <FaFilePdf className="me-1" />
                Save &amp; generate PDF
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showManageModal}
        onHide={() => {
          setShowManageModal(false);
          setManageOfferId(null);
        }}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Manage offer letter</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {manageOfferId && (
            <OfferLetterEditor
              offerId={manageOfferId}
              onOfferUpdated={fetchOffers}
              onOfferDeleted={() => {
                setShowManageModal(false);
                setManageOfferId(null);
                fetchOffers();
              }}
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default HiringOfferLetters;
