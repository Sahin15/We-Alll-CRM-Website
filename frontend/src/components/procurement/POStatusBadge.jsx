import { Badge } from 'react-bootstrap';

const STATUS_CONFIG = {
  draft:              { bg: 'secondary', label: 'Draft' },
  issued:             { bg: 'primary',   label: 'Issued' },
  partially_received: { bg: 'info',      label: 'Partially Received' },
  fully_received:     { bg: 'success',   label: 'Fully Received' },
  cancelled:          { bg: 'danger',    label: 'Cancelled' },
  closed:             { bg: 'dark',      label: 'Closed' },
};

/**
 * Colour-coded badge for Purchase Order statuses.
 * Usage: <POStatusBadge status="issued" />
 */
export const POStatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { bg: 'secondary', label: status };

  return (
    <Badge bg={config.bg} className="text-capitalize">
      {config.label}
    </Badge>
  );
};

export default POStatusBadge;
