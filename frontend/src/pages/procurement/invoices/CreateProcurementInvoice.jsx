import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Card, Form, Button, Row, Col, Spinner, Alert,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import { listPOs, getPO, createInvoice } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const today = () => new Date().toISOString().split('T')[0];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

export default function CreateProcurementInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPoId = searchParams.get('purchaseOrder') || '';

  const [pos, setPos] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState(preselectedPoId);
  const [poDetail, setPoDetail] = useState(null);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingPO, setLoadingPO] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Load eligible POs
  useEffect(() => {
    const fetchPOs = async () => {
      setLoadingPOs(true);
      try {
        const res = await listPOs({
          status: 'issued,partially_received,fully_received',
          limit: 200,
        });
        const data = res.data?.data || res.data?.purchaseOrders || res.data || [];
        setPos(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load purchase orders');
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchPOs();
  }, []);

  // Load PO detail when selection changes
  useEffect(() => {
    if (!selectedPoId) {
      setPoDetail(null);
      return;
    }
    const fetchPO = async () => {
      setLoadingPO(true);
      try {
        const res = await getPO(selectedPoId);
        const po = res.data?.data || res.data?.purchaseOrder || res.data;
        setPoDetail(po);
        // Pre-fill invoice amount with PO total value
        if (po?.totalValue) {
          setInvoiceAmount(String(po.totalValue));
        }
      } catch {
        toast.error('Failed to load PO details');
      } finally {
        setLoadingPO(false);
      }
    };
    fetchPO();
  }, [selectedPoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPoId) {
      toast.error('Please select a Purchase Order');
      return;
    }
    if (!vendorInvoiceNumber.trim()) {
      toast.error('Vendor Invoice Number is required');
      return;
    }
    if (!invoiceAmount || Number(invoiceAmount) <= 0) {
      toast.error('Invoice amount must be greater than 0');
      return;
    }

    const payload = {
      purchaseOrder: selectedPoId,
      vendorInvoiceNumber: vendorInvoiceNumber.trim(),
      invoiceDate,
      dueDate,
      invoiceAmount: Number(invoiceAmount),
      taxAmount: taxAmount ? Number(taxAmount) : 0,
      notes,
    };

    setSubmitting(true);
    try {
      await createInvoice(payload);
      toast.success('Invoice created successfully');
      navigate('/procurement/invoices');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
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
          { label: 'Invoices', href: '/procurement/invoices' },
          { label: 'Create Invoice' },
        ]}
      />

      <div className="d-flex align-items-center mb-4 gap-2">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </Button>
        <h4 className="mb-0 fw-bold">Create Procurement Invoice</h4>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* PO Selection */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="fw-semibold">Purchase Order</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Purchase Order <span className="text-danger">*</span>
                  </Form.Label>
                  {loadingPOs ? (
                    <div>
                      <Spinner size="sm" className="me-2" />
                      Loading POs…
                    </div>
                  ) : (
                    <Form.Select
                      value={selectedPoId}
                      onChange={(e) => setSelectedPoId(e.target.value)}
                      required
                    >
                      <option value="">— Select Purchase Order —</option>
                      {pos.map((po) => (
                        <option key={po._id} value={po._id}>
                          {po.poNumber} — {po.vendor?.vendorName || po.vendor?.name || 'Unknown'}{' '}
                          ({po.status?.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </Form.Select>
                  )}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Vendor</Form.Label>
                  <Form.Control
                    type="text"
                    value={
                      loadingPO
                        ? 'Loading…'
                        : poDetail?.vendor?.vendorName ||
                          poDetail?.vendor?.name ||
                          '—'
                    }
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* PO Reference Info */}
            {poDetail && !loadingPO && (
              <Alert variant="info" className="mt-3 mb-0 py-2">
                <Row className="g-2 small">
                  <Col md={3} sm={6}>
                    <span className="text-muted">PO Total Value:</span>{' '}
                    <strong>{formatCurrency(poDetail.totalValue)}</strong>
                  </Col>
                  <Col md={3} sm={6}>
                    <span className="text-muted">Status:</span>{' '}
                    <strong className="text-capitalize">
                      {poDetail.status?.replace(/_/g, ' ')}
                    </strong>
                  </Col>
                  <Col md={3} sm={6}>
                    <span className="text-muted">Payment Terms:</span>{' '}
                    <strong>{poDetail.paymentTerms || '—'}</strong>
                  </Col>
                  <Col md={3} sm={6}>
                    <span className="text-muted">Department:</span>{' '}
                    <strong>{poDetail.department?.name || '—'}</strong>
                  </Col>
                </Row>
              </Alert>
            )}
          </Card.Body>
        </Card>

        {/* Invoice Details */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="fw-semibold">Invoice Details</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Vendor Invoice Number <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. INV-2024-001"
                    value={vendorInvoiceNumber}
                    onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Invoice Date <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Due Date <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    min={invoiceDate}
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Invoice Amount (₹) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    required
                  />
                  {poDetail && (
                    <Form.Text className="text-muted">
                      PO Total: {formatCurrency(poDetail.totalValue)}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Tax Amount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
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
                    maxLength={1000}
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
            variant="primary"
            disabled={submitting || !selectedPoId}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Creating…
              </>
            ) : (
              'Create Invoice'
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
}
