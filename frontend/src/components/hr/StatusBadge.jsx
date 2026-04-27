import { Badge } from "react-bootstrap";

const STATUS_CONFIG = {
  active:     { bg: "success",   label: "Active" },
  inactive:   { bg: "warning",   label: "Inactive" },
  terminated: { bg: "danger",    label: "Terminated" },
  offboarded: { bg: "secondary", label: "Offboarded" },
};

/**
 * Renders a Bootstrap Badge for an employee's lifecycle status.
 * Returns null for unknown or legacy values (on_leave, suspended).
 */
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <Badge bg={config.bg} className="px-2 py-1">
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
