import { Card, Badge, ListGroup } from "react-bootstrap";
import { FaHistory, FaUser, FaClock } from "react-icons/fa";
import { formatDate } from "../../utils/helpers";

const HistoryTab = ({ history }) => {
  const getActionIcon = (actionType) => {
    return <FaHistory className="me-2 text-primary" />;
  };

  const getActionBadge = (actionType) => {
    const badgeMap = {
      "Created": "success",
      "Status Changed": "info",
      "Follow-up Created": "primary",
      "Follow-up Completed": "success",
      "Meeting Scheduled": "warning",
      "Meeting Completed": "success",
      "Note Added": "secondary",
      "Contact Added": "info",
      "Assigned": "primary",
      "Updated": "secondary",
    };
    return badgeMap[actionType] || "secondary";
  };

  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'hidden' }}>
      {sortedHistory.length > 0 ? (
        <ListGroup variant="flush">
          {sortedHistory.map((item, index) => (
            <ListGroup.Item key={item._id || index} className="px-3 py-2 border-0">
              <div className="d-flex align-items-start">
                <div className="me-2 mt-1">
                  {getActionIcon(item.actionType)}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <Badge bg={getActionBadge(item.actionType)} className="small">
                      {item.actionType}
                    </Badge>
                    <small className="text-muted">
                      <FaClock className="me-1" size={10} />
                      {formatDate(item.timestamp)}
                    </small>
                  </div>
                  <p className="mb-1 small">{item.description}</p>
                  {item.performedBy && (
                    <small className="text-muted">
                      <FaUser className="me-1" size={10} />
                      {item.performedBy.name}
                    </small>
                  )}
                  {item.oldValue && item.newValue && (
                    <div className="mt-1">
                      <small className="text-muted">
                        Changed from <Badge bg="secondary" className="small">{item.oldValue}</Badge> to <Badge bg="primary" className="small">{item.newValue}</Badge>
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        <p className="text-center text-muted py-3 mb-0 small">No activity history yet</p>
      )}
    </div>
  );
};

export default HistoryTab;
