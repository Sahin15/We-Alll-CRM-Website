import { Button } from "react-bootstrap";

/** @param {{ title: string, description?: string, actionLabel?: string, onAction?: () => void }} props */
const PayrollEmptyState = ({ title, description, actionLabel, onAction }) => (
  <div className="payroll-empty-state">
    <h5 className="mb-2">{title}</h5>
    {description && <p className="text-muted small mb-3">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default PayrollEmptyState;
