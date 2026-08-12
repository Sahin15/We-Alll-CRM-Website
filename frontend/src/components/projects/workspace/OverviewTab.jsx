import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Badge,
  ProgressBar,
  ListGroup,
  Alert,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  FaCalendar,
  FaUser,
  FaUsers,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaBuilding,
  FaChartLine,
  FaBullseye,
  FaHistory,
  FaEnvelope,
  FaPhone,
  FaUserTie,
  FaFire,
} from "react-icons/fa";
import { toast } from "react-toastify";
import projectApi from "../../../api/projectApi";
import { formatDate } from "../../../utils/helpers";

/**
 * OverviewTab Component - Upgraded V2 Executive Dashboard
 * Displays real-time project health, deliverables, team workload, and activity logs
 */
const OverviewTab = ({ project, onRefresh }) => {
  const projectId = project?._id || project?.id;
  const [workspaceData, setWorkspaceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadWorkspaceData();
    }
  }, [projectId]);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProjectWorkspace(projectId);
      const data = response.data?.data || response.data || response;
      setWorkspaceData(data);
    } catch (error) {
      console.error("Failed to load workspace data:", error);
      toast.error("Failed to load project workspace data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading project overview & metrics...</p>
      </div>
    );
  }

  const proj = workspaceData?.project || project;
  const stats = workspaceData?.statistics || {};
  const teamWorkload = workspaceData?.teamWorkload || [];
  const monthProgress = workspaceData?.monthProgress || {};
  const expectationsSummary = workspaceData?.expectationsSummary || { total: 0, met: 0, open: 0 };
  const commitmentsCount = workspaceData?.commitmentsCount || 0;
  const recentActivities = workspaceData?.recentActivities || [];

  const healthStatus = monthProgress.healthStatus || "healthy";
  const achievementPercent = monthProgress.achievementPercent ?? stats.completionRate ?? 0;
  const totalDeliverables = monthProgress.totalPlannedDeliverables || 0;
  const completedDeliverables = monthProgress.completedDeliverables || 0;
  const delayedDeliverables = monthProgress.delayedDeliverables || 0;

  const totalTasks = monthProgress.totalWorkItems ?? stats.total ?? 0;
  const completedTasks = monthProgress.completedWorkItems ?? stats.done ?? 0;
  const overdueTasks = monthProgress.overdueWorkItems ?? stats.overdue ?? 0;

  const deliverables = proj.deliverables || [];

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

  const getDeliverableBadge = (status) => {
    switch (status) {
      case "delivered":
      case "approved":
        return <Badge bg="success">Delivered</Badge>;
      case "delayed":
        return <Badge bg="danger">Delayed</Badge>;
      case "pending":
      default:
        return <Badge bg="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="mt-3">
      {/* Executive Hero & Project Health Banner */}
      <Card className="mb-4 border-0 shadow-sm overflow-hidden" style={{ borderRadius: "16px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            padding: "2rem",
            color: "white",
          }}
        >
          <Row className="align-items-center">
            <Col md={8}>
              <div className="mb-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <h2 className="fw-bold mb-0 text-white">{proj.name}</h2>
                  {getHealthBadge(healthStatus)}
                </div>
                {proj.description && (
                  <p className="text-light opacity-75 mb-0">{proj.description}</p>
                )}
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <Badge bg="primary" className="px-3 py-2">
                  Status: {proj.status || "Active"}
                </Badge>
                {proj.client && (
                  <Badge bg="info" className="px-3 py-2">
                    📋 Client: {proj.client.company || proj.client.name}
                  </Badge>
                )}
                {proj.department && (
                  <Badge bg="secondary" className="px-3 py-2">
                    🏢 Service: {proj.department.name || "General"}
                  </Badge>
                )}
              </div>
            </Col>
            <Col md={4} className="text-center">
              <div className="fs-1 fw-bold text-white mb-1">{achievementPercent}%</div>
              <ProgressBar
                now={achievementPercent}
                variant={achievementPercent >= 80 ? "success" : achievementPercent >= 50 ? "warning" : "danger"}
                style={{ height: "10px", backgroundColor: "rgba(255,255,255,0.2)" }}
                className="mb-2"
              />
              <small className="text-light opacity-75 fw-semibold">Overall Delivery Achievement</small>
            </Col>
          </Row>
        </div>
      </Card>

      {/* 4 Executive KPI Cards */}
      <Row className="g-3 mb-4">
        {/* Planned Deliverables */}
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block mb-1 fw-semibold">Planned Deliverables</small>
                  <h3 className="fw-bold text-dark mb-0">
                    {completedDeliverables} / {totalDeliverables}
                  </h3>
                  {delayedDeliverables > 0 ? (
                    <small className="text-danger fw-semibold">{delayedDeliverables} Delayed</small>
                  ) : (
                    <small className="text-success fw-semibold">On Schedule</small>
                  )}
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white"
                  style={{ width: "48px", height: "48px" }}
                >
                  <FaBullseye size={22} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Work Items / Tasks */}
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block mb-1 fw-semibold">Work Items / Tasks</small>
                  <h3 className="fw-bold text-dark mb-0">
                    {completedTasks} / {totalTasks}
                  </h3>
                  {overdueTasks > 0 ? (
                    <small className="text-danger fw-semibold">{overdueTasks} Overdue Tasks</small>
                  ) : (
                    <small className="text-success fw-semibold">No Overdue Tasks</small>
                  )}
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center bg-info text-white"
                  style={{ width: "48px", height: "48px" }}
                >
                  <FaTasks size={22} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Expectations & Commitments */}
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block mb-1 fw-semibold">Expectations & Goals</small>
                  <h3 className="fw-bold text-dark mb-0">
                    {expectationsSummary.met} / {expectationsSummary.total} Met
                  </h3>
                  <small className="text-muted fw-semibold">
                    {commitmentsCount} Tracked Commitments
                  </small>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center bg-success text-white"
                  style={{ width: "48px", height: "48px" }}
                >
                  <FaCheckCircle size={22} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Team Members */}
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block mb-1 fw-semibold">Team Size</small>
                  <h3 className="fw-bold text-dark mb-0">
                    {proj.assignedUsers?.length || proj.teamMembers?.length || 0} Members
                  </h3>
                  <small className="text-muted fw-semibold">
                    Head: {proj.projectHead?.name || "Unassigned"}
                  </small>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center bg-secondary text-white"
                  style={{ width: "48px", height: "48px" }}
                >
                  <FaUsers size={22} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Split Grid */}
      <Row className="g-4 mb-4">
        {/* Left Column: Client & Project Info + Deliverables */}
        <Col lg={7}>
          {/* Client & Project Info */}
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
            <Card.Header className="bg-white py-3 border-0">
              <h6 className="mb-0 fw-bold text-dark">📋 Client & Project Information</h6>
            </Card.Header>
            <Card.Body className="p-4">
              <Row className="g-3">
                <Col md={6}>
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1 fw-semibold">Client Company</small>
                    <div className="fw-bold">{proj.client?.company || proj.client?.name || "Not assigned"}</div>
                    {proj.client?.email && (
                      <small className="text-muted d-block">
                        <FaEnvelope className="me-1" size={12} />
                        {proj.client.email}
                      </small>
                    )}
                    {proj.client?.phone && (
                      <small className="text-muted d-block">
                        <FaPhone className="me-1" size={12} />
                        {proj.client.phone}
                      </small>
                    )}
                  </div>
                </Col>

                <Col md={6}>
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1 fw-semibold">Project Head (Lead)</small>
                    <div className="d-flex align-items-center gap-2">
                      <FaUserTie className="text-primary" />
                      <div>
                        <div className="fw-bold">{proj.projectHead?.name || "Not assigned"}</div>
                        <small className="text-muted">{proj.projectHead?.designation || proj.projectHead?.email}</small>
                      </div>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1 fw-semibold">Department / Service</small>
                    <div className="fw-semibold">
                      {proj.departments && proj.departments.length > 0
                        ? proj.departments.map((d) => (typeof d === "object" ? d.name : d)).join(", ")
                        : proj.department?.name || "General"}
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1 fw-semibold">Project Timeline</small>
                    <div className="fw-semibold">
                      {proj.startDate ? formatDate(proj.startDate) : "Not set"} &rarr;{" "}
                      {proj.endDate ? formatDate(proj.endDate) : "Ongoing"}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Key Deliverables Summary */}
          <Card className="border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <Card.Header className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold text-dark">🎯 Planned Deliverables Breakdown</h6>
              <small className="text-muted">{deliverables.length} Total Deliverables</small>
            </Card.Header>
            <Card.Body className="p-4">
              {deliverables.length > 0 ? (
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Deliverable</th>
                      <th>Status</th>
                      <th>Target Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliverables.slice(0, 5).map((d, idx) => (
                      <tr key={idx}>
                        <td className="fw-semibold">{d.title}</td>
                        <td>{getDeliverableBadge(d.status)}</td>
                        <td>{d.monthKey || (d.plannedDate ? formatDate(d.plannedDate) : "-")}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted mb-0 text-center py-3">No deliverables defined for this project yet.</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: Team Workload + Activity Log */}
        <Col lg={5}>
          {/* Team Workload Distribution */}
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
            <Card.Header className="bg-white py-3 border-0">
              <h6 className="mb-0 fw-bold text-dark">👥 Team Workload Distribution</h6>
            </Card.Header>
            <Card.Body className="p-4">
              {teamWorkload.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {teamWorkload.map((member, idx) => (
                    <div key={idx} className="border-bottom pb-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold">{member.user?.name || "Team Member"}</span>
                        <small className="fw-bold text-primary">
                          {member.done} / {member.total} Tasks Done
                        </small>
                      </div>
                      <ProgressBar
                        now={member.completionRate}
                        variant={member.completionRate >= 80 ? "success" : "info"}
                        style={{ height: "6px" }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0 text-center py-3">No active task workload assigned to team members yet.</p>
              )}
            </Card.Body>
          </Card>

          {/* Recent Planning Activity Stream */}
          <Card className="border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <Card.Header className="bg-white py-3 border-0 d-flex align-items-center gap-2">
              <FaHistory className="text-primary" />
              <h6 className="mb-0 fw-bold text-dark">📜 Recent Planning Activity</h6>
            </Card.Header>
            <Card.Body className="p-4">
              {recentActivities.length > 0 ? (
                <div className="timeline ps-3 border-start">
                  {recentActivities.map((act) => (
                    <div key={act._id} className="mb-3 position-relative ps-3">
                      <div
                        className="position-absolute bg-primary rounded-circle"
                        style={{ width: "8px", height: "8px", left: "-17px", top: "6px" }}
                      />
                      <div className="fw-semibold small mb-1">{act.message}</div>
                      <small className="text-muted d-block">
                        By {act.actor ? act.actor.name : "System"} on {formatDate(act.createdAt)}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0 text-center py-3">No recent activity logs recorded yet.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OverviewTab;
