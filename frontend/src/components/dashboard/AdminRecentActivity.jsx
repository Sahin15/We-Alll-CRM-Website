import { Card, ListGroup, Badge } from 'react-bootstrap';
import { 
  FaUser, 
  FaProjectDiagram, 
  FaFileAlt, 
  FaUserPlus, 
  FaCheckCircle,
  FaClock
} from 'react-icons/fa';

const AdminRecentActivity = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'user': return <FaUser className="text-primary" />;
      case 'project': return <FaProjectDiagram className="text-success" />;
      case 'document': return <FaFileAlt className="text-info" />;
      case 'employee': return <FaUserPlus className="text-warning" />;
      case 'approval': return <FaCheckCircle className="text-success" />;
      default: return <FaClock className="text-secondary" />;
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now - activityDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Sample activities if none provided
  const defaultActivities = [
    { id: 1, type: 'user', message: 'New user John Doe registered', time: new Date(Date.now() - 300000) },
    { id: 2, type: 'project', message: 'Project "Website Redesign" marked as completed', time: new Date(Date.now() - 1800000) },
    { id: 3, type: 'document', message: 'New policy document uploaded', time: new Date(Date.now() - 3600000) },
    { id: 4, type: 'approval', message: 'Leave request approved for Jane Smith', time: new Date(Date.now() - 7200000) },
    { id: 5, type: 'employee', message: 'New employee onboarded in Sales dept', time: new Date(Date.now() - 86400000) },
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Recent Activity</h5>
          <Badge bg="primary" pill>{displayActivities.length}</Badge>
        </div>
        <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {displayActivities.slice(0, 10).map((activity) => (
            <ListGroup.Item 
              key={activity.id} 
              className="px-0 py-3 border-bottom"
              style={{ transition: 'all 0.2s ease' }}
            >
              <div className="d-flex align-items-start">
                <div className="me-3 mt-1" style={{ fontSize: '1.2rem' }}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-grow-1">
                  <p className="mb-1">{activity.message}</p>
                  <small className="text-muted">
                    <FaClock className="me-1" style={{ fontSize: '0.75rem' }} />
                    {getTimeAgo(activity.time)}
                  </small>
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
        {displayActivities.length === 0 && (
          <div className="text-center py-4 text-muted">
            <FaClock style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p className="mt-2 mb-0">No recent activity</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AdminRecentActivity;
