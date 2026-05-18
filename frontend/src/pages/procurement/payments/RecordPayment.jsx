import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Card, Form, Button, Row, Col, Spinner, Alert,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import { listInvoices, getInvoice, recordPayment } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const today = () => new Date().toISOString().split('T')[0];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
];

export default function RecordPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoice') || '';

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(preselectedInvoiceId);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [paymentDate, setPaymentDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Load unpaid/partial invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const res = await listInvoices({ paymentStatus: 'unpaid,partially_paid', limit: 200 });
        const data = res.data?.data || res.data?.invoices || res.data || [];
        setInvoices(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load invoices');
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchInvoices();
  }, []);

  // Load invoice detail when selection changes
  useEffect(() => {
    if (!selectedInvoiceId) {
      setInvoiceDetail(null);
      setAmount('');
      return;
    }
    const fetchInvoiceDetail = async () => {
      setLoadingInvoice(true);
      try {
        const res = await getInvoice(selectedInvoiceId);
        const inv = res.data?.data || res.data?.invoice || res.data;
        setInvoiceDetail(inv);
        // Pre-fill amount with outstanding balance
        const outstanding = inv?.outstandingBalance ?? inv?.invoiceAmount ?? '';
        setAmount(outstanding ? String(outstanding) : '');
      } catch {
        toast.error('Failed to load invoice details');
      } finally {
        setLoadingInvoice(false);
      }
    };
    fetchInvoiceDetail();
  }, [selectedInvoiceId]);

  const outstandingBalance =
    invoiceDetail?.outstandingBalance ?? invoiceDetail?.invoiceAmount ?? 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice');
      return;
    }
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    if (amountNum > outstandingBalance) {
      toast.error(
        `Payment amount cannot exceed outstanding balance of ${formatCurrency(outstandingBalance)}`
      );
      return;
    }
    if (!referenceNumber.trim()) {
      toast.error('Reference number is required');
      return;
    }

    const payload = {
      invoice: selectedInvoiceId,
      paymentDate,
      amount: amountNum,
      paymentMethod,
      transactionReference: referenceNumber.trim(),
      notes,
    };

    setSubmitting(true);
    try {
      await recordPayment(payload);
      toast.success('Payment recorded successfully');
      navigate('/procurement/payments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Payments', href: '/procurement/payments' },
          { label: 'Record Payment' },
        ]}
      />

      <div className="d-flex align-items-center mb-4 gap-2">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </Button>
        <h4 className="mb-0 fw-bold">Record Payment</h4>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Invoice Selection */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="fw-semibold">Invoice</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Invoice <span className="text-danger">*</span>
                  </Form.Label>
                  {loadingInvoices ? (
                    <div>
                      <Spinner size="sm" className="me-2" />
                      Loading invoices…
                    </div>
                  ) : (
                    <Form.Select
                      value={selectedInvoiceId}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                      required
                    >
                      <option value="">— Select Invoice —</option>
                      {invoices.map((inv) => (
                        <option key={inv._id} value={inv._id}>
                          {inv.invoiceNumber || inv._id} —{' '}
                          {inv.vendor?.vendorName ||
                            inv.vendor?.name ||
                            inv.purchaseOrder?.vendor?.name ||
                            'Unknown'}{' '}
                          (Outstanding: {formatCurrency(inv.outstandingBalance ?? inv.invoiceAmount)})
                        </option>
                      ))}
                    </Form.Select>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {/* Invoice Summary */}
            {loadingInvoice && (
              <div className="mt-3">
                <Spinner size="sm" className="me-2" />
                Loading invoice details…
              </div>
            )}

            {invoiceDetail && !loadingInvoice && (
              <Alert variant="info" className="mt-3 mb-0 py-2">
                <Row className="g-2 small">
                  <Col md={3} sm={6}>
                    <span className="text-muted">Invoice #:</span>{' '}
                    <strong>{invoiceDetail.invoiceNumber || '—'}</strong>
                  </Col>
                  <Col md={3} sm={6}>
                    <span className="text-muted">Vendor Invoice #:</span>{' '}
                    <strong>{invoiceDetail.vendorInvoiceNumber || '—'}</strong>
                  </Col>
                  <Col md={3} sm={6}>
                    <span className="text-muted">Invoice Amount:</span>{' '}
                    <strong>{formatCurrency(invoiceDetail.invoiceAmount)}</strong>
                  </Col>
                  <Col md={3} sm={6}>
                    <span className="text-muted">Due Date:</span>{' '}
                    <strong>{formatDate(invoiceDetail.dueDate)}</strong>
                  </Col>
                  <Col md={3} sm={6}>
                    <span className="text-muted">Paid So Far:</span>{' '}
                    <strong className="text-success">
                      {formatCurrency(invoiceDetail.paidAmount ?? 0)}
                    </strong>
                  </Col>
                  <Col md={3} sm={6}>
                    <span className="text-muted">Outstanding Balance:</span>{' '}
                    <strong className="text-danger fs-6">
                      {formatCurrency(outstandingBalance)}
                    </strong>
                  </Col>
                </Row>
              </Alert>
            )}
          </Card.Body>
        </Card>

        {/* Payment Details */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="fw-semibold">Payment Details</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Payment Date <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Amount (₹) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={outstandingBalance || undefined}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                  {invoiceDetail && (
                    <Form.Text className="text-muted">
                      Max: {formatCurrency(outstandingBalance)}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Payment Method <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Reference Number <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Transaction / Cheque / UTR reference"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Any additional notes…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <div className="d-flex gap-2 justify-content-end">
          <Button
            variant="outline-secondary"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            disabled={submitting || !selectedInvoiceId}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Recording…
              </>
            ) : (
              'Record Payment'
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
}
