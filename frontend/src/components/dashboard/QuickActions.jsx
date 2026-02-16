import { Card, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const QuickActions = ({ actions = [] }) => {
  const navigate = useNavigate();

  const handleAction = (action) => {
    // If action has onClick, execute it
    if (action.onClick) {
      action.onClick();
    }
    // If action has path and it's not a hash link, navigate
    else if (action.path && !action.path.startsWith('#')) {
      navigate(action.path);
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
              className="d-flex align-items-center justify-content-between position-relative"
            >
              <span className="d-flex align-items-center">
                {action.icon && <span className="me-2">{action.icon}</span>}
                {action.label}
              </span>
              {action.badge && (
                <Badge 
                  bg="danger" 
                  pill
                  className="ms-2"
                  style={{ 
                    fontSize: '0.75rem',
                    minWidth: '20px'
                  }}
                >
                  {action.badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
};

export default QuickActions;
