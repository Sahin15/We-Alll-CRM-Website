import { useState, useEffect, useCallback } from "react";
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
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { hiringRequestApi } from "../../api/hiringRequestApi";
import { hiringApplicationApi } from "../../api/hiringApplicationApi";
import { applicantApi } from "../../api/applicantApi";
import { offerApi } from "../../api/offerApi";
import { STAGE_VARIANT, stageLabel } from "../../utils/hiringPipeline";
import HiringPipelineFlow from "../../components/hr/HiringPipelineFlow";

const STATUS_VARIANT = {
  draft: "secondary",
  submitted: "warning",
  hr_approved: "info",
  hr_rejected: "danger",
  on_hold: "secondary",
  in_progress: "primary",
  filled: "success",
  cancelled: "dark",
};

const HiringRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState("");
  const [applicantSearch, setApplicantSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hiringRequestApi.get(id);
      setRequest(res.data?.request || res.data);
      setApplications(res.data?.applications || []);
      try {
        const offersRes = await offerApi.list({ hiringRequestId: id });
        setOffers(offersRes.data || []);
      } catch {
        setOffers([]);
      }
    } catch {
      toast.error("Failed to load hiring request");
      navigate("/hr/hiring/requests");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleReview = async (action) => {
    try {
      setReviewing(true);
      await hiringRequestApi.review(id, {
        action,
        hrNotes: reviewNotes,
        rejectionReason: action === "hr_rejected" ? rejectionReason : undefined,
      });
      toast.success("Review saved");
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || "Review failed");
    } finally {
      setReviewing(false);
    }
  };

  const loadApplicants = async () => {
    try {
      const res = await applicantApi.list({
        search: applicantSearch || undefined,
        status: "active",
      });
      setApplicants(res.data || []);
    } catch {
      toast.error("Failed to load applicants");
    }
  };

  const openAddModal = () => {
    setSelectedApplicantId("");
    setApplicantSearch("");
    setShowAddModal(true);
    loadApplicants();
  };

  const handleAddApplicant = async () => {
    if (!selectedApplicantId) {
      toast.error("Select an applicant");
      return;
    }
    try {
      setAdding(true);
      await hiringApplicationApi.create({
        hiringRequestId: id,
        applicantId: selectedApplicantId,
      });
      toast.success("Applicant added to pipeline");
      setShowAddModal(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add applicant");
    } finally {
      setAdding(false);
    }
  };

  const handleStageChange = async (applicationId, stage, extra = {}) => {
    try {
      await hiringApplicationApi.updateStage(applicationId, { stage, ...extra });
      toast.success(`Moved to ${stageLabel(stage)}`);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update stage");
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!request) return null;

  const canReview = request.status === "submitted" || request.status === "on_hold";
  const canPipeline = request.status === "in_progress";

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">{request.requestNumber}</h2>
          <p className="text-muted mb-0">
            {request.department?.name} — {request.designation}
          </p>
        </div>
        <Button variant="outline-secondary" onClick={() => navigate("/hr/hiring/requests")}>
          Back
        </Button>
      </div>

      <Badge bg={STATUS_VARIANT[request.status] || "secondary"} className="mb-3">
        {request.status?.replace(/_/g, " ")}
      </Badge>

      <Tabs defaultActiveKey="overview" className="mb-4">
        <Tab eventKey="overview" title="Overview">
          <Row className="g-3">
            <Col md={6}>
              <Card>
                <Card.Body>
                  <h6>Requirement</h6>
                  <p>
                    <strong>Employment:</strong> {request.employmentType}
                    <br />
                    <strong>Headcount:</strong> {request.filledCount || 0} / {request.headcount}
                    <br />
                    <strong>Urgency:</strong> {request.urgency}
                    <br />
                    <strong>Skills:</strong> {request.skills || "—"}
                    <br />
                    <strong>Experience:</strong> {request.experienceRange || "—"}
                  </p>
                  <p>
                    <strong>Justification:</strong>
                    <br />
                    {request.justification}
                  </p>
                  {request.jobDescription && (
                    <p>
                      <strong>Job description:</strong>
                      <br />
                      {request.jobDescription}
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Body>
                  <h6>People</h6>
                  <p>
                    <strong>Raised by:</strong> {request.raisedBy?.name} ({request.raisedBy?.email})
                    <br />
                    {request.reviewedBy && (
                      <>
                        <strong>Reviewed by:</strong> {request.reviewedBy?.name}
                        <br />
                      </>
                    )}
                    {request.hrNotes && (
                      <>
                        <strong>HR notes:</strong> {request.hrNotes}
                        <br />
                      </>
                    )}
                    {request.rejectionReason && (
                      <>
                        <strong>Rejection reason:</strong> {request.rejectionReason}
                      </>
                    )}
                  </p>
                </Card.Body>
              </Card>
              {canReview && (
                <Card className="mt-3 border-warning">
                  <Card.Body>
                    <h6>HR Review</h6>
                    <Form.Group className="mb-2">
                      <Form.Label>Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Rejection reason (if rejecting)</Form.Label>
                      <Form.Control
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </Form.Group>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button
                        variant="success"
                        disabled={reviewing}
                        onClick={() => handleReview("hr_approved")}
                      >
                        Approve & start
                      </Button>
                      <Button
                        variant="warning"
                        disabled={reviewing}
                        onClick={() => handleReview("on_hold")}
                      >
                        On hold
                      </Button>
                      <Button
                        variant="danger"
                        disabled={reviewing}
                        onClick={() => handleReview("hr_rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="pipeline" title={`Interview Pipeline (${applications.length})`}>
          <Card>
            <Card.Body>
              <Alert variant="light" className="border mb-3">
                <strong>How it works:</strong> Add candidates from the CV bank, shortlist them, then
                click <strong>Track</strong> to schedule interviews, add remarks, and mark selected
                or rejected with reasons.
                <div className="mt-2">
                  <HiringPipelineFlow compact />
                </div>
              </Alert>
              {!canPipeline && (
                <Alert variant="warning" className="mb-3">
                  Approve this request and set it to <strong>in progress</strong> on the Overview
                  tab before adding candidates to the interview pipeline.
                </Alert>
              )}
              {canPipeline && (
                <Button variant="primary" className="mb-3" onClick={openAddModal}>
                  Add from CV bank
                </Button>
              )}
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Email</th>
                    <th>Stage</th>
                    <th>Interviews</th>
                    <th>Offer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No candidates in pipeline yet
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app._id}>
                        <td>
                          <Button
                            variant="link"
                            className="p-0 text-start text-decoration-none"
                            onClick={() => navigate(`/hr/hiring/applications/${app._id}`)}
                          >
                            {app.applicant?.name}
                          </Button>
                        </td>
                        <td>{app.applicant?.email}</td>
                        <td>
                          <Badge bg={STAGE_VARIANT[app.stage] || "secondary"}>
                            {stageLabel(app.stage)}
                          </Badge>
                        </td>
                        <td>
                          {(app.interviews || []).length === 0
                            ? "—"
                            : `${(app.interviews || []).filter((i) => i.status === "completed").length}/${app.interviews.length} done`}
                        </td>
                        <td>
                          {app.offerId ? (
                            <Button
                              size="sm"
                              variant="link"
                              onClick={() =>
                                navigate(
                                  `/hr/hiring/applications/${app._id}?tab=offer`
                                )
                              }
                            >
                              {app.offerId?.offerNumber || "Offer letter"}
                            </Button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="primary"
                            className="me-1"
                            onClick={() => navigate(`/hr/hiring/applications/${app._id}`)}
                          >
                            Track pipeline
                          </Button>
                          {canPipeline && app.stage === "sourced" && (
                            <Button
                              size="sm"
                              variant="outline-info"
                              onClick={() =>
                                handleStageChange(app._id, "shortlisted", {
                                  notes: "Shortlisted",
                                })
                              }
                            >
                              Shortlist
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

        <Tab eventKey="offers" title={`Offer letters (${offers.length})`}>
          <Card>
            <Card.Body>
              <Alert variant="light" className="border small mb-3">
                Create and generate offer letters from each candidate&apos;s pipeline page after they
                are <strong>selected</strong> (Interview Pipeline → Track → Create offer letter).
              </Alert>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Offer #</th>
                    <th>Candidate</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        No offer letters yet — create one from a selected candidate in the pipeline
                      </td>
                    </tr>
                  ) : (
                    offers.map((offer) => {
                      const appId =
                        offer.hiringApplicationId?._id || offer.hiringApplicationId;
                      return (
                        <tr key={offer._id}>
                          <td>{offer.offerNumber}</td>
                          <td>
                            <div>{offer.candidateName}</div>
                            <small className="text-muted">{offer.candidateEmail}</small>
                          </td>
                          <td>
                            <Badge bg={offer.status === "converted" ? "success" : "secondary"}>
                              {offer.status}
                            </Badge>
                          </td>
                          <td>
                            {appId ? (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() =>
                                  navigate(`/hr/hiring/applications/${appId}?tab=offer`)
                                }
                              >
                                Manage offer letter
                              </Button>
                            ) : (
                              <span className="text-muted small">No pipeline link</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add applicant to pipeline</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            className="mb-3"
            placeholder="Search CV bank..."
            value={applicantSearch}
            onChange={(e) => setApplicantSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadApplicants()}
          />
          <Button size="sm" variant="outline-secondary" className="mb-3" onClick={loadApplicants}>
            Search
          </Button>
          <Form.Select
            value={selectedApplicantId}
            onChange={(e) => setSelectedApplicantId(e.target.value)}
          >
            <option value="">Select applicant...</option>
            {applicants.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name} — {a.email}
              </option>
            ))}
          </Form.Select>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={adding} onClick={handleAddApplicant}>
            {adding ? "Adding..." : "Add to pipeline"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default HiringRequestDetail;
