import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Spinner, Alert, Badge,
} from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaFileInvoiceDollar, FaMoneyBillWave } from 'react-icons/fa';
import { getInvoice } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const formatDateTime = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
    default: return 'secondary';
  }
};

const paymentStatusLabel = (status) => {
  switch (status) {
    case 'paid': return 'Paid';
    case 'partially_paid': return 'Partially Paid';
    case 'unpaid': return 'Unpaid';
    default: return status || 'Unpaid';
  }
};

const paymentMethodLabel = (method) => {
  switch (method) {
    case 'bank_transfer': return 'Bank Transfer';
    case 'cheque': return 'Cheque';
    case 'upi': return 'UPI';
    case 'cash': return 'Cash';
    default: return method || '—';
  }
};

export default function ProcurementInvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoice(id);
      const raw = res.data;
      setInvoice(raw?.data ?? raw?.invoice ?? raw);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <Container fluid className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading Invoice…</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          {error}{' '}
          <Button
            variant="link"
            className="p-0"
            onClick={() => navigate('/procurement/invoices')}
          >
            Back to list
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!invoice) return null;

  const po = invoice.purchaseOrder;
  const vendor = invoice.vendor || po?.vendor;
  const payments = invoice.payments || [];
  const isOverdue =
    invoice.paymentStatus !== 'paid' &&
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date();
  const canRecordPayment =
    invoice.paymentStatus !== 'paid' &&
    (invoice.outstandingBalance ?? invoice.invoiceAmount) > 0;

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Invoices', href: '/procurement/invoices' },
          { label: invoice.invoiceNumber || 'Details' },
        ]}
      />

      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => navigate('/procurement/invoices')}
            >
              <FaArrowLeft />
            </Button>
            <FaFileInvoiceDollar className="text-warning fs-5" />
            <h4 className="mb-0 fw-bold">{invoice.invoiceNumber || invoice._id}</h4>
            <Badge
              bg={paymentStatusVariant(invoice.paymentStatus)}
              text={invoice.paymentStatus === 'partially_paid' ? 'dark' : undefined}
            >
              {paymentStatusLabel(invoice.paymentStatus)}
            </Badge>
            {isOverdue && (
              <Badge bg="danger">Overdue</Badge>
            )}
          </div>
          <small className="text-muted">Created {formatDateTime(invoice.createdAt)}</small>
        </div>

        {canRecordPayment && (
          <Button
            variant="success"
            onClick={() =>
              navigate(`/procurement/payments/create?invoice=${invoice._id}`)
            }
          >
            <FaMoneyBillWave className="me-1" /> Record Payment
          </Button>
        )}
      </div>

      {/* Invoice Details */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-warning bg-opacity-75 fw-semibold">
          Invoice Information
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4} sm={6}>
              <div className="text-muted small">Invoice Number</div>
              <div className="fw-semibold">{invoice.invoiceNumber || '—'}</div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Vendor Invoice #</div>
              <div className="fw-semibold">{invoice.vendorInvoiceNumber || '—'}</div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Linked PO</div>
              <div>
                {po ? (
                  <Link
                    to={`/procurement/purchase-orders/${po._id || po}`}
                    className="fw-semibold text-primary text-decoration-none"
                  >
                    {po.poNumber || po._id || po}
                  </Link>
                ) : (
                  '—'
                )}
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Vendor</div>
              <div className="fw-semibold">
                {vendor?.vendorName || vendor?.name || '—'}
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Invoice Date</div>
              <div>{formatDate(invoice.invoiceDate)}</div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Due Date</div>
              <div className={isOverdue ? 'text-danger fw-semibold' : ''}>
                {formatDate(invoice.dueDate)}
                {isOverdue && ' (Overdue)'}
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Invoice Amount</div>
              <div className="fw-bold text-primary fs-5">
                {formatCurrency(invoice.invoiceAmount)}
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Paid Amount</div>
              <div className="fw-semibold text-success">
                {formatCurrency(invoice.paidAmount ?? 0)}
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Outstanding Balance</div>
              <div
                className={
                  (invoice.outstandingBalance ?? invoice.invoiceAmount) > 0
                    ? 'fw-bold text-danger fs-5'
                    : 'fw-bold text-success fs-5'
                }
              >
                {formatCurrency(invoice.outstandingBalance ?? invoice.invoiceAmount)}
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Payment Status</div>
              <div>
                <Badge
                  bg={paymentStatusVariant(invoice.paymentStatus)}
                  text={invoice.paymentStatus === 'partially_paid' ? 'dark' : undefined}
                >
                  {paymentStatusLabel(invoice.paymentStatus)}
                </Badge>
              </div>
            </Col>
            {invoice.notes && (
              <Col md={12}>
                <div className="text-muted small">Notes</div>
                <div style={{ whiteSpace: 'pre-line' }}>{invoice.notes}</div>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Payments */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex align-items-center justify-content-between fw-semibold">
          <div className="d-flex align-items-center gap-2">
            <FaMoneyBillWave className="text-success" />
            Payments ({payments.length})
          </div>
          {canRecordPayment && (
            <Button
              size="sm"
              variant="success"
              onClick={() =>
                navigate(`/procurement/payments/create?invoice=${invoice._id}`)
              }
            >
              <FaMoneyBillWave className="me-1" /> Record Payment
            </Button>
          )}
        </Card.Header>
        <Card.Body className="p-0">
          {payments.length === 0 ? (
            <p className="text-muted p-3 mb-0">No payments recorded yet.</p>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>Payment Date</th>
                    <th className="text-end">Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Recorded By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pmt) => (
                    <tr key={pmt._id}>
                      <td>{formatDate(pmt.paymentDate)}</td>
                      <td className="text-end fw-semibold text-success">
                        {formatCurrency(pmt.amount)}
                      </td>
                      <td>{paymentMethodLabel(pmt.paymentMethod)}</td>
                      <td className="text-muted">{pmt.transactionReference || pmt.referenceNumber || '—'}</td>
                      <td>{pmt.recordedBy?.name || pmt.recordedBy?.email || '—'}</td>
                      <td className="text-muted">{pmt.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
