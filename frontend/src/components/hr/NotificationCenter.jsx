import { useState, useEffect } from "react";
import { Card, Badge, ListGroup, Button, Spinner, Nav } from "react-bootstrap";
import { FaBell, FaCalendarAlt, FaTasks, FaUsers, FaExclamationCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { leaveApi } from "../../api/leaveApi";
import { toast } from "react-toastify";

const NotificationCenter = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const notifs = [];

      // Fetch pending leaves
      const leaveRes = await leaveApi.getAllLeaves("pending");
      if (leaveRes.data?.length > 0) {
        leaveRes.data.forEach((leave) => {
          notifs.push({
            id: leave._id,
            type: "leave",
            icon: <FaCalendarAlt />,
            title: "Pending Leave Request",
            message: `${leave.employee?.name || "Employee"} requested ${leave.leaveType} leave`,
            time: new Date(leave.createdAt),
            variant: "warning",
            action: () => navigate("/leaves/requests"),
          });
        });
      }

      // Sort by time
      notifs.sort((a, b) => b.time - a.time);
      setNotifications(notifs);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "all") return true;
    return notif.type === activeTab;
  });

  const notificationCount = notifications.length;

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <FaBell className="me-2 text-primary" />
              Notification Center
              {notificationCount > 0 && (
                <Badge bg="danger" className="ms-2">
                  {notificationCount}
                </Badge>
              )}
            </h5>
          </div>
          <Button
            variant="link"
            size="sm"
            className="text-decoration-none"
            onClick={fetchNotifications}
          >
            Refresh
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {/* Tabs */}
        <Nav variant="tabs" className="px-3 pt-2">
          <Nav.Item>
            <Nav.Link
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              className="py-2"
            >
              All
              {notificationCount > 0 && (
                <Badge bg="secondary" className="ms-1">
                  {notificationCount}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={activeTab === "leave"}
              onClick={() => setActiveTab("leave")}
              className="py-2"
            >
              Leaves
              {notifications.filter((n) => n.type === "leave").length > 0 && (
                <Badge bg="warning" className="ms-1">
                  {notifications.filter((n) => n.type === "leave").length}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={activeTab === "task"}
              onClick={() => setActiveTab("task")}
              className="py-2"
            >
              Tasks
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={activeTab === "meeting"}
              onClick={() => setActiveTab("meeting")}
              className="py-2"
            >
              Meetings
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Notification List */}
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FaBell size={40} className="mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <ListGroup variant="flush">
              {filteredNotifications.map((notif) => (
                <ListGroup.Item
                  key={notif.id}
                  action
                  onClick={notif.action}
                  className="border-start-0 border-end-0"
                >
                  <div className="d-flex align-items-start">
                    <div
                      className={`me-3 p-2 rounded bg-${notif.variant} bg-opacity-10 text-${notif.variant}`}
                    >
                      {notif.icon}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong className="d-block">{notif.title}</strong>
                          <small className="text-muted">{notif.message}</small>
                        </div>
                        <small className="text-muted text-nowrap ms-2">
                          {getTimeAgo(notif.time)}
                        </small>
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default NotificationCenter;
