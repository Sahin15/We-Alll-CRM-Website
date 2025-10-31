import { Card, ListGroup, Badge } from "react-bootstrap";
import { formatDateTime } from "../../utils/helpers";

const RecentActivity = ({ activities = [] }) => {
  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Recent Activity</h5>
      </Card.Header>
      <Card.Body className="p-0">
        <ListGroup variant="flush">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <ListGroup.Item key={index}>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="mb-1">{activity.description}</p>
                    <small className="text-muted">
                      {formatDateTime(activity.date)}
                    </small>
                  </div>
                  <Badge bg={activity.type || "primary"}>
                    {activity.status || "New"}
                  </Badge>
                </div>
              </ListGroup.Item>
            ))
          ) : (
            <ListGroup.Item className="text-center text-muted py-4">
              No recent activity
            </ListGroup.Item>
          )}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default RecentActivity;
