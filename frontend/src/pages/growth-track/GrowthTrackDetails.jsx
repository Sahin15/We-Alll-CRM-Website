import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Alert, Button, ProgressBar, Table, Badge, Spinner } from "react-bootstrap";
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaUserCircle, FaBullhorn, FaTasks, FaCalendarAlt } from "react-icons/fa";
import growthTrackApi from "../../api/growthTrackApi";
import toast from "../../utils/toast";

const GrowthTrackDetails = () => {
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchActiveTrack();
  }, []);

  const fetchActiveTrack = async () => {
    try {
      setLoading(true);
      const res = await growthTrackApi.getMyActiveTrack();
      setTrack(res.data);
    } catch (err) {
      console.error("Error fetching active Growth Track:", err);
      toast.error("Failed to load Growth Track data");
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (noticeId) => {
    try {
      setSubmitting(true);
      await growthTrackApi.acknowledgeNotice(track._id, noticeId);
      toast.success("Notice acknowledged successfully");
      await fetchActiveTrack();
    } catch (err) {
      console.error("Error acknowledging notice:", err);
      toast.error(err.response?.data?.message || "Failed to acknowledge notice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (!track) {
    return (
      <Container className="py-4">
        <Card className="border-0 shadow-sm text-center p-5" style={{ borderRadius: "15px" }}>
          <Card.Body>
            <div className="mb-4 text-success" style={{ fontSize: "3rem" }}>
              ✨
            </div>
            <h3 style={{ fontWeight: "700", color: "#1f2937" }}>Your Performance is on Track!</h3>
            <p className="text-muted mx-auto" style={{ maxWidth: "500px", fontSize: "1rem", lineHeight: "1.6" }}>
              You do not have an active performance review track. Your current achievements meet WeAlll Office standards. Keep up the excellent work!
            </p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Calculate dates and progress for critical stage
  const start = new Date(track.startDate || Date.now());
  const now = new Date();
  const elapsedDays = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  const totalDays = track.endDate
    ? Math.max(1, Math.floor((new Date(track.endDate) - start) / (1000 * 60 * 60 * 24)))
    : 30;
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  // Generate automated message during PIP/Critical review period
  const getAutomatedMessage = () => {
    if (elapsedDays < 1) {
      return "Day 1: Your Growth Track (PIP) has started today. Please review your weekly targets and focus on improvement.";
    } else if (elapsedDays < 7) {
      return "Week 1: Your improvement period is underway. Please work closely with your manager to achieve your targets.";
    } else if (elapsedDays < 8) {
      return "Week 1 Review: Your first week is complete. Your first weekly review meeting is approaching.";
    } else if (elapsedDays < totalDays / 2) {
      return "Status Update: Progress is being monitored. Maintain focus on your weekly targets.";
    } else if (elapsedDays < totalDays / 2 + 1) {
      return "Midpoint: You have reached the midpoint of your Growth Track. Progress is actively monitored, keep up the effort.";
    } else if (elapsedDays < totalDays - 7) {
      return "Status Update: Progress is being monitored. Maintain focus on your weekly targets.";
    } else if (elapsedDays < totalDays) {
      return "Final Week: You are in the final week of your review cycle. Your final performance review is approaching.";
    } else {
      return "Cycle Concluded: Your review cycle is complete. Your manager and HR will finalize the outcome of your Growth Track.";
    }
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case "concern":
        return <Badge bg="warning" className="text-dark py-2 px-3">Concern Stage (Level 1)</Badge>;
      case "improvement":
        return <Badge bg="warning" className="py-2 px-3">Improvement Stage (Level 2)</Badge>;
      case "critical":
        return <Badge bg="danger" className="py-2 px-3">Critical Review Stage (Level 3)</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const getCategoryLabel = (category) => {
    return category ? category.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "";
  };

  return (
    <Container className="py-4">
      {/* Visual Header */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "15px", overflow: "hidden" }}>
        <Card.Body className="p-4" style={{ background: "linear-gradient(135deg, rgba(79, 70, 229, 0.02) 0%, rgba(236, 72, 153, 0.02) 100%)" }}>
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="badge bg-primary px-3 py-2" style={{ fontSize: "0.85rem" }}>Growth Track</span>
                {getStageBadge(track.stage)}
              </div>
              <h2 style={{ fontWeight: "800", color: "#1f2937", letterSpacing: "-0.02em" }}>Performance Growth Track</h2>
              <p className="text-muted mb-0">
                Managed by Reporting Manager <strong>{track.manager?.name}</strong> • Started on {new Date(track.startDate).toLocaleDateString()}
              </p>
            </Col>
            <Col md={4} className="text-md-end mt-3 mt-md-0">
              {track.endDate && (
                <div className="bg-white p-3 rounded shadow-sm border d-inline-block text-start">
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#9ca3af", fontWeight: "700" }}>Review Deadline</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ef4444" }}>
                    📅 {new Date(track.endDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Critical/PIP Active Banner */}
      {track.stage === "critical" && (
        <div className="pip-banner p-4 mb-4 shadow-sm">
          <Row className="align-items-center">
            <Col lg={8}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <FaExclamationTriangle className="text-danger fs-4 animate-bounce" />
                <h5 className="mb-0" style={{ fontWeight: "700", color: "#7f1d1d" }}>Performance Improvement Plan Active</h5>
              </div>
              <p className="mb-2" style={{ fontSize: "1.02rem", color: "#7f1d1d", fontWeight: "500" }}>
                Your recent performance needs improvement. Please focus on assigned targets and follow manager guidance during this review period.
              </p>
              <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "0.92rem" }}>
                <FaBullhorn className="text-danger flex-shrink-0" />
                <span><strong>Timeline Notification: </strong>{getAutomatedMessage()}</span>
              </div>
            </Col>
            <Col lg={4} className="mt-3 mt-lg-0 text-lg-end">
              <div style={{ maxWidth: "280px", marginLeft: "auto" }}>
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.85rem", fontWeight: "600", color: "#b91c1c" }}>
                  <span>Review Cycle Completion</span>
                  <span>{progressPercent}%</span>
                </div>
                <ProgressBar now={progressPercent} variant="danger" style={{ height: "10px", borderRadius: "5px" }} />
                <small className="text-muted d-block mt-1">
                  Day {elapsedDays} of {totalDays} day cycle
                </small>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* Stage Progress Bar Flow */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "15px" }}>
        <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0">
          <h5 style={{ fontWeight: "700", color: "#374151" }}><FaClock className="me-2 text-muted" />Growth Track Progress Flow</h5>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center position-relative my-2 gap-4">
            <div className="position-absolute d-none d-md-block" style={{ height: "4px", width: "80%", background: "#e5e7eb", left: "10%", top: "20px", zIndex: 1 }} />
            
            {/* Step 1 */}
            <div className="text-center z-index-2" style={{ zIndex: 2, flex: 1 }}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2`} style={{ width: "45px", height: "45px", background: "#f59e0b", color: "#white", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <span className="text-white" style={{ fontWeight: "700" }}>1</span>
              </div>
              <h6 className="mb-1" style={{ fontWeight: "700", color: "#1f2937" }}>Concern Stage</h6>
              <small className="text-muted">Soft Warning message</small>
            </div>

            {/* Step 2 */}
            <div className="text-center z-index-2" style={{ zIndex: 2, flex: 1 }}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2`} style={{ width: "45px", height: "45px", background: track.stage === "improvement" || track.stage === "critical" ? "#f59e0b" : "#e5e7eb", color: track.stage === "improvement" || track.stage === "critical" ? "white" : "#6b7280", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <span style={{ fontWeight: "700" }}>2</span>
              </div>
              <h6 className="mb-1" style={{ fontWeight: "700", color: track.stage === "improvement" || track.stage === "critical" ? "#1f2937" : "#9ca3af" }}>Improvement Stage</h6>
              <small className="text-muted">Official review notice</small>
            </div>

            {/* Step 3 */}
            <div className="text-center z-index-2" style={{ zIndex: 2, flex: 1 }}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2`} style={{ width: "45px", height: "45px", background: track.stage === "critical" ? "#ef4444" : "#e5e7eb", color: track.stage === "critical" ? "white" : "#6b7280", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <span style={{ fontWeight: "700" }}>3</span>
              </div>
              <h6 className="mb-1" style={{ fontWeight: "700", color: track.stage === "critical" ? "#1f2937" : "#9ca3af" }}>Critical Review</h6>
              <small className="text-muted">Active PIP Warning Theme</small>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Row>
        {/* Left Column: Notices */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm mb-4 h-100" style={{ borderRadius: "15px" }}>
            <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 style={{ fontWeight: "700", color: "#374151" }}><FaBullhorn className="me-2 text-muted" />Formal Notices</h5>
              <Badge bg="info">{track.notices?.length || 0} Issued</Badge>
            </Card.Header>
            <Card.Body className="p-4">
              {(!track.notices || track.notices.length === 0) ? (
                <div className="text-center text-muted py-4">No formal notices have been issued yet.</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {track.notices.map((notice, idx) => (
                    <div key={notice._id || idx} className="p-3 border rounded" style={{ borderLeft: `4px solid ${notice.stage === "critical" ? "#ef4444" : "#f59e0b"}`, background: "#fafafa" }}>
                      <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                        <div>
                          <Badge bg={notice.stage === "critical" ? "danger" : "warning"} className="me-2 text-capitalize">
                            {notice.stage} Notice
                          </Badge>
                          <Badge bg="secondary" className="text-capitalize">
                            {getCategoryLabel(notice.problemCategory)}
                          </Badge>
                        </div>
                        <small className="text-muted">
                          Issued: {new Date(notice.issuedAt).toLocaleDateString()}
                        </small>
                      </div>
                      <p className="mb-3 text-dark" style={{ whiteSpace: "pre-line", fontSize: "0.95rem" }}>
                        {notice.description}
                      </p>
                      <div className="d-flex justify-content-between align-items-center border-top pt-2 flex-wrap gap-2">
                        <small className="text-muted">
                          <strong>Deadline:</strong> {new Date(notice.deadline).toLocaleDateString()}
                        </small>
                        {notice.acknowledged ? (
                          <div className="text-success d-flex align-items-center gap-1" style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                            <FaCheckCircle /> Acknowledged {notice.acknowledgedAt && `on ${new Date(notice.acknowledgedAt).toLocaleDateString()}`}
                          </div>
                        ) : (
                          <Button
                            variant={notice.stage === "critical" ? "danger" : "warning"}
                            size="sm"
                            style={{ fontWeight: "600" }}
                            disabled={submitting}
                            onClick={() => handleAcknowledge(notice._id)}
                          >
                            {submitting ? "Acknowledging..." : "Acknowledge Notice"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: Weekly Targets */}
        <Col lg={5}>
          <Card className="border-0 shadow-sm mb-4 h-100" style={{ borderRadius: "15px" }}>
            <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0">
              <h5 style={{ fontWeight: "700", color: "#374151" }}><FaTasks className="me-2 text-muted" />Growth Measurable Targets</h5>
            </Card.Header>
            <Card.Body className="p-4">
              {(!track.weeklyTargets || track.weeklyTargets.length === 0) ? (
                <div className="text-center text-muted py-4">
                  No measurable targets assigned yet. Targets are assigned weekly during the Critical Stage.
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover borderless align="middle">
                    <thead>
                      <tr className="border-bottom text-muted" style={{ fontSize: "0.85rem" }}>
                        <th>Target (Week)</th>
                        <th className="text-center">Expected</th>
                        <th className="text-center">Achieved</th>
                        <th className="text-center">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {track.weeklyTargets.map((target, idx) => (
                        <tr key={target._id || idx} className="border-bottom" style={{ fontSize: "0.92rem" }}>
                          <td>
                            <div className="fw-600 text-dark">{target.title}</div>
                            <small className="text-muted">Week {target.weekNumber}</small>
                          </td>
                          <td className="text-center text-primary fw-600">{target.expectedValue}</td>
                          <td className="text-center text-success fw-600">{target.achievedValue}</td>
                          <td className="text-center text-danger fw-600">{target.pendingValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Review Meetings Logs */}
      <Card className="border-0 shadow-sm mt-4" style={{ borderRadius: "15px" }}>
        <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0">
          <h5 style={{ fontWeight: "700", color: "#374151" }}><FaCalendarAlt className="me-2 text-muted" />Performance Review Cycle Meetings</h5>
        </Card.Header>
        <Card.Body className="p-4">
          {(!track.reviewMeetings || track.reviewMeetings.length === 0) ? (
            <div className="text-center text-muted py-4">No progress review meetings logged yet.</div>
          ) : (
            <div className="table-responsive">
              <Table hover borderless align="middle">
                <thead>
                  <tr className="border-bottom text-muted" style={{ fontSize: "0.85rem" }}>
                    <th>Meeting Date</th>
                    <th>Reviewed By</th>
                    <th>Progress Status</th>
                    <th>Notes & Guidance</th>
                  </tr>
                </thead>
                <tbody>
                  {track.reviewMeetings.map((meeting, idx) => {
                    const statusColors = {
                      improved: "success",
                      "partially improved": "warning",
                      "no improvement": "danger",
                    };
                    return (
                      <tr key={meeting._id || idx} className="border-bottom" style={{ fontSize: "0.92rem" }}>
                        <td className="fw-600 text-dark" style={{ minWidth: "120px" }}>
                          {new Date(meeting.reviewDate).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <FaUserCircle className="text-muted" />
                            <span>{meeting.reviewedBy?.name || track.manager?.name}</span>
                          </div>
                        </td>
                        <td>
                          <Badge bg={statusColors[meeting.progressStatus]} className="text-capitalize py-2 px-3">
                            {meeting.progressStatus}
                          </Badge>
                        </td>
                        <td className="text-muted" style={{ whiteSpace: "pre-line", minWidth: "250px" }}>
                          {meeting.notes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default GrowthTrackDetails;
