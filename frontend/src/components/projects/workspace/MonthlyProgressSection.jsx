import { useState, useEffect } from "react";
import { Card, Row, Col, Badge, ProgressBar, Spinner } from "react-bootstrap";
import { FaHeartbeat, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import projectMonthApi from "../../../api/projectMonthApi";

const MonthlyProgressSection = ({ project, selectedMonthKey }) => {
  const projectId = project?._id || project?.id;
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchProgress();
    }
  }, [projectId, selectedMonthKey]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await projectMonthApi.getMonthProgress(projectId, selectedMonthKey);
      if (res.data && res.data.data) {
        setProgress(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch month progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthBadge = (healthStatus) => {
    switch (healthStatus) {
      case "healthy":
        return (
          <Badge bg="success" className="d-inline-flex align-items-center gap-1 px-3 py-2">
            <FaCheckCircle /> Healthy
          </Badge>
        );
      case "at_risk":
        return (
          <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1 px-3 py-2">
            <FaExclamationTriangle /> At Risk
          </Badge>
        );
      case "critical":
        return (
          <Badge bg="danger" className="d-inline-flex align-items-center gap-1 px-3 py-2">
            <FaTimesCircle /> Critical
          </Badge>
        );
      default:
        return <Badge bg="secondary">{healthStatus}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" variant="primary" />
        <small className="ms-2 text-muted">Calculating monthly progress...</small>
      </div>
    );
  }

  if (!progress) return null;

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-2">
          <FaHeartbeat className="text-danger" size={20} />
          <h5 className="mb-0 fw-bold">Monthly Health & Progress</h5>
        </div>
        <div>{getHealthBadge(progress.healthStatus)}</div>
      </Card.Header>
      <Card.Body>
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="fw-bold">Overall Monthly Achievement</span>
            <span className="fw-bold text-primary">{progress.achievementPercent}%</span>
          </div>
          <ProgressBar
            now={progress.achievementPercent}
            variant={
              progress.achievementPercent >= 80
                ? "success"
                : progress.achievementPercent >= 50
                ? "warning"
                : "danger"
            }
            style={{ height: "12px" }}
          />
        </div>

        <Row className="g-3 text-center">
          <Col md={3} sm={6}>
            <div className="p-3 bg-light rounded-3 border">
              <div className="text-muted small">Deliverables</div>
              <div className="fs-4 fw-bold text-dark">
                {progress.completedDeliverables} / {progress.totalPlannedDeliverables}
              </div>
              <div className="small text-muted">{progress.deliverableAchievementPercent}% Complete</div>
            </div>
          </Col>

          <Col md={3} sm={6}>
            <div className="p-3 bg-light rounded-3 border">
              <div className="text-muted small">Delayed Deliverables</div>
              <div
                className={`fs-4 fw-bold ${
                  progress.delayedDeliverables > 0 ? "text-danger" : "text-success"
                }`}
              >
                {progress.delayedDeliverables}
              </div>
              <div className="small text-muted">Behind Schedule</div>
            </div>
          </Col>

          <Col md={3} sm={6}>
            <div className="p-3 bg-light rounded-3 border">
              <div className="text-muted small">Tasks Completed</div>
              <div className="fs-4 fw-bold text-dark">
                {progress.completedWorkItems} / {progress.totalWorkItems}
              </div>
              <div className="small text-muted">{progress.workItemAchievementPercent}% Tasks Done</div>
            </div>
          </Col>

          <Col md={3} sm={6}>
            <div className="p-3 bg-light rounded-3 border">
              <div className="text-muted small">Overdue Tasks</div>
              <div
                className={`fs-4 fw-bold ${
                  progress.overdueWorkItems > 0 ? "text-warning" : "text-success"
                }`}
              >
                {progress.overdueWorkItems}
              </div>
              <div className="small text-muted">Past Due Date</div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default MonthlyProgressSection;
