import { Badge } from "react-bootstrap";

const StatusBadge = ({ status, customColors = {} }) => {
  const defaultColors = {
    active: "success",
    inactive: "secondary",
    pending: "warning",
    suspended: "danger",
    cancelled: "dark",
    completed: "success",
    "in progress": "primary",
    draft: "secondary",
    sent: "info",
    paid: "success",
    overdue: "danger",
    verified: "success",
    rejected: "danger",
    ...customColors,
  };

  const variant = defaultColors[status?.toLowerCase()] || "secondary";

  return (
    <Badge bg={variant} className="text-capitalize">
      {status}
    </Badge>
  );
};

export default StatusBadge;
