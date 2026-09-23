import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Form, Modal, Table, Badge, Tabs, Tab, ProgressBar, Alert, Spinner } from "react-bootstrap";
import {
  FaUserPlus,
  FaChevronRight,
  FaPlus,
  FaSave,
  FaCalendarCheck,
  FaChartLine,
  FaUserCheck,
  FaArrowLeft,
  FaExclamationTriangle,
} from "react-icons/fa";
import growthTrackApi from "../../api/growthTrackApi";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "../../utils/toast";
import {
  GROWTH_TRACK_PROBLEM_CATEGORIES,
  getCategoryLabel,
  getNoticeProblemCategories,
} from "../../utils/growthTrackCategories.js";
import {
  canInitiateGrowthTrackForEmployee,
  isCompanyGrowthTrackManager,
} from "../../utils/growthTrackAccess.js";
import "./GrowthTrackManagement.css";

const COMPANY_LIST_FALLBACK_ROLES = ["admin", "superadmin", "hr"];

const GrowthTrackManagement = () => {
  const { user, canAccess } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Active track selection for detail view
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Modals state
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Modal forms data
  const [initiateData, setInitiateData] = useState({
    employeeId: "",
    stage: "concern",
    problemCategories: [],
    description: "",
    deadline: "",
  });

  const [targetData, setTargetData] = useState({
    weekNumber: 1,
    title: "",
    expectedValue: "",
  });

  const [reviewData, setReviewData] = useState({
    reviewDate: new Date().toISOString().split("T")[0],
    notes: "",
    progressStatus: "improved",
  });

  const [finalizeData, setFinalizeData] = useState({
    outcome: "improved",
    note: "",
  });

  // Track inline progress updates
  const [updatingTargetId, setUpdatingTargetId] = useState(null);
  const [targetUpdateValues, setTargetUpdateValues] = useState({ achievedValue: "", pendingValue: "" });

  const useCompanyTrackList =
    canAccess?.("growth_track.manage", COMPANY_LIST_FALLBACK_ROLES) ??
    isCompanyGrowthTrackManager(user);

  useEffect(() => {
    fetchTracks();
    fetchEmployees();
  }, [useCompanyTrackList]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const res = useCompanyTrackList
        ? await growthTrackApi.getAllGrowthTracks()
        : await growthTrackApi.getManagerGrowthTracks();
      setTracks(res.data);
      
      // If a track was selected, sync its fresh state
      if (selectedTrack) {
        const updatedSelected = res.data.find(t => t._id === selectedTrack._id);
        setSelectedTrack(updatedSelected || null);
      }
    } catch (err) {
      console.error("Error fetching tracks:", err);
      toast.error("Failed to load Growth Tracks");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/users");
      // Filter out clients and admins, show active users
      const filtered = res.data.filter(
        (emp) =>
          emp.status === "active" &&
          emp.role === "employee" &&
          emp._id !== user?._id &&
          canInitiateGrowthTrackForEmployee(user, emp)
      );
      setEmployees(filtered);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    if (
      !initiateData.employeeId ||
      !initiateData.description ||
      !initiateData.deadline ||
      !initiateData.problemCategories?.length
    ) {
      toast.error("Please fill in all fields and select at least one problem category");
      return;
    }

    try {
      setSubmitting(true);
      await growthTrackApi.initiateGrowthTrack(initiateData);
      toast.success("Growth Track initiated successfully");
      setShowInitiateModal(false);
      setInitiateData({
        employeeId: "",
        stage: "concern",
        problemCategories: [],
        description: "",
        deadline: "",
      });
      await fetchTracks();
    } catch (err) {
      console.error("Error initiating Growth Track:", err);
      toast.error(err.response?.data?.message || "Failed to initiate Growth Track");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTargetSubmit = async (e) => {
    e.preventDefault();
    if (!targetData.title || !targetData.expectedValue) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setSubmitting(true);
      await growthTrackApi.addWeeklyTarget(selectedTrack._id, targetData);
      toast.success("Weekly target added");
      setShowTargetModal(false);
      setTargetData({ weekNumber: 1, title: "", expectedValue: "" });
      await fetchTracks();
    } catch (err) {
      console.error("Error adding target:", err);
      toast.error(err.response?.data?.message || "Failed to add target");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartTargetUpdate = (target) => {
    setUpdatingTargetId(target._id);
    setTargetUpdateValues({
      achievedValue: target.achievedValue,
      pendingValue: target.pendingValue,
    });
  };

  const handleSaveTargetUpdate = async (targetId) => {
    try {
      setSubmitting(true);
      await growthTrackApi.updateTargetProgress(selectedTrack._id, targetId, targetUpdateValues);
      toast.success("Target progress updated");
      setUpdatingTargetId(null);
      await fetchTracks();
    } catch (err) {
      console.error("Error updating progress:", err);
      toast.error(err.response?.data?.message || "Failed to update progress");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewData.notes) {
      toast.error("Please enter review notes");
      return;
    }

    try {
      setSubmitting(true);
      await growthTrackApi.logReviewMeeting(selectedTrack._id, reviewData);
      toast.success("Review meeting logged");
      setShowReviewModal(false);
      setReviewData({
        reviewDate: new Date().toISOString().split("T")[0],
        notes: "",
        progressStatus: "improved",
      });
      await fetchTracks();
    } catch (err) {
      console.error("Error logging review:", err);
      toast.error(err.response?.data?.message || "Failed to log review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await growthTrackApi.finalizeGrowthTrack(selectedTrack._id, finalizeData);
      toast.success("Growth Track finalized successfully");
      setShowFinalizeModal(false);
      setSelectedTrack(null);
      await fetchTracks();
    } catch (err) {
      console.error("Error finalizing:", err);
      toast.error(err.response?.data?.message || "Failed to finalize");
    } finally {
      setSubmitting(false);
    }
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case "concern":
        return <Badge bg="warning" className="text-dark">Concern Stage</Badge>;
      case "improvement":
        return <Badge bg="warning">Improvement Stage</Badge>;
      case "critical":
        return <Badge bg="danger">Critical Review</Badge>;
      default:
        return <Badge bg="secondary">{stage}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge bg="success">Active</Badge>;
      case "extended":
        return <Badge bg="info">Extended</Badge>;
      case "completed":
        return <Badge bg="secondary">Completed</Badge>;
      case "hr_action":
        return <Badge bg="danger">Escalated (HR Action)</Badge>;
      default:
        return <Badge bg="dark">{status}</Badge>;
    }
  };

  const activeTracks = tracks.filter(t => t.status === "active" || t.status === "extended");
  const closedTracks = tracks.filter(t => t.status === "completed" || t.status === "hr_action");

  const renderTrackTable = (rows, { reviewsColumn = false } = {}) => (
    <div className="growth-track-table-wrap">
      <Table borderless align="middle" className="growth-track-table mb-0">
        <thead>
          <tr className="text-muted">
            <th className="col-employee">Employee</th>
            <th className="col-stage">Stage</th>
            <th className="col-status">Status</th>
            <th className="text-center col-meta">{reviewsColumn ? "Reviews" : "Notices"}</th>
            <th className="col-action" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t._id}
              onClick={() => setSelectedTrack(t)}
              className={`growth-track-table-row ${selectedTrack?._id === t._id ? "growth-track-table-row-selected" : ""}`}
            >
              <td className="fw-600 col-employee">
                <div className="growth-track-employee-name">{t.employee?.name}</div>
                <small className="text-muted">{t.employee?.designation || "Employee"}</small>
              </td>
              <td className="col-stage">{getStageBadge(t.stage)}</td>
              <td className="col-status">{getStatusBadge(t.status)}</td>
              <td className="text-center col-meta">
                <Badge bg="secondary" pill>
                  {reviewsColumn ? (t.reviewMeetings?.length || 0) : (t.notices?.length || 0)}
                </Badge>
              </td>
              <td className="col-action text-end">
                <FaChevronRight className="text-muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );

  return (
    <Container fluid className="py-4 growth-track-management px-3 px-lg-4">
      <div className="growth-track-mgmt-intro mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <h2 className="growth-track-mgmt-title mb-1">Growth Track Management</h2>
            <p className="text-muted mb-0">
              {useCompanyTrackList
                ? "Company-wide performance improvement cycles and audit trail"
                : "Manage performance tracks for your team"}
            </p>
          </div>
          {!selectedTrack && (
            <Button
              variant="primary"
              onClick={() => setShowInitiateModal(true)}
              className="d-flex align-items-center gap-2 px-4 py-2 shadow-sm"
              style={{ fontWeight: "600" }}
            >
              <FaUserPlus /> Initiate Stage
            </Button>
          )}
        </div>
      </div>

      {/* Upper stats banner */}
      <Row className="mb-4 g-3 growth-track-stats-row">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3 h-100" style={{ borderLeft: "4px solid #6366f1" }}>
            <Card.Body>
              <h6 className="text-muted mb-2">Total Managed Tracks</h6>
              <h2 className="fw-800 mb-0">{tracks.length}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3 h-100" style={{ borderLeft: "4px solid #10b981" }}>
            <Card.Body>
              <h6 className="text-muted mb-2">Active Cycles</h6>
              <h2 className="fw-800 text-success mb-0">{activeTracks.length}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3 h-100" style={{ borderLeft: "4px solid #f59e0b" }}>
            <Card.Body>
              <h6 className="text-muted mb-2">Concern / Improvement</h6>
              <h2 className="fw-800 text-warning mb-0">
                {activeTracks.filter(t => t.stage === "concern" || t.stage === "improvement").length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3 h-100" style={{ borderLeft: "4px solid #ef4444" }}>
            <Card.Body>
              <h6 className="text-muted mb-2">Critical Review (PIP)</h6>
              <h2 className="fw-800 text-danger mb-0">
                {activeTracks.filter(t => t.stage === "critical").length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {!selectedTrack ? (
        <Card className="border-0 shadow-sm mb-4 growth-track-list-card">
          <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-2">
            <h4 className="mb-1" style={{ fontWeight: "800", color: "#1f2937" }}>
              Track registry
            </h4>
            <p className="text-muted mb-0 small">
              {useCompanyTrackList
                ? "Organizational audit records"
                : "Employees reporting to you"} — select a row to manage
            </p>
          </Card.Header>
          <Card.Body className="px-4 pb-4 pt-2">
            {loading && tracks.length === 0 ? (
              <div className="text-center py-5"><Spinner animation="border" /></div>
            ) : tracks.length === 0 ? (
              <div className="text-center text-muted py-5">
                <FaChartLine className="mb-3 text-secondary" style={{ fontSize: "2.5rem", opacity: 0.35 }} />
                <p className="mb-3">No Growth Track entries yet.</p>
                <Button variant="outline-primary" onClick={() => setShowInitiateModal(true)}>
                  Initiate concern stage
                </Button>
              </div>
            ) : (
              <Tabs defaultActiveKey="active" className="growth-track-list-tabs mb-0">
                <Tab eventKey="active" title={`Active (${activeTracks.length})`} className="pt-3">
                  {activeTracks.length === 0 ? (
                    <p className="text-muted text-center py-4 mb-0">No active cycles.</p>
                  ) : (
                    renderTrackTable(activeTracks)
                  )}
                </Tab>
                <Tab eventKey="closed" title={`History (${closedTracks.length})`} className="pt-3">
                  {closedTracks.length === 0 ? (
                    <p className="text-muted text-center py-4 mb-0">No closed tracks yet.</p>
                  ) : (
                    renderTrackTable(closedTracks, { reviewsColumn: true })
                  )}
                </Tab>
              </Tabs>
            )}
          </Card.Body>
        </Card>
      ) : (
        <div className="growth-track-detail-view">
          <Button
            variant="link"
            className="growth-track-back-btn ps-0 mb-3 text-decoration-none"
            onClick={() => setSelectedTrack(null)}
          >
            <FaArrowLeft className="me-2" />
            Back to track registry
          </Button>

          <Card className="border-0 shadow-sm mb-4 growth-track-detail-hero">
            <Card.Body className="p-4">
              <Row className="align-items-center g-3">
                <Col md={7} lg={8}>
                  <p className="text-muted small mb-1 text-uppercase fw-semibold letter-spacing-wide">
                    Managing employee
                  </p>
                  <h3 className="mb-2 fw-bold text-dark">{selectedTrack.employee?.name}</h3>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    {getStageBadge(selectedTrack.stage)}
                    {getStatusBadge(selectedTrack.status)}
                    <span className="text-muted small">
                      {selectedTrack.employee?.designation || "Employee"}
                      {selectedTrack.employee?.email ? ` · ${selectedTrack.employee.email}` : ""}
                    </span>
                  </div>
                </Col>
                <Col md={5} lg={4}>
                  {selectedTrack.status !== "completed" && selectedTrack.status !== "hr_action" && (
                    <div className="growth-track-action-stack d-grid gap-2">
                      <Button variant="outline-primary" onClick={() => setShowTargetModal(true)}>
                        <FaPlus className="me-2" />
                        Add weekly target
                      </Button>
                      <Button variant="outline-success" onClick={() => setShowReviewModal(true)}>
                        <FaCalendarCheck className="me-2" />
                        Log review meeting
                      </Button>
                      <Button variant="danger" onClick={() => setShowFinalizeModal(true)}>
                        <FaUserCheck className="me-2" />
                        Finalize & close track
                      </Button>
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Row className="g-4">
            <Col lg={6}>
              <Card className="border-0 shadow-sm h-100 growth-track-detail-panel">
                <Card.Header className="bg-white border-0 pt-4 px-4 pb-0">
                  <h5 className="fw-bold mb-0">Issued notices</h5>
                  <p className="text-muted small mb-0 mt-1">Formal warnings and employee acknowledgment</p>
                </Card.Header>
                <Card.Body className="p-4">
                  {selectedTrack.notices?.length ? (
                    selectedTrack.notices.map((n, i) => (
                      <div
                        key={n._id || i}
                        className="growth-track-notice-card p-3 rounded mb-3"
                        style={{ borderLeft: `4px solid ${n.stage === "critical" ? "#ef4444" : "#f59e0b"}` }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <Badge bg={n.stage === "critical" ? "danger" : "warning"} className="text-capitalize">
                              {n.stage}
                            </Badge>
                            {getNoticeProblemCategories(n).map((cat) => (
                              <Badge key={cat} bg="secondary">
                                {getCategoryLabel(cat)}
                              </Badge>
                            ))}
                          </div>
                          <small className="text-muted">Issued {new Date(n.issuedAt).toLocaleDateString()}</small>
                        </div>
                        <p className="text-dark small mb-0" style={{ whiteSpace: "pre-line", lineHeight: 1.55 }}>
                          {n.description}
                        </p>
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2 small">
                          <span>
                            <strong>Deadline:</strong> {new Date(n.deadline).toLocaleDateString()}
                          </span>
                          {n.acknowledged ? (
                            <span className="text-success fw-semibold">
                              <FaUserCheck className="me-1" />
                              Acknowledged
                            </span>
                          ) : (
                            <span className="text-warning fw-semibold">Awaiting acknowledgment</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-center py-4 mb-0">No notices issued.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border-0 shadow-sm mb-4 growth-track-detail-panel">
                <Card.Header className="bg-white border-0 pt-4 px-4 pb-0">
                  <h5 className="fw-bold mb-0">Weekly targets</h5>
                  <p className="text-muted small mb-0 mt-1">Measurable PIP goals and progress</p>
                </Card.Header>
                <Card.Body className="p-4">
                  {(!selectedTrack.weeklyTargets || selectedTrack.weeklyTargets.length === 0) ? (
                    <p className="text-muted text-center py-4 mb-0">No targets assigned yet.</p>
                  ) : (
                    <div className="growth-track-targets-wrap">
                      <Table borderless align="middle" className="growth-track-targets-table mb-0">
                        <thead>
                          <tr className="text-muted border-bottom small">
                            <th>Target</th>
                            <th className="text-center">Expected</th>
                            <th className="text-center">Achieved</th>
                            <th className="text-center">Pending</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTrack.weeklyTargets.map((target) => (
                            <tr key={target._id} className="border-bottom">
                              <td>
                                <div className="fw-semibold">{target.title}</div>
                                <small className="text-muted">Week {target.weekNumber}</small>
                              </td>
                              <td className="text-center text-primary">{target.expectedValue}</td>
                              <td className="text-center">
                                {updatingTargetId === target._id ? (
                                  <Form.Control
                                    size="sm"
                                    type="text"
                                    className="growth-track-target-input"
                                    value={targetUpdateValues.achievedValue}
                                    onChange={(e) =>
                                      setTargetUpdateValues((p) => ({ ...p, achievedValue: e.target.value }))
                                    }
                                  />
                                ) : (
                                  <span className="text-success fw-semibold">{target.achievedValue}</span>
                                )}
                              </td>
                              <td className="text-center">
                                {updatingTargetId === target._id ? (
                                  <Form.Control
                                    size="sm"
                                    type="text"
                                    className="growth-track-target-input"
                                    value={targetUpdateValues.pendingValue}
                                    onChange={(e) =>
                                      setTargetUpdateValues((p) => ({ ...p, pendingValue: e.target.value }))
                                    }
                                  />
                                ) : (
                                  <span className="text-danger fw-semibold">{target.pendingValue}</span>
                                )}
                              </td>
                              <td className="text-end">
                                {selectedTrack.status !== "completed" && selectedTrack.status !== "hr_action" && (
                                  updatingTargetId === target._id ? (
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => handleSaveTargetUpdate(target._id)}
                                      disabled={submitting}
                                    >
                                      <FaSave />
                                    </Button>
                                  ) : (
                                    <Button variant="outline-secondary" size="sm" onClick={() => handleStartTargetUpdate(target)}>
                                      Edit
                                    </Button>
                                  )
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm growth-track-detail-panel">
                <Card.Header className="bg-white border-0 pt-4 px-4 pb-0">
                  <h5 className="fw-bold mb-0">Review log</h5>
                  <p className="text-muted small mb-0 mt-1">Documented check-ins and progress status</p>
                </Card.Header>
                <Card.Body className="p-4">
                  {(!selectedTrack.reviewMeetings || selectedTrack.reviewMeetings.length === 0) ? (
                    <p className="text-muted text-center py-4 mb-0">No reviews logged yet.</p>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {selectedTrack.reviewMeetings.map((review, i) => {
                        const colors = {
                          improved: "success",
                          "partially improved": "warning",
                          "no improvement": "danger",
                        };
                        return (
                          <div key={review._id || i} className="growth-track-review-card p-3 rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                              <strong className="small">{new Date(review.reviewDate).toLocaleDateString()}</strong>
                              <Badge bg={colors[review.progressStatus]} className="text-capitalize">
                                {review.progressStatus}
                              </Badge>
                            </div>
                            <p className="mb-0 text-muted small" style={{ whiteSpace: "pre-line", lineHeight: 1.55 }}>
                              {review.notes}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* MODAL 1: Initiate / Escalate Stage */}
      <Modal show={showInitiateModal} onHide={() => setShowInitiateModal(false)} centered>
        <Form onSubmit={handleInitiateSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontWeight: "700" }}>Initiate / Escalate Growth Track</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Select Employee</Form.Label>
              <Form.Select
                value={initiateData.employeeId}
                onChange={(e) => setInitiateData(p => ({ ...p, employeeId: e.target.value }))}
                required
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Growth Track Level/Stage</Form.Label>
              <Form.Select
                value={initiateData.stage}
                onChange={(e) => setInitiateData(p => ({ ...p, stage: e.target.value }))}
              >
                <option value="concern">Concern Stage (Level 1 - Soft Warning)</option>
                <option value="improvement">Improvement Stage (Level 2 - Official Notice)</option>
                <option value="critical">Critical Review Stage (Level 3 - Active PIP)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Problem Categories</Form.Label>
              <div
                className="border rounded p-3 growth-track-category-picker"
                role="group"
                aria-label="Problem categories"
              >
                {GROWTH_TRACK_PROBLEM_CATEGORIES.map((cat) => {
                  const checked = initiateData.problemCategories.includes(cat.value);
                  return (
                    <Form.Check
                      key={cat.value}
                      type="checkbox"
                      id={`problem-cat-${cat.value.replace(/\s+/g, "-")}`}
                      label={cat.label}
                      checked={checked}
                      onChange={() => {
                        setInitiateData((prev) => {
                          const next = new Set(prev.problemCategories);
                          if (next.has(cat.value)) next.delete(cat.value);
                          else next.add(cat.value);
                          return { ...prev, problemCategories: [...next] };
                        });
                      }}
                      className="mb-2"
                    />
                  );
                })}
              </div>
              <Form.Text className="text-muted">
                Select all areas that apply to this notice.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Expected Improvements & Notice Details</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Write specific performance issues observed, expected improvements, and any standard values that must be achieved."
                value={initiateData.description}
                onChange={(e) => setInitiateData(p => ({ ...p, description: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Review/Improvement Deadline</Form.Label>
              <Form.Control
                type="date"
                value={initiateData.deadline}
                onChange={(e) => setInitiateData(p => ({ ...p, deadline: e.target.value }))}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInitiateModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Submit Notice"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 2: Add Weekly Target */}
      <Modal show={showTargetModal} onHide={() => setShowTargetModal(false)} centered>
        <Form onSubmit={handleAddTargetSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontWeight: "700" }}>Add Measurable Target</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Week Number</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={12}
                value={targetData.weekNumber}
                onChange={(e) => setTargetData(p => ({ ...p, weekNumber: parseInt(e.target.value) || 1 }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Target Title / Objective</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Maintain 100% attendance, Submit daily report before 7 PM"
                value={targetData.title}
                onChange={(e) => setTargetData(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Expected Target Value</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., 5/5 Days, 100%, 0 delays"
                value={targetData.expectedValue}
                onChange={(e) => setTargetData(p => ({ ...p, expectedValue: e.target.value }))}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTargetModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>Assign Target</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 3: Log Review Meeting */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered>
        <Form onSubmit={handleLogReviewSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontWeight: "700" }}>Log Cycle Review Meeting</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Meeting Date</Form.Label>
              <Form.Control
                type="date"
                value={reviewData.reviewDate}
                onChange={(e) => setReviewData(p => ({ ...p, reviewDate: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Progress Status Evaluation</Form.Label>
              <Form.Select
                value={reviewData.progressStatus}
                onChange={(e) => setReviewData(p => ({ ...p, progressStatus: e.target.value }))}
              >
                <option value="improved">Improved (Positive progress)</option>
                <option value="partially improved">Partially Improved (Needs more focus)</option>
                <option value="no improvement">No Improvement (Critical concern)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Meeting Discussion & Guidance Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Log details discussed during the meeting, constructive feedback, achievements, and corrective guidance given."
                value={reviewData.notes}
                onChange={(e) => setReviewData(p => ({ ...p, notes: e.target.value }))}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReviewModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>Log Meeting</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 4: Finalize & Close Growth Track */}
      <Modal show={showFinalizeModal} onHide={() => setShowFinalizeModal(false)} centered>
        <Form onSubmit={handleFinalizeSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontWeight: "700" }}>Finalize Performance Growth Track</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="warning">
              <FaExclamationTriangle className="me-2" />
              <strong>Warning:</strong> Finalizing will close or transition this Growth Track cycle. This action cannot be undone.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Select Final Outcome</Form.Label>
              <Form.Select
                value={finalizeData.outcome}
                onChange={(e) => setFinalizeData(p => ({ ...p, outcome: e.target.value }))}
              >
                <option value="improved">Improved (Closes case & returns dashboard to normal)</option>
                <option value="partially_improved">Partially Improved (Extends review cycle by 30 days)</option>
                <option value="no_improvement">No Improvement (Escalates case to HR for further action)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Outcome Summary Note</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Write final review remarks, summarizing the decision. If no improvement, detail the specific areas that triggered HR escalation."
                value={finalizeData.note}
                onChange={(e) => setFinalizeData(p => ({ ...p, note: e.target.value }))}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowFinalizeModal(false)}>Cancel</Button>
            <Button variant="danger" type="submit" disabled={submitting}>Finalize Outcome</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default GrowthTrackManagement;
