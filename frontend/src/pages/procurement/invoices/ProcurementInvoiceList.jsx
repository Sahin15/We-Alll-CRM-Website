import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Card, Table, Button, Row, Col, Spinner, Badge,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPlus, FaEye } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { PAGE_ACCESS, checkPageAccess } from '../../../constants/pageAccess';
import { listInvoices } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';
import PaymentDueAlert from '../../../components/procurement/PaymentDueAlert';

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const paymentStatusVariant = (status) => {
  switch (status) {
    case 'paid': return 'success';
    case 'partially_paid': return 'warning';
    case 'unpaid': return 'secondary';
    case 'overdue': return 'danger';
    default: return 'secondary';
  }
};

const paymentStatusLabel = (status) => {
  switch (status) {
    case 'paid': return 'Paid';
    case 'partially_paid': return 'Partial';
    case 'unpaid': return 'Unpaid';
    case 'overdue': return 'Overdue';
    default: return status || 'Unpaid';
  }
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export default function ProcurementInvoiceList() {
  const navigate = useNavigate();
  const { canAccess } = useAuth();

  const canWrite = checkPageAccess(canAccess, PAGE_ACCESS.procurementWrite);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.paymentStatus = statusFilter;
      const res = await listInvoices(params);
      const data = res.data?.data || res.data?.invoices || res.data || [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Invoices due within 7 days (for PaymentDueAlert)
  const dueInvoices = invoices.filter((inv) => {
    if (!inv.dueDate) return false;
    const days = Math.ceil(
      (new Date(inv.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return days <= 7 && inv.paymentStatus !== 'paid';
  });

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Invoices' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">Procurement Invoices</h4>
          <small className="text-muted">Manage vendor invoices</small>
        </div>
        {canWrite && (
          <Button
            variant="primary"
            onClick={() => navigate('/procurement/invoices/create')}
          >
            <FaPlus className="me-1" /> Create Invoice
          </Button>
        )}
      </div>

      {/* Payment Due Alert */}
      <PaymentDueAlert invoices={dueInvoices} />

      {/* Status Filter */}
      <Card className="mb-3 shadow-sm">
        <Card.Body className="py-2">
          <Row className="align-items-center g-2">
            <Col xs="auto">
              <span className="fw-semibold">Filter by Status:</span>
            </Col>
            <Col xs="auto">
              <div className="d-flex flex-wrap gap-1">
                {STATUS_FILTERS.map((f) => (
                  <Button
                    key={f.value}
                    size="sm"
                    variant={statusFilter === f.value ? 'primary' : 'outline-secondary'}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading invoices…</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-2">No invoices found.</p>
              {canWrite && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/procurement/invoices/create')}
                >
                  <FaPlus className="me-1" /> Create your first invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>Invoice #</th>
                    <th>Vendor Invoice #</th>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th className="text-end">Amount</th>
                    <th className="text-end">Outstanding</th>
                    <th>Payment Status</th>
                    <th>Due Date</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const isOverdue =
                      inv.paymentStatus !== 'paid' &&
                      inv.dueDate &&
                      new Date(inv.dueDate) < new Date();
                    const effectiveStatus = isOverdue ? 'overdue' : inv.paymentStatus;

                    return (
                      <tr key={inv._id}>
                        <td className="fw-semibold text-primary">
                          {inv.invoiceNumber || inv._id}
                        </td>
                        <td>{inv.vendorInvoiceNumber || '—'}</td>
                        <td>
                          {inv.purchaseOrder ? (
                            <span
                              className="text-primary"
                              style={{ cursor: 'pointer' }}
                              onClick={() =>
                                navigate(
                                  `/procurement/purchase-orders/${
                                    inv.purchaseOrder._id || inv.purchaseOrder
                                  }`
                                )
                              }
                            >
                              {inv.purchaseOrder.poNumber || inv.purchaseOrder}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {inv.vendor?.vendorName ||
                            inv.vendor?.name ||
                            inv.purchaseOrder?.vendor?.name ||
                            '—'}
                        </td>
                        <td className="text-end fw-semibold">
                          {formatCurrency(inv.invoiceAmount)}
                        </td>
                        <td className="text-end">
                          <span
                            className={
                              (inv.outstandingBalance ?? inv.invoiceAmount) > 0
                                ? 'text-danger fw-semibold'
                                : 'text-success fw-semibold'
                            }
                          >
                            {formatCurrency(
                              inv.outstandingBalance ?? inv.invoiceAmount
                            )}
                          </span>
                        </td>
                        <td>
                          <Badge
                            bg={paymentStatusVariant(effectiveStatus)}
                            text={effectiveStatus === 'partially_paid' ? 'dark' : undefined}
                          >
                            {paymentStatusLabel(effectiveStatus)}
                          </Badge>
                        </td>
                        <td>
                          <span className={isOverdue ? 'text-danger fw-semibold' : ''}>
                            {formatDate(inv.dueDate)}
                          </span>
                        </td>
                        <td className="text-center">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() =>
                              navigate(`/procurement/invoices/${inv._id}`)
                            }
                          >
                            <FaEye />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
        {!loading && invoices.length > 0 && (
          <Card.Footer className="text-muted small">
            Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
}
