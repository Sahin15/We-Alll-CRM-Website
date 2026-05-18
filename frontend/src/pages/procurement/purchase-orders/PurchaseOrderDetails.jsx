import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Spinner, Alert,
  Badge, Modal, Form,
} from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaPaperPlane, FaTimes, FaFilePdf, FaBoxOpen,
  FaFileInvoiceDollar,
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import {
  getPO, issuePO, cancelPO, getPOPdf, listGRs, listInvoices,
} from '../../../api/procurementApi';
import POStatusBadge from '../../../components/procurement/POStatusBadge';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount ?? 0);

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const formatDateTime = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

// Roles allowed to issue / cancel POs
const PRIVILEGED_ROLES = ['admin', 'accounts', 'superadmin', 'manager'];

export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [po, setPo] = useState(null);
  const [grs, setGrs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Issue / PDF action state
  const [issuing, setIssuing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Cancel modal
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role?.toLowerCase());

  // ── Fetch PO + related data ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [poRes, grsRes, invoicesRes] = await Promise.allSettled([
        getPO(id),
        listGRs({ purchaseOrder: id }),
        listInvoices({ purchaseOrder: id }),
      ]);

      if (poRes.status === 'fulfilled') {
        const raw = poRes.value.data;
        setPo(raw?.data ?? raw?.purchaseOrder ?? raw);
      } else {
        throw new Error(poRes.reason?.response?.data?.message || 'Failed to load PO.');
      }

      if (grsRes.status === 'fulfilled') {
        const raw = grsRes.value.data;
        setGrs(Array.isArray(raw) ? raw : raw?.data ?? raw?.goodsReceipts ?? []);
      }

      if (invoicesRes.status === 'fulfilled') {
        const raw = invoicesRes.value.data;
        setInvoices(Array.isArray(raw) ? raw : raw?.data ?? raw?.invoices ?? []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Purchase Order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Issue PO ────────────────────────────────────────────────────────────────
  const handleIssue = async () => {
    if (!window.confirm(`Issue PO "${po.poNumber}"? This will notify the vendor.`)) return;
    setIssuing(true);
    try {
      await issuePO(id);
      toast.success(`PO ${po.poNumber} issued successfully.`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue PO.');
    } finally {
      setIssuing(false);
    }
  };

  // ── Cancel PO ───────────────────────────────────────────────────────────────
  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      toast.warning('Please provide a cancellation reason.');
      return;
    }
    setCancelling(true);
    try {
      await cancelPO(id, { reason: cancelReason });
      toast.success(`PO ${po.poNumber} cancelled.`);
      setCancelModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel PO.');
    } finally {
      setCancelling(false);
    }
  };

  // ── Download PDF ────────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await getPOPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${po.poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Render states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Container fluid className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading Purchase Order…</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          {error}{' '}
          <Button variant="link" className="p-0" onClick={() => navigate('/procurement/purchase-orders')}>
            Back to list
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!po) return null;

  const lineItemsTotal = (po.lineItems || []).reduce(
    (sum, li) => sum + (li.quantity || 0) * (li.unitPrice || 0),
    0,
  );

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Orders', href: '/procurement/purchase-orders' },
          { label: po.poNumber || 'Details' },
        ]}
      />

      {/* ── Header ── */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => navigate('/procurement/purchase-orders')}
            >
              <FaArrowLeft />
            </Button>
            <h4 className="mb-0 fw-bold">{po.poNumber}</h4>
            <POStatusBadge status={po.status} />
          </div>
          <small className="text-muted">Created {formatDateTime(po.createdAt)}</small>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          {/* Issue button — draft only, privileged users */}
          {po.status === 'draft' && isPrivileged && (
            <Button variant="success" onClick={handleIssue} disabled={issuing}>
              {issuing
                ? <Spinner size="sm" animation="border" className="me-1" />
                : <FaPaperPlane className="me-1" />}
              Issue PO
            </Button>
          )}

          {/* Cancel button — draft only, privileged users */}
          {po.status === 'draft' && isPrivileged && (
            <Button variant="outline-danger" onClick={() => { setCancelModal(true); setCancelReason(''); }}>
              <FaTimes className="me-1" /> Cancel PO
            </Button>
          )}

          {/* Download PDF */}
          <Button variant="outline-secondary" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf
              ? <Spinner size="sm" animation="border" className="me-1" />
              : <FaFilePdf className="me-1" />}
            Download PDF
          </Button>
        </div>
      </div>

      {/* ── PO Header Info ── */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white fw-semibold">Order Information</Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4} sm={6}>
              <div className="text-muted small">PO Number</div>
              <div className="fw-semibold">{po.poNumber}</div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Status</div>
              <div><POStatusBadge status={po.status} /></div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Vendor</div>
              <div className="fw-semibold">
                {po.vendor?.vendorName || po.vendor?.name || '—'}
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Department</div>
              <div>{po.department?.name || po.department || '—'}</div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Payment Terms</div>
              <div>{po.paymentTerms || '—'}</div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Expected Delivery</div>
              <div>{formatDate(po.expectedDeliveryDate)}</div>
            </Col>
            <Col md={4} sm={6}>
              <div className="text-muted small">Total Value</div>
              <div className="fw-bold text-primary fs-5">{formatCurrency(po.totalValue)}</div>
            </Col>
            {po.issuedAt && (
              <Col md={4} sm={6}>
                <div className="text-muted small">Issued At</div>
                <div>{formatDateTime(po.issuedAt)}</div>
              </Col>
            )}
            {po.issuedBy && (
              <Col md={4} sm={6}>
                <div className="text-muted small">Issued By</div>
                <div>{po.issuedBy?.name || po.issuedBy?.email || '—'}</div>
              </Col>
            )}
            {po.cancellationReason && (
              <Col md={8} sm={12}>
                <div className="text-muted small">Cancellation Reason</div>
                <div className="text-danger">{po.cancellationReason}</div>
              </Col>
            )}
            <Col md={12}>
              <div className="text-muted small">Delivery Address</div>
              <div style={{ whiteSpace: 'pre-line' }}>{po.deliveryAddress || '—'}</div>
            </Col>
            {po.notes && (
              <Col md={12}>
                <div className="text-muted small">Notes</div>
                <div style={{ whiteSpace: 'pre-line' }}>{po.notes}</div>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* ── Line Items ── */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white fw-semibold">Line Items</Card.Header>
        <Card.Body className="p-0">
          {(po.lineItems || []).length === 0 ? (
            <p className="text-muted p-3 mb-0">No line items.</p>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Item Name</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lineItems.map((li, idx) => (
                    <tr key={li._id || idx}>
                      <td className="text-muted">{idx + 1}</td>
                      <td className="fw-semibold">{li.itemName}</td>
                      <td className="text-muted">{li.description || '—'}</td>
                      <td>
                        {li.category && (
                          <Badge bg="light" text="dark" className="border">
                            {li.category}
                          </Badge>
                        )}
                      </td>
                      <td className="text-end">{li.quantity}</td>
                      <td className="text-end">{formatCurrency(li.unitPrice)}</td>
                      <td className="text-end fw-semibold">
                        {formatCurrency((li.quantity || 0) * (li.unitPrice || 0))}
                      </td>
                      <td className="text-end">
                        <span
                          className={
                            li.receivedQuantity >= li.quantity
                              ? 'text-success fw-semibold'
                              : li.receivedQuantity > 0
                              ? 'text-warning fw-semibold'
                              : 'text-muted'
                          }
                        >
                          {li.receivedQuantity ?? 0} / {li.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <td colSpan={6} className="text-end fw-bold">Grand Total</td>
                    <td className="text-end fw-bold text-primary">{formatCurrency(lineItemsTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Linked PRs ── */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-secondary text-white fw-semibold">
          Linked Purchase Requests
        </Card.Header>
        <Card.Body>
          {(po.linkedPRs || []).length === 0 ? (
            <p className="text-muted mb-0">No linked Purchase Requests.</p>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {po.linkedPRs.map((pr) => {
                const prId = pr._id || pr;
                const prNumber = pr.prNumber || prId;
                return (
                  <Link
                    key={prId}
                    to={`/procurement/purchase-requests/${prId}`}
                    className="text-decoration-none"
                  >
                    <Badge bg="info" text="dark" className="fs-6 px-3 py-2">
                      {prNumber}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Goods Receipts ── */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex align-items-center gap-2 fw-semibold">
          <FaBoxOpen className="text-success" />
          Goods Receipts
        </Card.Header>
        <Card.Body className="p-0">
          {grs.length === 0 ? (
            <p className="text-muted p-3 mb-0">No goods receipts recorded yet.</p>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>GR Number</th>
                    <th>Received Date</th>
                    <th>Received By</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {grs.map((gr) => (
                    <tr key={gr._id}>
                      <td className="fw-semibold text-primary">
                        {gr.grNumber || gr._id}
                      </td>
                      <td>{formatDate(gr.receivedDate || gr.createdAt)}</td>
                      <td>{gr.receivedBy?.name || gr.receivedBy?.email || '—'}</td>
                      <td>
                        <Badge
                          bg={gr.status === 'accepted' ? 'success' : gr.status === 'rejected' ? 'danger' : 'secondary'}
                          className="text-capitalize"
                        >
                          {gr.status || 'recorded'}
                        </Badge>
                      </td>
                      <td className="text-muted">{gr.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Invoices ── */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex align-items-center gap-2 fw-semibold">
          <FaFileInvoiceDollar className="text-warning" />
          Invoices
        </Card.Header>
        <Card.Body className="p-0">
          {invoices.length === 0 ? (
            <p className="text-muted p-3 mb-0">No invoices linked to this PO.</p>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>Invoice Number</th>
                    <th>Invoice Date</th>
                    <th className="text-end">Amount</th>
                    <th>Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td className="fw-semibold text-primary">
                        {inv.invoiceNumber || inv._id}
                      </td>
                      <td>{formatDate(inv.invoiceDate || inv.createdAt)}</td>
                      <td className="text-end fw-semibold">
                        {formatCurrency(inv.totalAmount ?? inv.amount)}
                      </td>
                      <td>
                        <Badge
                          bg={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'partial'
                              ? 'warning'
                              : inv.status === 'overdue'
                              ? 'danger'
                              : 'secondary'
                          }
                          text={inv.status === 'partial' ? 'dark' : undefined}
                          className="text-capitalize"
                        >
                          {inv.status || 'unpaid'}
                        </Badge>
                      </td>
                      <td>{formatDate(inv.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Cancel Modal ── */}
      <Modal show={cancelModal} onHide={() => setCancelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Purchase Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            You are about to cancel <strong>{po.poNumber}</strong>. This action cannot be undone.
          </p>
          <Form.Group>
            <Form.Label>Cancellation Reason <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Provide a reason for cancellation…"
              maxLength={500}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setCancelModal(false)}
            disabled={cancelling}
          >
            Back
          </Button>
          <Button variant="danger" onClick={handleCancelConfirm} disabled={cancelling}>
            {cancelling && <Spinner size="sm" animation="border" className="me-1" />}
            Confirm Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
