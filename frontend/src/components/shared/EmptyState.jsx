import { Button } from "react-bootstrap";

const EmptyState = ({
  icon: Icon,
  title = "No data found",
  message = "There are no items to display",
  actionText,
  onAction,
  className = "",
}) => {
  return (
    <div className={`text-center py-5 ${className}`}>
      {Icon && <Icon size={64} className="text-muted mb-3" />}
      <h5 className="text-muted">{title}</h5>
      <p className="text-muted mb-3">{message}</p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
