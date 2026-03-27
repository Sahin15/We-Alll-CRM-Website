import { useState, useEffect } from "react";
import { Card, Badge, ListGroup, Button, Spinner, Alert, Tabs, Tab } from "react-bootstrap";
import { FaPhoneAlt, FaEnvelopeOpen, FaCalendarAlt, FaBell, FaCheck, FaExclamationTriangle, FaClock, FaEye, FaUsers, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { leadApi } from "../../api/leadApi";
import { formatDate } from "../../utils/helpers";
import { useAuth } from "../../context/AuthContext";

const FollowUpDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [myOnly, setMyOnly] = useState(false);
  const isManager = ['admin', 'superadmin', 'manager', 'hod'].includes(user?.role);
  const [followUpData, setFollowUpData] = useState({
    overdue: [],
    today: [],
    upcoming: [],
    summary: { overdueCount: 0, todayCount: 0, upcomingCount: 0, totalPending: 0 }
  });
  const [activeTab, setActiveTab] = useState("overdue");

  useEffect(() => {
    fetchFollowUpData();
    const interval = setInterval(fetchFollowUpData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [myOnly]);

  const fetchFollowUpData = async () => {
    try {
      const params = myOnly ? { myOnly: 'true' } : {};
      const response = await leadApi.getFollowUpDashboard(params);
      setFollowUpData(response.data);
    } catch (error) {
      console.error("Error fetching follow-up data:", error);
      toast.error("Failed to load follow-up data");
    } finally {
      setLoading(false);
    }
  };

  const getFollowUpIcon = (type) => {
    switch (type) {
      case "Call":
        return <FaPhoneAlt className="me-2" />;
      case "Email":
        return <FaEnvelopeOpen className="me-2" />;
      case "Meeting":
        return <FaCalendarAlt className="me-2" />;
      case "Reminder":
        return <FaBell className="me-2" />;
      default:
        return null;
    }
  };

  const getTemperatureBadge = (temp) => {
    if (!temp) return null;
    const colors = {
      Hot: "danger",
      Warm: "warning",
      Cold: "info"
    };
    const icons = {
      Hot: "🔴",
      Warm: "🟡",
      Cold: "🔵"
    };
    return (
      <Badge bg={colors[temp]} className="ms-2">
        {icons[temp]} {temp}
      </Badge>
    );
  };

  const handleCompleteFollowUp = async (leadId, followUpId) => {
    try {
      await leadApi.completeFollowUp(leadId, followUpId);
      toast.success("Follow-up marked as completed");
      fetchFollowUpData();
    } catch (error) {
      toast.error("Failed to complete follow-up");
    }
  };

  const renderFollowUpItem = (followUp, urgencyLevel) => {
    const urgencyColors = {
      overdue: "danger",
      today: "warning",
      upcoming: "info"
    };

    return (
      <ListGroup.Item
        key={followUp._id}
        className="d-flex justify-content-between align-items-start py-3"
        style={{ borderLeft: `4px solid var(--bs-${urgencyColors[urgencyLevel]})` }}
      >
        <div className="flex-grow-1">
          <div className="d-flex align-items-center mb-2">
            {getFollowUpIcon(followUp.followUpType)}
            <strong className="me-2">{followUp.leadName}</strong>
            {followUp.leadCompany && (
              <small className="text-muted">({followUp.leadCompany})</small>
            )}
            {getTemperatureBadge(followUp.leadTemperature)}
          </div>
          
          <div className="mb-2">
            <Badge bg={urgencyColors[urgencyLevel]} className="me-2">
              {followUp.followUpType}
            </Badge>
            <Badge bg="secondary">
              {followUp.leadStatus}
            </Badge>
          </div>

          <div className="text-muted small mb-1">
            <FaClock className="me-1" />
            Scheduled: {formatDate(followUp.scheduledDate)}
          </div>

          {followUp.notes && (
            <div className="text-muted small">
              <em>"{followUp.notes}"</em>
            </div>
          )}

          <div className="text-muted small mt-1">
            📞 {followUp.leadPhone} {followUp.leadEmail && `| ✉️ ${followUp.leadEmail}`}
          </div>
        </div>

        <div className="d-flex flex-column gap-2 ms-3">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => navigate(`/leads/${followUp.leadId}`)}
            title="View Lead"
          >
            <FaEye />
          </Button>
          <Button
            size="sm"
            variant="outline-success"
            onClick={() => handleCompleteFollowUp(followUp.leadId, followUp._id)}
            title="Mark as Complete"
          >
            <FaCheck />
          </Button>
        </div>
      </ListGroup.Item>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading follow-ups...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">📅 Follow-Up Dashboard</h5>
        <div className="d-flex align-items-center gap-2">
          {isManager && (
            <div className="btn-group btn-group-sm">
              <button
                className={`btn btn-sm ${!myOnly ? 'btn-light' : 'btn-outline-light'}`}
                onClick={() => setMyOnly(false)}
              >
                <FaUsers size={11} className="me-1" /> All
              </button>
              <button
                className={`btn btn-sm ${myOnly ? 'btn-light' : 'btn-outline-light'}`}
                onClick={() => setMyOnly(true)}
              >
                <FaUser size={11} className="me-1" /> Mine
              </button>
            </div>
          )}
          <Badge bg="light" text="dark" className="fs-6">
            {followUpData.summary.totalPending} Pending
          </Badge>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {followUpData.summary.totalPending === 0 ? (
          <div className="text-center py-5">
            <FaCheck size={48} className="text-success mb-3" />
            <h5>All Caught Up!</h5>
            <p className="text-muted">No pending follow-ups at the moment.</p>
          </div>
        ) : (
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-0"
            fill
          >
            <Tab
              eventKey="overdue"
              title={
                <span>
                  <FaExclamationTriangle className="me-2" />
                  Overdue
                  {followUpData.summary.overdueCount > 0 && (
                    <Badge bg="danger" className="ms-2">
                      {followUpData.summary.overdueCount}
                    </Badge>
                  )}
                </span>
              }
            >
              {followUpData.overdue.length > 0 ? (
                <>
                  <Alert variant="danger" className="m-3 mb-0">
                    <FaExclamationTriangle className="me-2" />
                    <strong>{followUpData.summary.overdueCount}</strong> overdue follow-up(s) need immediate attention!
                  </Alert>
                  <ListGroup variant="flush">
                    {followUpData.overdue.map(followUp => renderFollowUpItem(followUp, "overdue"))}
                  </ListGroup>
                </>
              ) : (
                <div className="text-center py-5">
                  <FaCheck size={36} className="text-success mb-3" />
                  <p className="text-muted">No overdue follow-ups</p>
                </div>
              )}
            </Tab>

            <Tab
              eventKey="today"
              title={
                <span>
                  <FaClock className="me-2" />
                  Today
                  {followUpData.summary.todayCount > 0 && (
                    <Badge bg="warning" className="ms-2">
                      {followUpData.summary.todayCount}
                    </Badge>
                  )}
                </span>
              }
            >
              {followUpData.today.length > 0 ? (
                <>
                  <Alert variant="warning" className="m-3 mb-0">
                    <FaClock className="me-2" />
                    <strong>{followUpData.summary.todayCount}</strong> follow-up(s) scheduled for today
                  </Alert>
                  <ListGroup variant="flush">
                    {followUpData.today.map(followUp => renderFollowUpItem(followUp, "today"))}
                  </ListGroup>
                </>
              ) : (
                <div className="text-center py-5">
                  <FaCalendarAlt size={36} className="text-muted mb-3" />
                  <p className="text-muted">No follow-ups scheduled for today</p>
                </div>
              )}
            </Tab>

            <Tab
              eventKey="upcoming"
              title={
                <span>
                  <FaCalendarAlt className="me-2" />
                  Upcoming (7 days)
                  {followUpData.summary.upcomingCount > 0 && (
                    <Badge bg="info" className="ms-2">
                      {followUpData.summary.upcomingCount}
                    </Badge>
                  )}
                </span>
              }
            >
              {followUpData.upcoming.length > 0 ? (
                <>
                  <Alert variant="info" className="m-3 mb-0">
                    <FaCalendarAlt className="me-2" />
                    <strong>{followUpData.summary.upcomingCount}</strong> follow-up(s) in the next 7 days
                  </Alert>
                  <ListGroup variant="flush">
                    {followUpData.upcoming.map(followUp => renderFollowUpItem(followUp, "upcoming"))}
                  </ListGroup>
                </>
              ) : (
                <div className="text-center py-5">
                  <FaCalendarAlt size={36} className="text-muted mb-3" />
                  <p className="text-muted">No upcoming follow-ups in the next 7 days</p>
                </div>
              )}
            </Tab>
          </Tabs>
        )}
      </Card.Body>
    </Card>
  );
};

export default FollowUpDashboard;
