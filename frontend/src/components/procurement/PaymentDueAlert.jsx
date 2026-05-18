import { useState } from 'react';
import { Alert, Button, Badge } from 'react-bootstrap';
import { FaBell, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const getDaysUntilDue = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

/**
 * Dismissible alert card listing invoices due within 7 days (or overdue).
 *
 * Props:
 *   invoices – Array<{ _id, invoiceNumber, vendor, dueDate, outstandingBalance }>
 */
export const PaymentDueAlert = ({ invoices = [] }) => {
  const [dismissed, setDismissed] = useState(false);

  // Only show invoices due within 7 days or already overdue
  const dueInvoices = invoices.filter((inv) => getDaysUntilDue(inv.dueDate) <= 7);

  if (dismissed || dueInvoices.length === 0) return null;

  return (
    <Alert variant="warning" className="mb-3">
      <div className="d-flex justify-content-between align-items-start">
        <div className="d-flex align-items-center gap-2 mb-2">
          <FaBell />
          <strong>
            {dueInvoices.length} Invoice{dueInvoices.length !== 1 ? 's' : ''} Due Soon
          </strong>
        </div>
        <Button
          variant="link"
          size="sm"
          className="p-0 text-dark"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <FaTimes />
        </Button>
      </div>

      <ul className="list-unstyled mb-0 small">
        {dueInvoices.map((inv) => {
          const days = getDaysUntilDue(inv.dueDate);
          const isOverdue = days < 0;

          return (
            <li
              key={inv._id}
              className="d-flex justify-content-between align-items-center py-1 border-bottom border-warning-subtle"
            >
              <div>
                <Link
                  to={`/procurement/invoices/${inv._id}`}
                  className="fw-semibold text-dark text-decoration-none"
                >
                  {inv.invoiceNumber}
                </Link>
                <span className="text-muted ms-2">{inv.vendor?.name ?? inv.vendor}</span>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="text-muted">{formatDate(inv.dueDate)}</span>
                <Badge bg={isOverdue ? 'danger' : 'warning'} text={isOverdue ? undefined : 'dark'}>
                  {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                </Badge>
                <strong>{formatCurrency(inv.outstandingBalance)}</strong>
              </div>
            </li>
          );
        })}
      </ul>
    </Alert>
  );
};

export default PaymentDueAlert;
