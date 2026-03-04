import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Badge,
  Spinner,
} from "react-bootstrap";
import { FaCheckCircle, FaClock, FaEdit, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import { workLogApi } from "../../api/workLogApi";
import {
  validateWorkLog,
  getCharCountColor,
  getCharCountMessage,
  formatWorkLogDateTime,
  getWorkLogStatusBadge,
} from "../../utils/workLogHelpers";
import { useAuth } from "../../context/AuthContext";
import "../../styles/worklog.css";

const MyWorkLog = () => {
  const { user } = useAuth();
  const [workLog, setWorkLog] = useState("");
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchTodayLog();
    fetchStats();
  }, []);

  useEffect(() => {
    setCharCount(workLog.trim().length);
  }, [workLog]);

  const fetchTodayLog = async () => {
    try {
      setLoading(true);
      const data = await workLogApi.getTodayWorkLog();
      if (data) {
        setTodayLog(data);
        setWorkLog(data.workLog || "");
      } else {
        // No work log for today (null returned from API)
        setTodayLog(null);
        setWorkLog("");
      }
    } catch (error) {
      // Only log actual errors (not 404s which are handled in API)
      console.error("Error fetching today's work log:", error);
      setTodayLog(null);
      setWorkLog("");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {
        startDate: new Date(new Date().getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      };
      const response = await workLogApi.getMyWorkLogs(params);
      
      const total = response.pagination.total;
      const reviewed = response.workLogs.filter(
        (log) => log.status === "reviewed"
      ).length;
      const pending = response.workLogs.filter(
        (log) => log.status === "submitted"
      ).length;

      setStats({ total, reviewed, pending });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateWorkLog(workLog);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      const response = await workLogApi.submitWorkLog(workLog.trim());
      toast.success(response.message || "Work log submitted successfully!");
      await fetchTodayLog();
      await fetchStats();
      setEditing(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit work log"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setWorkLog(todayLog?.workLog || "");
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading...</p>
      </Container>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const canEdit = todayLog && todayLog.status !== "reviewed";
  const isSubmitted = todayLog && todayLog.status === "submitted";
  const isReviewed = todayLog && todayLog.status === "reviewed";

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Today's Work Log</h2>
          <p className="text-muted">{today}</p>
        </Col>
      </Row>

      {/* Stats Cards */}
      {stats && (
        <Row className="mb-4">
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3>{stats.total}</h3>
                <p className="text-muted mb-0">Total Logs</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{stats.reviewed}</h3>
                <p className="text-muted mb-0">Reviewed</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{stats.pending}</h3>
                <p className="text-muted mb-0">Pending Review</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Status Card */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Status</h5>
                {todayLog && (
                  <Badge bg={getWorkLogStatusBadge(todayLog.status)}>
                    {todayLog.status.toUpperCase()}
                  </Badge>
                )}
              </div>

              {!todayLog && (
                <Alert variant="warning">
                  <FaClock className="me-2" />
                  You haven't submitted your work log for today yet.
                </Alert>
              )}

              {isSubmitted && (
                <Alert variant="success">
                  <FaCheckCircle className="me-2" />
                  Work log submitted! Waiting for review.
                  <br />
                  <small className="text-muted">
                    Submitted at: {formatWorkLogDateTime(todayLog.submittedAt)}
                  </small>
                </Alert>
              )}

              {isReviewed && (
                <Alert variant="info">
                  <FaCheckCircle className="me-2" />
                  Work log has been reviewed.
                  <br />
                  <small className="text-muted">
                    Reviewed by: {todayLog.reviewedBy?.name || "N/A"} at{" "}
                    {formatWorkLogDateTime(todayLog.reviewedAt)}
                  </small>
                  {todayLog.reviewNotes && (
                    <>
                      <br />
                      <strong>Review Notes:</strong> {todayLog.reviewNotes}
                    </>
                  )}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Work Log Form/Display */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Work Log</h5>
                {canEdit && !editing && (
                  <Button variant="outline-primary" size="sm" onClick={handleEdit}>
                    <FaEdit className="me-1" /> Edit
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {(!todayLog || editing) && (
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      What did you work on today?{" "}
                      <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={10}
                      value={workLog}
                      onChange={(e) => setWorkLog(e.target.value)}
                      placeholder="Describe your work activities, tasks completed, meetings attended, issues resolved, etc. (Minimum 50 characters)"
                      disabled={submitting}
                    />
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <small className={`text-${getCharCountColor(charCount)}`}>
                        {getCharCountMessage(charCount)}
                      </small>
                      {charCount >= 50 && (
                        <small className="text-success">✓ Ready to submit</small>
                      )}
                    </div>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={submitting || charCount < 50}
                    >
                      <FaSave className="me-1" />
                      {submitting ? "Submitting..." : "Submit Work Log"}
                    </Button>
                    {editing && (
                      <Button
                        variant="secondary"
                        onClick={handleCancelEdit}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </Form>
              )}

              {todayLog && !editing && (
                <div>
                  <div className="work-log-content" style={{ whiteSpace: "pre-wrap" }}>
                    {todayLog.workLog}
                  </div>
                  <hr />
                  <small className="text-muted">
                    Submitted at: {formatWorkLogDateTime(todayLog.submittedAt)}
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Alert variant="info">
            <strong>Reminder:</strong> You must submit your daily work log before
            clocking out. This helps track productivity and project progress.
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default MyWorkLog;
