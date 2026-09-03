import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Form, Modal, Table, Badge, Tabs, Tab, ProgressBar, Alert, Spinner } from "react-bootstrap";
import { FaUserPlus, FaChevronRight, FaPlus, FaSave, FaHandshake, FaCalendarCheck, FaChartLine, FaExclamationTriangle, FaUserCheck } from "react-icons/fa";
import growthTrackApi from "../../api/growthTrackApi";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "../../utils/toast";

const GrowthTrackManagement = () => {
  const { user } = useAuth();
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
    problemCategory: "productivity",
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

  const isHR = ["hr", "admin", "superadmin"].includes(user?.role);

  useEffect(() => {
    fetchTracks();
    fetchEmployees();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const res = isHR 
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
      const filtered = res.data.filter(emp => 
        emp.status === "active" && 
        emp.role === "employee" && 
        emp._id !== user?._id
      );
      setEmployees(filtered);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    if (!initiateData.employeeId || !initiateData.description || !initiateData.deadline) {
      toast.error("Please fill in all fields");
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
        problemCategory: "productivity",
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

  return (
    <Container className="py-4">
      {/* Upper stats banner */}
      <Row className="mb-4">
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

      <Row>
        {/* Left Side: Employees List */}
        <Col lg={selectedTrack ? 5 : 12}>
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "15px" }}>
            <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h4 style={{ fontWeight: "800", color: "#1f2937" }}>Performance Growth Track List</h4>
                <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                  {isHR ? "Organizational Audit Records" : "Your reporting employees list"}
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowInitiateModal(true)}
                className="d-flex align-items-center gap-2 py-2"
                style={{ fontWeight: "600" }}
              >
                <FaUserPlus /> Initiate Stage
              </Button>
            </Card.Header>
            <Card.Body className="p-4">
              {loading && tracks.length === 0 ? (
                <div className="text-center py-4"><Spinner animation="border" /></div>
              ) : tracks.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <p>No Growth Track entries found.</p>
                  <Button variant="outline-primary" onClick={() => setShowInitiateModal(true)}>Initiate Concern Stage</Button>
                </div>
              ) : (
                <Tabs defaultActiveKey="active" className="mb-3 border-0 bg-light p-1 rounded">
                  <Tab eventKey="active" title={`Active (${activeTracks.length})`} className="pt-2">
                    <Table hover responsive borderless align="middle">
                      <thead>
                        <tr className="text-muted border-bottom" style={{ fontSize: "0.85rem" }}>
                          <th>Employee</th>
                          <th>Stage</th>
                          <th>Status</th>
                          <th className="text-center">Notices</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTracks.map((t) => (
                          <tr 
                            key={t._id} 
                            onClick={() => setSelectedTrack(t)}
                            className={`cursor-pointer ${selectedTrack?._id === t._id ? "bg-light border-start border-4 border-primary" : ""}`}
                            style={{ cursor: "pointer" }}
                          >
                            <td className="fw-600">
                              <div>{t.employee?.name}</div>
                              <small className="text-muted">{t.employee?.designation || "Employee"}</small>
                            </td>
                            <td>{getStageBadge(t.stage)}</td>
                            <td>{getStatusBadge(t.status)}</td>
                            <td className="text-center">
                              <Badge bg="secondary" pill>{t.notices?.length || 0}</Badge>
                            </td>
                            <td><FaChevronRight className="text-muted" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Tab>
                  <Tab eventKey="closed" title={`History (${closedTracks.length})`} className="pt-2">
                    <Table hover responsive borderless align="middle">
                      <thead>
                        <tr className="text-muted border-bottom" style={{ fontSize: "0.85rem" }}>
                          <th>Employee</th>
                          <th>Stage</th>
                          <th>Outcome</th>
                          <th className="text-center">Reviews</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {closedTracks.map((t) => (
                          <tr 
                            key={t._id} 
                            onClick={() => setSelectedTrack(t)}
                            className={`cursor-pointer ${selectedTrack?._id === t._id ? "bg-light border-start border-4 border-primary" : ""}`}
                            style={{ cursor: "pointer" }}
                          >
                            <td className="fw-600">
                              <div>{t.employee?.name}</div>
                              <small className="text-muted">{t.employee?.designation || "Employee"}</small>
                            </td>
                            <td>{getStageBadge(t.stage)}</td>
                            <td>{getStatusBadge(t.status)}</td>
                            <td className="text-center">
                              <Badge bg="secondary" pill>{t.reviewMeetings?.length || 0}</Badge>
                            </td>
                            <td><FaChevronRight className="text-muted" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Tab>
                </Tabs>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Side: Detailed track inspection & actions */}
        {selectedTrack && (
          <Col lg={7}>
            <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "15px" }}>
              <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                <div>
                  <h4 style={{ fontWeight: "800", color: "#1f2937" }}>Manage: {selectedTrack.employee?.name}</h4>
                  <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                    Stage: {getStageBadge(selectedTrack.stage)} • Status: {getStatusBadge(selectedTrack.status)}
                  </p>
                </div>
                <Button variant="close" onClick={() => setSelectedTrack(null)} aria-label="Close" />
              </Card.Header>
              <Card.Body className="p-4">
                {selectedTrack.status !== "completed" && selectedTrack.status !== "hr_action" && (
                  <div className="d-flex flex-wrap gap-2 mb-4 bg-light p-3 rounded justify-content-between border">
                    <Button variant="outline-primary" size="sm" onClick={() => setShowTargetModal(true)} className="d-flex align-items-center gap-1">
                      <FaPlus /> Add Target
                    </Button>
                    <Button variant="outline-success" size="sm" onClick={() => setShowReviewModal(true)} className="d-flex align-items-center gap-1">
                      <FaCalendarCheck /> Log Review Meeting
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setShowFinalizeModal(true)} className="d-flex align-items-center gap-1">
                      <FaUserCheck /> Finalize & Close PIP
                    </Button>
                  </div>
                )}

                {/* Notices Section */}
                <div className="mb-4">
                  <h6 className="fw-700 text-dark border-bottom pb-2 mb-3">Issued Notices</h6>
                  {selectedTrack.notices.map((n, i) => (
                    <div key={n._id || i} className="p-3 border rounded mb-2 bg-light border-start-4" style={{ borderLeft: `4px solid ${n.stage === "critical" ? "#ef4444" : "#f59e0b"}` }}>
                      <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-1">
                        <div>
                          <Badge bg={n.stage === "critical" ? "danger" : "warning"} className="me-2 text-capitalize">{n.stage}</Badge>
                          <Badge bg="secondary" className="text-capitalize">{n.problemCategory}</Badge>
                        </div>
                        <small className="text-muted">Issued: {new Date(n.issuedAt).toLocaleDateString()}</small>
                      </div>
                      <p className="mb-2 text-muted" style={{ fontSize: "0.9rem", whiteSpace: "pre-line" }}>{n.description}</p>
                      <div className="d-flex justify-content-between align-items-center border-top pt-2 flex-wrap gap-1" style={{ fontSize: "0.82rem" }}>
                        <span><strong>Deadline:</strong> {new Date(n.deadline).toLocaleDateString()}</span>
                        {n.acknowledged ? (
                          <span className="text-success"><FaUserCheck /> Acknowledged</span>
                        ) : (
                          <span className="text-warning">⚠️ Awaiting Acknowledge</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly Targets Section */}
                <div className="mb-4">
                  <h6 className="fw-700 text-dark border-bottom pb-2 mb-3">PIP Measurable Weekly Targets</h6>
                  {(!selectedTrack.weeklyTargets || selectedTrack.weeklyTargets.length === 0) ? (
                    <p className="text-muted text-center py-2" style={{ fontSize: "0.9rem" }}>No targets assigned yet.</p>
                  ) : (
                    <Table hover responsive borderless align="middle" style={{ fontSize: "0.9rem" }}>
                      <thead>
                        <tr className="text-muted border-bottom">
                          <th>Target Title (Week)</th>
                          <th className="text-center">Expected</th>
                          <th className="text-center">Achieved</th>
                          <th className="text-center">Pending</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTrack.weeklyTargets.map((target) => (
                          <tr key={target._id} className="border-bottom">
                            <td>
                              <div className="fw-600">{target.title}</div>
                              <small className="text-muted">Week {target.weekNumber}</small>
                            </td>
                            <td className="text-center text-primary">{target.expectedValue}</td>
                            <td className="text-center">
                              {updatingTargetId === target._id ? (
                                <Form.Control
                                  size="sm"
                                  type="text"
                                  style={{ width: "65px", margin: "0 auto" }}
                                  value={targetUpdateValues.achievedValue}
                                  onChange={(e) => setTargetUpdateValues(p => ({ ...p, achievedValue: e.target.value }))}
                                />
                              ) : (
                                <span className="text-success fw-600">{target.achievedValue}</span>
                              )}
                            </td>
                            <td className="text-center">
                              {updatingTargetId === target._id ? (
                                <Form.Control
                                  size="sm"
                                  type="text"
                                  style={{ width: "65px", margin: "0 auto" }}
                                  value={targetUpdateValues.pendingValue}
                                  onChange={(e) => setTargetUpdateValues(p => ({ ...p, pendingValue: e.target.value }))}
                                />
                              ) : (
                                <span className="text-danger fw-600">{target.pendingValue}</span>
                              )}
                            </td>
                            <td>
                              {selectedTrack.status !== "completed" && selectedTrack.status !== "hr_action" && (
                                updatingTargetId === target._id ? (
                                  <Button variant="success" size="sm" onClick={() => handleSaveTargetUpdate(target._id)} disabled={submitting}>
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
                  )}
                </div>

                {/* Review logs */}
                <div>
                  <h6 className="fw-700 text-dark border-bottom pb-2 mb-3">Logged Progress Reviews</h6>
                  {(!selectedTrack.reviewMeetings || selectedTrack.reviewMeetings.length === 0) ? (
                    <p className="text-muted text-center py-2" style={{ fontSize: "0.9rem" }}>No reviews logged yet.</p>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {selectedTrack.reviewMeetings.map((review, i) => {
                        const colors = { improved: "success", "partially improved": "warning", "no improvement": "danger" };
                        return (
                          <div key={review._id || i} className="p-3 border rounded" style={{ fontSize: "0.9rem", background: "#fdfdfd" }}>
                            <div className="d-flex justify-content-between mb-2">
                              <strong>📅 {new Date(review.reviewDate).toLocaleDateString()}</strong>
                              <Badge bg={colors[review.progressStatus]} className="text-capitalize">{review.progressStatus}</Badge>
                            </div>
                            <p className="mb-0 text-muted" style={{ whiteSpace: "pre-line" }}>{review.notes}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

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
              <Form.Label>Problem Category</Form.Label>
              <Form.Select
                value={initiateData.problemCategory}
                onChange={(e) => setInitiateData(p => ({ ...p, problemCategory: e.target.value }))}
              >
                <option value="productivity">Productivity & Efficiency</option>
                <option value="attendance">Attendance & Punctuality</option>
                <option value="quality">Work Quality & Accuracy</option>
                <option value="communication">Team Communication</option>
                <option value="deadline management">Deadline & Speed</option>
                <option value="task ownership">Ownership & Responsibility</option>
              </Form.Select>
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
