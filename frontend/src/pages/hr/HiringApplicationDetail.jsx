import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Badge,
  Button,
  Table,
  Form,
  Modal,
  Spinner,
  Tabs,
  Tab,
  Alert,
  ListGroup,
} from "react-bootstrap";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarPlus,
  FaCheck,
  FaTimes,
  FaFileAlt,
  FaUserCheck,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { hiringApplicationApi } from "../../api/hiringApplicationApi";
import api from "../../services/api";
import {
  STAGE_VARIANT,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_STATUS_VARIANT,
  PIPELINE_STEPS,
  stageLabel,
  formatDateTime,
  buildApplicationTimeline,
} from "../../utils/hiringPipeline";
import OfferLetterEditor from "../../components/hr/OfferLetterEditor";

const emptyScheduleForm = () => ({
  title: "",
  scheduledAt: "",
  durationMinutes: 45,
  mode: "video",
  locationOrLink: "",
  interviewerIds: [],
});

const emptyCompleteForm = () => ({
  remarks: "",
  rating: "",
  recommendation: "proceed",
  status: "completed",
});

const HiringApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "overview");
  const [application, setApplication] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeInterview, setActiveInterview] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm());
  const [completeForm, setCompleteForm] = useState(emptyCompleteForm());
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hiringApplicationApi.get(id);
      setApplication(res.data);
    } catch {
      toast.error("Failed to load application");
      navigate("/hr/hiring/requests");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchApplication();
    api
      .get("/users")
      .then((r) => setUsers(r.data || []))
      .catch(() => setUsers([]));
  }, [fetchApplication]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const timeline = useMemo(
    () => buildApplicationTimeline(application),
    [application]
  );

  const requestId =
    application?.hiringRequest?._id || application?.hiringRequest;

  const handleStageChange = async (stage, extra = {}) => {
    try {
      setSaving(true);
      await hiringApplicationApi.updateStage(id, { stage, ...extra });
      toast.success(`Moved to ${stageLabel(stage)}`);
      fetchApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update stage");
    } finally {
      setSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleForm.scheduledAt) {
      toast.error("Interview date and time are required");
      return;
    }
    try {
      setSaving(true);
      await hiringApplicationApi.scheduleInterview(id, {
        ...scheduleForm,
        scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
        interviewerIds: scheduleForm.interviewerIds,
      });
      toast.success("Interview scheduled");
      setShowScheduleModal(false);
      setScheduleForm(emptyScheduleForm());
      fetchApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule interview");
    } finally {
      setSaving(false);
    }
  };

  const openCompleteModal = (interview) => {
    setActiveInterview(interview);
    setCompleteForm(emptyCompleteForm());
    setShowCompleteModal(true);
  };

  const handleCompleteInterview = async () => {
    if (!completeForm.remarks.trim()) {
      toast.error("Interview remarks are required");
      return;
    }
    try {
      setSaving(true);
      await hiringApplicationApi.completeInterview(id, activeInterview._id, {
        remarks: completeForm.remarks,
        rating: completeForm.rating ? Number(completeForm.rating) : undefined,
        recommendation: completeForm.recommendation,
        status: completeForm.status,
      });
      toast.success("Interview updated");
      setShowCompleteModal(false);
      setActiveInterview(null);
      fetchApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save interview");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    await handleStageChange("rejected", {
      decisionReason: rejectReason,
      notes: rejectNotes,
    });
    setShowRejectModal(false);
    setRejectReason("");
    setRejectNotes("");
  };

  const handleCreateOffer = async () => {
    try {
      setSaving(true);
      await hiringApplicationApi.createOffer(id, {});
      toast.success("Offer created — edit and generate the letter below");
      await fetchApplication();
      setActiveTab("offer");
      setSearchParams({ tab: "offer" }, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create offer");
    } finally {
      setSaving(false);
    }
  };

  const offerId = application?.offerId?._id || application?.offerId;

  const handleTabSelect = (key) => {
    if (!key) return;
    setActiveTab(key);
    if (key === "overview") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: key }, { replace: true });
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!application) return null;

  const applicant = application.applicant;
  const stage = application.stage;
  const canAct = !["rejected", "withdrawn"].includes(stage);

  const currentStepIndex = PIPELINE_STEPS.indexOf(stage);

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <Button
            variant="link"
            className="p-0 mb-2 text-decoration-none"
            onClick={() =>
              requestId
                ? navigate(`/hr/hiring/requests/${requestId}`)
                : navigate("/hr/hiring/requests")
            }
          >
            <FaArrowLeft className="me-1" />
            Back to request
          </Button>
          <h2 className="mb-1">{applicant?.name}</h2>
          <p className="text-muted mb-0">
            {applicant?.email}
            {application.hiringRequest?.requestNumber && (
              <>
                {" "}
                · {application.hiringRequest.requestNumber} —{" "}
                {application.hiringRequest.designation}
              </>
            )}
          </p>
        </div>
        <Badge bg={STAGE_VARIANT[stage] || "secondary"} className="fs-6">
          {stageLabel(stage)}
        </Badge>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
            {PIPELINE_STEPS.map((step, index) => {
              const done = currentStepIndex > index;
              const active = stage === step;
              return (
                <div key={step} className="text-center flex-fill" style={{ minWidth: 100 }}>
                  <div
                    className={`rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center ${
                      done || active ? "bg-primary text-white" : "bg-light text-muted"
                    }`}
                    style={{ width: 32, height: 32, fontSize: 14 }}
                  >
                    {done ? <FaCheck size={12} /> : index + 1}
                  </div>
                  <small className={active ? "fw-semibold text-primary" : "text-muted"}>
                    {stageLabel(step)}
                  </small>
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {application.decisionReason && (
        <Alert variant="danger">
          <strong>Rejection reason:</strong> {application.decisionReason}
        </Alert>
      )}

      {canAct && (
        <Card className="mb-4 border-primary">
          <Card.Body className="d-flex flex-wrap gap-2">
            {stage === "sourced" && (
              <Button
                variant="info"
                disabled={saving}
                onClick={() => handleStageChange("shortlisted", { notes: "Shortlisted" })}
              >
                Shortlist
              </Button>
            )}
            {["shortlisted", "interviewed"].includes(stage) && (
              <Button variant="warning" onClick={() => setShowScheduleModal(true)}>
                <FaCalendarPlus className="me-1" />
                Schedule interview
              </Button>
            )}
            {stage === "interviewed" && (
              <Button
                variant="success"
                disabled={saving}
                onClick={() => handleStageChange("selected", { notes: "Selected after interview" })}
              >
                <FaUserCheck className="me-1" />
                Mark selected
              </Button>
            )}
            {stage === "selected" && !offerId && (
              <Button variant="primary" onClick={handleCreateOffer} disabled={saving}>
                {saving ? "Creating…" : "Create offer letter"}
              </Button>
            )}
            {offerId && (
              <Button variant="outline-primary" onClick={() => handleTabSelect("offer")}>
                <FaFileAlt className="me-1" />
                Offer letter
              </Button>
            )}
            <Button variant="outline-danger" onClick={() => setShowRejectModal(true)}>
              Reject
            </Button>
          </Card.Body>
        </Card>
      )}

      <Tabs activeKey={activeTab} onSelect={handleTabSelect} className="mb-3">
        <Tab eventKey="overview" title="Overview">
          <Row className="g-3">
            <Col md={6}>
              <Card>
                <Card.Header>Candidate</Card.Header>
                <Card.Body>
                  <p className="mb-1">
                    <strong>Phone:</strong> {applicant?.phone || "—"}
                  </p>
                  <p className="mb-1">
                    <strong>Experience:</strong>{" "}
                    {applicant?.experienceYears != null
                      ? `${applicant.experienceYears} years`
                      : "—"}
                  </p>
                  <p className="mb-1">
                    <strong>Skills:</strong> {applicant?.skills || "—"}
                  </p>
                  <p className="mb-0">
                    <strong>Source:</strong> {applicant?.source || "—"}
                  </p>
                  {applicant?.resumeUrl && (
                    <Button
                      variant="link"
                      className="p-0 mt-2"
                      href={applicant.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FaFileAlt className="me-1" />
                      View resume
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>Interview summary</Card.Header>
                <Card.Body>
                  {(application.interviews || []).length === 0 ? (
                    <p className="text-muted mb-0">No interviews scheduled yet</p>
                  ) : (
                    <ListGroup variant="flush">
                      {application.interviews.map((iv) => (
                        <ListGroup.Item key={iv._id} className="px-0">
                          <div className="d-flex justify-content-between">
                            <span>
                              Round {iv.round}: {iv.title}
                            </span>
                            <Badge bg={INTERVIEW_STATUS_VARIANT[iv.status] || "secondary"}>
                              {iv.status}
                            </Badge>
                          </div>
                          <small className="text-muted">
                            {formatDateTime(iv.scheduledAt)}
                          </small>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="interviews" title={`Interviews (${application.interviews?.length || 0})`}>
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Title</th>
                    <th>When</th>
                    <th>Mode</th>
                    <th>Interviewers</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(application.interviews || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No interviews yet
                      </td>
                    </tr>
                  ) : (
                    application.interviews.map((iv) => (
                      <tr key={iv._id}>
                        <td>{iv.round}</td>
                        <td>{iv.title}</td>
                        <td>{formatDateTime(iv.scheduledAt)}</td>
                        <td>{INTERVIEW_MODE_LABELS[iv.mode] || iv.mode}</td>
                        <td>
                          {(iv.interviewers || [])
                            .map((u) => u.name || u)
                            .join(", ") || "—"}
                        </td>
                        <td>
                          <Badge bg={INTERVIEW_STATUS_VARIANT[iv.status] || "secondary"}>
                            {iv.status}
                          </Badge>
                        </td>
                        <td>{iv.remarks || "—"}</td>
                        <td>
                          {iv.status === "scheduled" && canAct && (
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => openCompleteModal(iv)}
                            >
                              Add remarks
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {offerId && (
          <Tab eventKey="offer" title="Offer letter">
            <OfferLetterEditor
              offerId={String(offerId)}
              onOfferUpdated={fetchApplication}
              onOfferDeleted={() => {
                fetchApplication();
                setActiveTab("overview");
                setSearchParams({}, { replace: true });
              }}
            />
          </Tab>
        )}

        <Tab eventKey="timeline" title="Timeline">
          <Card>
            <Card.Body>
              {timeline.length === 0 ? (
                <p className="text-muted mb-0">No activity yet</p>
              ) : (
                <ListGroup variant="flush">
                  {timeline.map((event) => (
                    <ListGroup.Item key={event.id}>
                      <div className="d-flex justify-content-between">
                        <strong>{event.title}</strong>
                        <small className="text-muted">{formatDateTime(event.at)}</small>
                      </div>
                      {event.by && (
                        <small className="text-muted d-block">By {event.by}</small>
                      )}
                      {event.notes && <div className="mt-1">{event.notes}</div>}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Schedule interview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Title</Form.Label>
                <Form.Control
                  placeholder="e.g. HR screening, Technical round"
                  value={scheduleForm.title}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, title: e.target.value })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Date & time *</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Mode</Form.Label>
                <Form.Select
                  value={scheduleForm.mode}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, mode: e.target.value })
                  }
                >
                  {Object.entries(INTERVIEW_MODE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Duration (minutes)</Form.Label>
                <Form.Control
                  type="number"
                  min={15}
                  max={480}
                  value={scheduleForm.durationMinutes}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Location / meeting link</Form.Label>
                <Form.Control
                  value={scheduleForm.locationOrLink}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, locationOrLink: e.target.value })
                  }
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Interviewers</Form.Label>
                <Form.Select
                  multiple
                  value={scheduleForm.interviewerIds}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      interviewerIds: Array.from(e.target.selectedOptions, (o) => o.value),
                    })
                  }
                  style={{ minHeight: 120 }}
                >
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text>Hold Ctrl/Cmd to select multiple</Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={handleSchedule}>
            {saving ? "Saving..." : "Schedule"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Interview remarks — {activeInterview?.title} (Round {activeInterview?.round})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Remarks *</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={completeForm.remarks}
              onChange={(e) =>
                setCompleteForm({ ...completeForm, remarks: e.target.value })
              }
              placeholder="Interview feedback, strengths, concerns..."
            />
          </Form.Group>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Rating (1–5)</Form.Label>
                <Form.Select
                  value={completeForm.rating}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, rating: e.target.value })
                  }
                >
                  <option value="">Optional</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Recommendation</Form.Label>
                <Form.Select
                  value={completeForm.recommendation}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, recommendation: e.target.value })
                  }
                >
                  <option value="proceed">Proceed</option>
                  <option value="hold">Hold</option>
                  <option value="reject">Reject</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Outcome</Form.Label>
                <Form.Select
                  value={completeForm.status}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, status: e.target.value })
                  }
                >
                  <option value="completed">Completed</option>
                  <option value="no_show">No show</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
            Cancel
          </Button>
          <Button variant="success" disabled={saving} onClick={handleCompleteInterview}>
            {saving ? "Saving..." : "Save remarks"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject candidate</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Reason *</Form.Label>
            <Form.Control
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this candidate being rejected?"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Internal notes (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={saving} onClick={handleReject}>
            <FaTimes className="me-1" />
            Reject
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default HiringApplicationDetail;
