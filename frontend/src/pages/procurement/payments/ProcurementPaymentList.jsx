import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Card, Table, Button, Row, Col, Spinner, Badge,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPlus } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { PAGE_ACCESS, checkPageAccess } from '../../../constants/pageAccess';
import { listPayments } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

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

const paymentMethodLabel = (method) => {
  switch (method) {
    case 'bank_transfer': return 'Bank Transfer';
    case 'cheque': return 'Cheque';
    case 'upi': return 'UPI';
    case 'cash': return 'Cash';
    default: return method || '—';
  }
};

const paymentMethodVariant = (method) => {
  switch (method) {
    case 'bank_transfer': return 'primary';
    case 'cheque': return 'info';
    case 'upi': return 'success';
    case 'cash': return 'warning';
    default: return 'secondary';
  }
};

const METHOD_FILTERS = [
  { value: '', label: 'All Methods' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
];

export default function ProcurementPaymentList() {
  const navigate = useNavigate();
  const { canAccess } = useAuth();

  const canWrite = checkPageAccess(canAccess, PAGE_ACCESS.procurementWrite);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (methodFilter) params.paymentMethod = methodFilter;
      const res = await listPayments(params);
      const data = res.data?.data || res.data?.payments || res.data || [];
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Payments' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">Procurement Payments</h4>
          <small className="text-muted">All recorded vendor payments</small>
        </div>
        {canWrite && (
          <Button
            variant="success"
            onClick={() => navigate('/procurement/payments/create')}
          >
            <FaPlus className="me-1" /> Record Payment
          </Button>
        )}
      </div>

      {/* Method Filter */}
      <Card className="mb-3 shadow-sm">
        <Card.Body className="py-2">
          <Row className="align-items-center g-2">
            <Col xs="auto">
              <span className="fw-semibold">Filter by Method:</span>
            </Col>
            <Col xs="auto">
              <div className="d-flex flex-wrap gap-1">
                {METHOD_FILTERS.map((f) => (
                  <Button
                    key={f.value}
                    size="sm"
                    variant={methodFilter === f.value ? 'primary' : 'outline-secondary'}
                    onClick={() => setMethodFilter(f.value)}
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
              <p className="mt-2 text-muted">Loading payments…</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-2">No payments found.</p>
              {canWrite && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => navigate('/procurement/payments/create')}
                >
                  <FaPlus className="me-1" /> Record your first payment
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>Payment Date</th>
                    <th>Invoice #</th>
                    <th>Vendor</th>
                    <th className="text-end">Amount</th>
                    <th>Payment Method</th>
                    <th>Reference Number</th>
                    <th>Recorded By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pmt) => (
                    <tr key={pmt._id}>
                      <td>{formatDate(pmt.paymentDate)}</td>
                      <td>
                        {pmt.invoice ? (
                          <span
                            className="fw-semibold text-primary"
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                              navigate(
                                `/procurement/invoices/${
                                  pmt.invoice._id || pmt.invoice
                                }`
                              )
                            }
                          >
                            {pmt.invoice.invoiceNumber || pmt.invoice._id || pmt.invoice}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {pmt.vendor?.vendorName ||
                          pmt.vendor?.name ||
                          pmt.invoice?.vendor?.name ||
                          '—'}
                      </td>
                      <td className="text-end fw-semibold text-success">
                        {formatCurrency(pmt.amount)}
                      </td>
                      <td>
                        <Badge
                          bg={paymentMethodVariant(pmt.paymentMethod)}
                          text={pmt.paymentMethod === 'cash' ? 'dark' : undefined}
                        >
                          {paymentMethodLabel(pmt.paymentMethod)}
                        </Badge>
                      </td>
                      <td className="text-muted">
                        {pmt.transactionReference || pmt.referenceNumber || '—'}
                      </td>
                      <td>
                        {pmt.recordedBy?.name || pmt.recordedBy?.email || '—'}
                      </td>
                      <td className="text-muted">{pmt.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
        {!loading && payments.length > 0 && (
          <Card.Footer className="d-flex justify-content-between align-items-center text-muted small">
            <span>
              Showing {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </span>
            <span className="fw-semibold text-dark">
              Total: {formatCurrency(totalAmount)}
            </span>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
}
