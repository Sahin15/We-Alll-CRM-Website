import { Badge } from 'react-bootstrap';

const STATUS_CONFIG = {
  draft:            { bg: 'secondary', textDark: false, label: 'Draft' },
  pending_hod:      { bg: 'warning',   textDark: true,  label: 'Pending HoD' },
  // Backend uses pending_admin; pending_accounts kept as display alias
  pending_admin:    { bg: 'info',      textDark: false, label: 'Pending Admin' },
  pending_accounts: { bg: 'info',      textDark: false, label: 'Pending Accounts' },
  approved:         { bg: 'success',   textDark: false, label: 'Approved' },
  rejected:         { bg: 'danger',    textDark: false, label: 'Rejected' },
  cancelled:        { bg: 'dark',      textDark: false, label: 'Cancelled' },
  converted:        { bg: 'primary',   textDark: false, label: 'Converted' },
  po_created:       { bg: 'primary',   textDark: false, label: 'PO Created' },
};

/**
 * Colour-coded badge for Purchase Request statuses.
 * Usage: <PRStatusBadge status="approved" />
 */
export const PRStatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { bg: 'secondary', textDark: false, label: status };

  return (
    <Badge
      bg={config.bg}
      text={config.textDark ? 'dark' : undefined}
      className="text-capitalize"
    >
      {config.label}
    </Badge>
  );
};

export default PRStatusBadge;
