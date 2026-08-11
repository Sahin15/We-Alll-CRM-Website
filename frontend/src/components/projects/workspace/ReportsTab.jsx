import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Badge,
  Form,
  Table,
  Spinner,
  Row,
  Col,
  Alert,
  ProgressBar,
} from "react-bootstrap";
import {
  FaChartLine,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaPaperPlane,
  FaComments,
  FaFileAlt,
  FaDownload,
} from "react-icons/fa";
import { toast } from "react-toastify";
import projectMonthApi from "../../../api/projectMonthApi";
import { formatDate } from "../../../utils/helpers";

const ReportsTab = ({ project, canEdit }) => {
  const projectId = project?._id || project?.id;
  const now = new Date();
  const defaultMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonthKey, setSelectedMonthKey] = useState(defaultMonthKey);
  const [projectMonth, setProjectMonth] = useState(null);
  const [monthProgress, setMonthProgress] = useState(null);
  const [monthsHistory, setMonthsHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchReportData();
    }
  }, [projectId, selectedMonthKey]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [monthRes, progressRes, historyRes] = await Promise.all([
        projectMonthApi.getOrCreateProjectMonth(projectId, selectedMonthKey),
        projectMonthApi.getMonthProgress(projectId, selectedMonthKey),
        projectMonthApi.getProjectMonthsHistory(projectId),
      ]);

      if (monthRes.data && monthRes.data.data) {
        setProjectMonth(monthRes.data.data);
      }
      if (progressRes.data && progressRes.data.data) {
        setMonthProgress(progressRes.data.data);
      }
      if (historyRes.data && historyRes.data.data) {
        setMonthsHistory(historyRes.data.data);
      }
    } catch (error) {
      console.error("Error loading report data:", error);
      toast.error("Failed to load monthly report data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleSubmitReport = async () => {
    if (!projectMonth) return;
    if (!window.confirm("Submit monthly report? This will freeze the monthly execution snapshot.")) return;
    try {
      const res = await projectMonthApi.submitProjectMonthReport(projectMonth._id);
      setProjectMonth(res.data.data);
      toast.success("Monthly report submitted and snapshot frozen!");
      fetchReportData();
    } catch (error) {
      toast.error("Failed to submit monthly report");
    }
  };

  const handleReviewReport = async () => {
    const comment = window.prompt("Enter management review comment:");
    if (comment === null) return;
    try {
      const res = await projectMonthApi.reviewProjectMonthReport(projectMonth._id, { comment });
      setProjectMonth(res.data.data);
      toast.success("Management review comment recorded!");
      fetchReportData();
    } catch (error) {
      toast.error("Failed to record management review");
    }
  };

  const getHealthBadge = (health) => {
    switch (health) {
      case "healthy":
        return <Badge bg="success" className="px-3 py-2 fs-6">Healthy</Badge>;
      case "at_risk":
        return <Badge bg="warning" text="dark" className="px-3 py-2 fs-6">At Risk</Badge>;
      case "critical":
        return <Badge bg="danger" className="px-3 py-2 fs-6">Critical</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 fs-6">On Track</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "submitted":
        return <Badge bg="info" className="px-3 py-2">Submitted</Badge>;
      case "reviewed":
        return <Badge bg="success" className="px-3 py-2">Reviewed</Badge>;
      case "in_progress":
        return <Badge bg="warning" text="dark" className="px-3 py-2">In Progress</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading monthly report & snapshot...</p>
      </div>
    );
  }

  // Use frozen autoSnapshot data if submitted/reviewed, else live progress
  const snapshot = projectMonth?.autoSnapshot || {};
  const isSubmittedOrReviewed = projectMonth?.status === "submitted" || projectMonth?.status === "reviewed";

  const totalDeliverables = isSubmittedOrReviewed
    ? snapshot.plannedDeliverables ?? (monthProgress?.totalPlannedDeliverables || 0)
    : monthProgress?.totalPlannedDeliverables || 0;

  const completedDeliverables = isSubmittedOrReviewed
    ? snapshot.completedDeliverables ?? (monthProgress?.completedDeliverables || 0)
    : monthProgress?.completedDeliverables || 0;

  const delayedDeliverables = isSubmittedOrReviewed
    ? snapshot.delayedDeliverables ?? (monthProgress?.delayedDeliverables || 0)
    : monthProgress?.delayedDeliverables || 0;

  const totalTasks = isSubmittedOrReviewed
    ? snapshot.plannedWorkItems ?? (monthProgress?.totalWorkItems || 0)
    : monthProgress?.totalWorkItems || 0;

  const completedTasks = isSubmittedOrReviewed
    ? snapshot.completedWorkItems ?? (monthProgress?.completedWorkItems || 0)
    : monthProgress?.completedWorkItems || 0;

  const overdueTasks = isSubmittedOrReviewed
    ? snapshot.overdueWorkItems ?? (monthProgress?.overdueWorkItems || 0)
    : monthProgress?.overdueWorkItems || 0;

  const achievementPercent = isSubmittedOrReviewed
    ? snapshot.achievementPercent ?? (monthProgress?.achievementPercent || 0)
    : monthProgress?.achievementPercent || 0;

  const healthStatus = monthProgress?.healthStatus || "healthy";

  return (
    <div className="mt-3">
      {/* Month Selector Bar */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-3">
            <FaChartLine className="text-primary" size={24} />
            <div>
              <h5 className="mb-0 fw-bold">Monthly Execution Report</h5>
              <small className="text-muted">Planned vs Delivered Monthly Performance Snapshot</small>
            </div>
            <Form.Control
              type="month"
              size="sm"
              style={{ width: "170px" }}
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            {getStatusBadge(projectMonth?.status || "draft")}
            <Button variant="outline-dark" size="sm" onClick={handlePrintReport} title="Download / Print Report PDF">
              <FaDownload className="me-1" /> Print / PDF
            </Button>
            {canEdit && !isSubmittedOrReviewed && (
              <Button variant="success" size="sm" onClick={handleSubmitReport}>
                <FaPaperPlane className="me-1" /> Submit Report
              </Button>
            )}
            {canEdit && projectMonth?.status === "submitted" && (
              <Button variant="primary" size="sm" onClick={handleReviewReport}>
                <FaComments className="me-1" /> Management Review
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Submission Status Alert Banner */}
      {isSubmittedOrReviewed && (
        <Alert variant={projectMonth?.status === "reviewed" ? "success" : "info"} className="shadow-sm d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <FaLock size={20} />
            <div>
              <strong>
                Report {projectMonth?.status === "reviewed" ? "Reviewed by Management" : "Submitted & Frozen"}
              </strong>
              <span className="d-block small">
                {snapshot.executionNote || `Historical execution snapshot locked for period ${selectedMonthKey}`}
              </span>
            </div>
          </div>
          {projectMonth?.reviewedAt && (
            <small className="fw-semibold">
              Reviewed on {formatDate(projectMonth.reviewedAt)}
            </small>
          )}
        </Alert>
      )}

      {/* Performance Summary Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="shadow-sm border-0 h-100 text-center py-3">
            <Card.Body>
              <h6 className="text-muted mb-2">Project Health</h6>
              {getHealthBadge(healthStatus)}
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0 h-100 text-center py-3">
            <Card.Body>
              <h6 className="text-muted mb-2">Monthly Achievement</h6>
              <h3 className="fw-bold text-primary mb-1">{achievementPercent}%</h3>
              <ProgressBar
                now={achievementPercent}
                variant={achievementPercent >= 80 ? "success" : achievementPercent >= 50 ? "warning" : "danger"}
                style={{ height: "6px" }}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0 h-100 text-center py-3">
            <Card.Body>
              <h6 className="text-muted mb-2">Deliverables (Done / Total)</h6>
              <h3 className="fw-bold text-success mb-1">
                {completedDeliverables} / {totalDeliverables}
              </h3>
              {delayedDeliverables > 0 && (
                <Badge bg="warning" text="dark">
                  {delayedDeliverables} Delayed
                </Badge>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0 h-100 text-center py-3">
            <Card.Body>
              <h6 className="text-muted mb-2">Work Items (Done / Total)</h6>
              <h3 className="fw-bold text-info mb-1">
                {completedTasks} / {totalTasks}
              </h3>
              {overdueTasks > 0 && (
                <Badge bg="danger">
                  {overdueTasks} Overdue
                </Badge>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Executive Summary & Key Achievements */}
      <Row className="g-4 mb-4">
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white py-3">
              <h6 className="mb-0 fw-bold">Executive Summary</h6>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-0">
                {projectMonth?.executiveSummary || "No executive summary submitted for this month."}
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white py-3">
              <h6 className="mb-0 fw-bold">Key Achievements</h6>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-0">
                {projectMonth?.keyAchievements || "No key achievements documented for this month."}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Monthly Goals Breakdown */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3">
          <h6 className="mb-0 fw-bold">Strategic Goals for {selectedMonthKey}</h6>
        </Card.Header>
        <Card.Body>
          {projectMonth?.goals && projectMonth.goals.length > 0 ? (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Goal Title</th>
                  <th>Status</th>
                  <th>Target Month</th>
                </tr>
              </thead>
              <tbody>
                {projectMonth.goals.map((goal, idx) => (
                  <tr key={idx}>
                    <td className="fw-semibold">{goal.title}</td>
                    <td>
                      <Badge bg={goal.status === "achieved" ? "success" : "warning"}>
                        {goal.status || "in_progress"}
                      </Badge>
                    </td>
                    <td>{selectedMonthKey}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-muted mb-0 text-center py-3">No strategic goals defined for this month.</p>
          )}
        </Card.Body>
      </Card>

      {/* Management Review Comments */}
      {projectMonth?.managementComments && projectMonth.managementComments.length > 0 && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 d-flex align-items-center gap-2">
            <FaComments className="text-primary" />
            <h6 className="mb-0 fw-bold">Management Review Feedback</h6>
          </Card.Header>
          <Card.Body>
            {projectMonth.managementComments.map((c, idx) => (
              <div key={idx} className="border-bottom pb-2 mb-2">
                <p className="mb-1 fw-semibold">{c.comment}</p>
                <small className="text-muted">Reviewed on {formatDate(c.at)}</small>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}

      {/* Submitted Reports History Log Table */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaFileAlt className="text-primary" />
            <h6 className="mb-0 fw-bold">Submitted Reports History Archive</h6>
          </div>
          <small className="text-muted">All monthly report submissions for this project</small>
        </Card.Header>
        <Card.Body>
          {monthsHistory.length > 0 ? (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Snapshot Achievement</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {monthsHistory.map((m) => (
                  <tr key={m._id} className={m.monthKey === selectedMonthKey ? "table-active" : ""}>
                    <td className="fw-bold">{m.periodIdentifier || m.monthKey}</td>
                    <td>{getStatusBadge(m.status)}</td>
                    <td>
                      <Badge bg="info">
                        {m.autoSnapshot?.achievementPercent ?? "-"}%
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant={m.monthKey === selectedMonthKey ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => setSelectedMonthKey(m.periodIdentifier || m.monthKey)}
                      >
                        {m.monthKey === selectedMonthKey ? "Viewing Report" : "View Report"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-muted mb-0 text-center py-3">No report submission history found.</p>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ReportsTab;
