import { Alert, Button } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

/**
 * Alert banner shown when a PR/PO amount exceeds the available budget.
 *
 * Props:
 *   budgetInfo       – { available: number, requested: number, exceeded: boolean }
 *   onConfirmOverride – () => void  — called when the user chooses to proceed
 *   onCancel          – () => void  — called when the user cancels
 */
export const BudgetWarningBanner = ({ budgetInfo, onConfirmOverride, onCancel }) => {
  if (!budgetInfo?.exceeded) return null;

  const overrun = (budgetInfo.requested ?? 0) - (budgetInfo.available ?? 0);

  return (
    <Alert variant="warning" className="d-flex flex-column gap-2">
      <div className="d-flex align-items-center gap-2">
        <FaExclamationTriangle className="flex-shrink-0" />
        <strong>Budget Exceeded</strong>
      </div>

      <div className="small">
        <div>
          Available budget:{' '}
          <strong className="text-success">{formatCurrency(budgetInfo.available)}</strong>
        </div>
        <div>
          Requested amount:{' '}
          <strong className="text-danger">{formatCurrency(budgetInfo.requested)}</strong>
        </div>
        <div>
          Overrun:{' '}
          <strong className="text-danger">{formatCurrency(overrun)}</strong>
        </div>
      </div>

      <div className="d-flex gap-2 mt-1">
        <Button variant="outline-secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="warning" size="sm" onClick={onConfirmOverride}>
          Proceed Anyway (Override)
        </Button>
      </div>
    </Alert>
  );
};

export default BudgetWarningBanner;
