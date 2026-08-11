import { useState, useEffect } from "react";
import { Card, Badge, Spinner } from "react-bootstrap";
import { FaHistory, FaUser, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import projectActivityApi from "../../../api/projectActivityApi";
import { formatDate } from "../../../utils/helpers";

const ActivityTimelineSection = ({ projectId, clientId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId || clientId) {
      fetchActivities();
    }
  }, [projectId, clientId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = projectId
        ? await projectActivityApi.getProjectActivities(projectId)
        : await projectActivityApi.getClientActivities(clientId);

      if (res.data && res.data.data) {
        setActivities(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    if (action.includes("submitted")) {
      return <Badge bg="success">Submitted</Badge>;
    }
    if (action.includes("reviewed")) {
      return <Badge bg="info">Reviewed</Badge>;
    }
    if (action.includes("created")) {
      return <Badge bg="primary">Created</Badge>;
    }
    if (action.includes("updated")) {
      return <Badge bg="warning" text="dark">Updated</Badge>;
    }
    return <Badge bg="secondary">{action}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" variant="primary" />
        <span className="ms-2 text-muted">Loading activity timeline...</span>
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white d-flex align-items-center gap-2 py-3">
        <FaHistory className="text-primary" size={18} />
        <h5 className="mb-0 fw-bold">Planning Activity & Strategy Timeline</h5>
      </Card.Header>
      <Card.Body>
        {activities.length > 0 ? (
          <div className="timeline ps-3 border-start">
            {activities.map((item) => (
              <div key={item._id} className="mb-3 position-relative ps-3">
                <div
                  className="position-absolute bg-primary rounded-circle"
                  style={{
                    width: "10px",
                    height: "10px",
                    left: "-18px",
                    top: "5px",
                  }}
                />
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div>
                    <span className="fw-semibold me-2">{item.message}</span>
                    {getActionBadge(item.action)}
                  </div>
                  <small className="text-muted">{formatDate(item.createdAt)}</small>
                </div>
                <small className="text-muted d-block">
                  <FaUser className="me-1" size={12} />
                  {item.actor ? item.actor.name : "System User"} ({item.actor?.email})
                </small>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted">
            <FaHistory size={32} className="mb-2 text-secondary" />
            <p className="mb-0">No planning activity recorded yet.</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ActivityTimelineSection;
