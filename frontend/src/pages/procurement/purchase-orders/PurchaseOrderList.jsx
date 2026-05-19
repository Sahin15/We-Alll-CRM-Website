import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Form,
  Spinner, Alert, ButtonGroup, Modal,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaPlus, FaEye, FaPaperPlane, FaTimes, FaFilePdf,
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { listPOs, issuePO, cancelPO, getPOPdf } from '../../../api/procurementApi';
import POStatusBadge from '../../../components/procurement/POStatusBadge';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount ?? 0);

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'fully_received', label: 'Fully Received' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'closed', label: 'Closed' },
];

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const canWrite = ['admin', 'superadmin', 'accounts'].includes(user?.role);

  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({ show: false, po: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Issue / PDF action state
  const [actionId, setActionId] = useState(null);

  // ── Fetch POs ───────────────────────────────────────────────────────────────
  const fetchPOs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await listPOs(params);
      const raw = res.data;
      setPos(Array.isArray(raw) ? raw : raw?.data ?? raw?.purchaseOrders ?? []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Purchase Orders.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  // ── Issue PO ────────────────────────────────────────────────────────────────
  const handleIssue = async (po) => {
    if (!window.confirm(`Issue PO "${po.poNumber}"? This will notify the vendor.`)) return;
    setActionId(po._id);
    try {
      await issuePO(po._id);
      toast.success(`PO ${po.poNumber} issued successfully.`);
      fetchPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue PO.');
    } finally {
      setActionId(null);
    }
  };

  // ── Cancel PO ───────────────────────────────────────────────────────────────
  const openCancelModal = (po) => {
    setCancelModal({ show: true, po });
    setCancelReason('');
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      toast.warning('Please provide a cancellation reason.');
      return;
    }
    setCancelling(true);
    try {
      await cancelPO(cancelModal.po._id, { reason: cancelReason });
      toast.success(`PO ${cancelModal.po.poNumber} cancelled.`);
      setCancelModal({ show: false, po: null });
      fetchPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel PO.');
    } finally {
      setCancelling(false);
    }
  };

  // ── Download PDF ────────────────────────────────────────────────────────────
  const handleDownloadPdf = async (po) => {
    setActionId(po._id + '_pdf');
    try {
      const res = await getPOPdf(po._id);
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
      setActionId(null);
    }
  };

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Orders' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">Purchase Orders</h4>
          <small className="text-muted">Manage all purchase orders</small>
        </div>
        {canWrite && (
          <Button variant="primary" onClick={() => navigate('/procurement/purchase-orders/create')}>
            <FaPlus className="me-1" /> Create PO
          </Button>
        )}
      </div>

      {/* ── Status Filter ── */}
      <Card className="mb-3 shadow-sm">
        <Card.Body className="py-2">
          <Row className="align-items-center g-2">
            <Col xs="auto">
              <Form.Label className="mb-0 fw-semibold">Filter by Status:</Form.Label>
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

      {/* ── Table ── */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading purchase orders…</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="m-3">{error}</Alert>
          ) : pos.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-2">No purchase orders found.</p>
              {canWrite && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/procurement/purchase-orders/create')}
                >
                  <FaPlus className="me-1" /> Create your first PO
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th className="text-end">Total Value</th>
                    <th>Status</th>
                    <th>Department</th>
                    <th>Expected Delivery</th>
                    <th>Created</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po) => (
                    <tr key={po._id}>
                      <td>
                        <span
                          className="fw-semibold text-primary"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/procurement/purchase-orders/${po._id}`)}
                        >
                          {po.poNumber}
                        </span>
                      </td>
                      <td>
                        {po.vendor?.vendorName || po.vendor?.name || po.vendor || '—'}
                      </td>
                      <td className="text-end fw-semibold">
                        {formatCurrency(po.totalValue)}
                      </td>
                      <td>
                        <POStatusBadge status={po.status} />
                      </td>
                      <td>
                        {po.department?.name || po.department || '—'}
                      </td>
                      <td>{formatDate(po.expectedDeliveryDate)}</td>
                      <td>{formatDate(po.createdAt)}</td>
                      <td className="text-center">
                        <ButtonGroup size="sm">
                          <Button
                            variant="outline-primary"
                            title="View Details"
                            onClick={() => navigate(`/procurement/purchase-orders/${po._id}`)}
                          >
                            <FaEye />
                          </Button>

                          {canWrite && po.status === 'draft' && (
                            <Button
                              variant="outline-success"
                              title="Issue PO"
                              disabled={actionId === po._id}
                              onClick={() => handleIssue(po)}
                            >
                              {actionId === po._id
                                ? <Spinner size="sm" animation="border" />
                                : <FaPaperPlane />}
                            </Button>
                          )}

                          {canWrite && ['draft', 'issued'].includes(po.status) && (
                            <Button
                              variant="outline-danger"
                              title="Cancel PO"
                              onClick={() => openCancelModal(po)}
                            >
                              <FaTimes />
                            </Button>
                          )}

                          <Button
                            variant="outline-secondary"
                            title="Download PDF"
                            disabled={actionId === po._id + '_pdf'}
                            onClick={() => handleDownloadPdf(po)}
                          >
                            {actionId === po._id + '_pdf'
                              ? <Spinner size="sm" animation="border" />
                              : <FaFilePdf />}
                          </Button>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
        {!loading && pos.length > 0 && (
          <Card.Footer className="text-muted small">
            Showing {pos.length} record{pos.length !== 1 ? 's' : ''}
          </Card.Footer>
        )}
      </Card>

      {/* ── Cancel Modal ── */}
      <Modal show={cancelModal.show} onHide={() => setCancelModal({ show: false, po: null })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Purchase Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            You are about to cancel{' '}
            <strong>{cancelModal.po?.poNumber}</strong>. This action cannot be undone.
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
            onClick={() => setCancelModal({ show: false, po: null })}
            disabled={cancelling}
          >
            Back
          </Button>
          <Button variant="danger" onClick={handleCancelConfirm} disabled={cancelling}>
            {cancelling ? <Spinner size="sm" animation="border" className="me-1" /> : null}
            Confirm Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
