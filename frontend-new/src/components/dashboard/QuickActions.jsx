import { Card, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const QuickActions = ({ actions = [] }) => {
  const navigate = useNavigate();

  const handleAction = (action) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.onClick) {
      action.onClick();
    }
  };

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Quick Actions</h5>
      </Card.Header>
      <Card.Body>
        <div className="d-grid gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline-primary"}
              onClick={() => handleAction(action)}
              className="d-flex align-items-center justify-content-center"
            >
              {action.icon && <span className="me-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
};

export default QuickActions;
