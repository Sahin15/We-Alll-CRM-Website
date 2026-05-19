import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Badge, Spinner,
  Alert, Modal, Form, ListGroup,
} from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaCheck, FaTimes, FaEdit, FaFileAlt,
  FaHistory, FaBoxOpen, FaPaperPlane,
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { getPR, approvePR, rejectPR, submitPR } from '../../../api/procurementApi';
import PRStatusBadge from '../../../components/procurement/PRStatusBadge';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

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
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const formatDateOnly = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const PRIORITY_VARIANT = {
  low: 'secondary',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
  critical: 'danger',
};

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ show, onHide, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.warning('Please provide a rejection reason.');
      return;
    }
    onConfirm(reason.trim());
  };

  const handleHide = () => {
    setReason('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Reject Purchase Request</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>
            Rejection Reason <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a clear reason for rejection…"
            maxLength={500}
          />
          <Form.Text className="text-muted">{reason.length}/500</Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleHide} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={loading || !reason.trim()}>
          {loading ? <Spinner size="sm" animation="border" className="me-1" /> : <FaTimes className="me-1" />}
          Confirm Rejection
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Approve Modal ────────────────────────────────────────────────────────────
function ApproveModal({ show, onHide, onConfirm, loading }) {
  const [comment, setComment] = useState('');

  const handleConfirm = () => onConfirm(comment.trim());

  const handleHide = () => {
    setComment('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Approve Purchase Request</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Comment (optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add an optional approval comment…"
            maxLength={500}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleHide} disabled={loading}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleConfirm} disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" className="me-1" /> : <FaCheck className="me-1" />}
          Confirm Approval
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PurchaseRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const canApprove =
    user?.role === 'hod' ||
    user?.role === 'admin' ||
    user?.role === 'superadmin' ||
    user?.role === 'accounts';

  const fetchPR = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPR(id);
      setPr(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase request.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPR();
  }, [fetchPR]);

  const handleApprove = async (comment) => {
    setActionLoading(true);
    try {
      await approvePR(id, { comments: comment });
      toast.success('Purchase Request approved.');
      setShowApproveModal(false);
      fetchPR();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve PR.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      await rejectPR(id, { comments: reason });
      toast.success('Purchase Request rejected.');
      setShowRejectModal(false);
      fetchPR();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject PR.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit this PR for approval?')) return;
    setActionLoading(true);
    try {
      await submitPR(id);
      toast.success('Purchase Request submitted for approval.');
      fetchPR();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit PR.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading purchase request…</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="outline-secondary" onClick={() => navigate(-1)}>
          <FaArrowLeft className="me-1" /> Back
        </Button>
      </Container>
    );
  }

  if (!pr) return null;

  const lineItems = pr.items ?? [];
  const auditLog = pr.auditLog ?? [];
  const attachments = pr.attachments ?? [];
  const requestedBy = pr.requestedBy;
  const department = pr.department;
  const project = pr.project;

  const isPending = pr.status === 'pending_hod' || pr.status === 'pending_admin';
  const isDraft = pr.status === 'draft';
  const isOwner =
    user?._id === (requestedBy?._id ?? requestedBy) ||
    user?.id === (requestedBy?._id ?? requestedBy);

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Requests', href: '/procurement/purchase-requests/my' },
          { label: pr.prNumber ?? 'Details' },
        ]}
      />

      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h4 className="mb-0 fw-bold">{pr.title || 'Purchase Request'}</h4>
          <div className="d-flex align-items-center gap-2 mt-1">
            <span className="text-muted small">{pr.prNumber}</span>
            <PRStatusBadge status={pr.status} />
            {pr.priority && (
              <Badge
                bg={PRIORITY_VARIANT[pr.priority] ?? 'secondary'}
                text={pr.priority === 'high' ? 'dark' : undefined}
                className="text-capitalize"
              >
                {pr.priority}
              </Badge>
            )}
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
            <FaArrowLeft className="me-1" /> Back
          </Button>
          {isDraft && isOwner && (
            <>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => navigate(`/procurement/purchase-requests/${id}/edit`)}
              >
                <FaEdit className="me-1" /> Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoading}
                onClick={handleSubmit}
              >
                <FaPaperPlane className="me-1" /> Submit for Approval
              </Button>
            </>
          )}
          {isPending && canApprove && (
            <>
              <Button
                variant="success"
                size="sm"
                disabled={actionLoading}
                onClick={() => setShowApproveModal(true)}
              >
                <FaCheck className="me-1" /> Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={actionLoading}
                onClick={() => setShowRejectModal(true)}
              >
                <FaTimes className="me-1" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <Row className="g-4">
        {/* ── Left Column ── */}
        <Col lg={8}>
          {/* Basic Info */}
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-primary text-white fw-semibold">
              <FaFileAlt className="me-2" />
              Request Details
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col sm={6}>
                  <div className="text-muted small">PR Number</div>
                  <div className="fw-semibold">{pr.prNumber ?? '—'}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Status</div>
                  <PRStatusBadge status={pr.status} />
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Category</div>
                  <div>{pr.category ?? '—'}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Priority</div>
                  <div className="text-capitalize">{pr.priority ?? '—'}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Department</div>
                  <div>{department?.name ?? department ?? '—'}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Project</div>
                  <div>{project?.name ?? project ?? '—'}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Requested By</div>
                  <div>
                    {requestedBy?.name ?? requestedBy?.firstName
                      ? `${requestedBy.firstName ?? ''} ${requestedBy.lastName ?? ''}`.trim()
                      : '—'}
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Required By</div>
                  <div>{formatDateOnly(pr.requiredByDate)}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Created</div>
                  <div>{formatDate(pr.createdAt)}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Financial Year</div>
                  <div>{pr.financialYear ?? '—'}</div>
                </Col>
                <Col sm={12}>
                  <div className="text-muted small">Justification</div>
                  <div className="mt-1 p-2 bg-light rounded">{pr.justification ?? '—'}</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Line Items */}
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-primary text-white fw-semibold">
              <FaBoxOpen className="me-2" />
              Line Items
            </Card.Header>
            <Card.Body className="p-0">
              {lineItems.length === 0 ? (
                <div className="text-center text-muted py-4">No line items.</div>
              ) : (
                <div className="table-responsive">
                  <Table bordered hover className="mb-0 align-middle small">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th className="text-center">Qty</th>
                        <th className="text-end">Unit Price</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={item._id ?? idx}>
                          <td>{idx + 1}</td>
                          <td className="fw-semibold">{item.itemName ?? '—'}</td>
                          <td>{item.description ?? '—'}</td>
                          <td>{item.category ?? '—'}</td>
                          <td className="text-center">{item.quantity ?? 0}</td>
                          <td className="text-end">{formatCurrency(item.estimatedUnitPrice ?? 0)}</td>
                          <td className="text-end fw-semibold">
                            {formatCurrency((item.quantity ?? 0) * (item.estimatedUnitPrice ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan={6} className="text-end fw-bold">
                          Estimated Total
                        </td>
                        <td className="text-end fw-bold text-primary">
                          {formatCurrency(pr.estimatedTotalCost ?? 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-light fw-semibold">Attachments</Card.Header>
              <ListGroup variant="flush">
                {attachments.map((att, idx) => (
                  <ListGroup.Item
                    key={att._id ?? idx}
                    className="d-flex align-items-center justify-content-between"
                  >
                    <span className="small">{att.fileName ?? `Attachment ${idx + 1}`}</span>
                    {att.fileUrl && (
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-primary btn-sm"
                      >
                        View
                      </a>
                    )}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          )}

          {/* Linked PO */}
          {pr.status === 'po_created' && pr.purchaseOrder && (
            <Card className="mb-4 shadow-sm border-success">
              <Card.Header className="bg-success text-white fw-semibold">
                Linked Purchase Order
              </Card.Header>
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{pr.purchaseOrder?.poNumber ?? '—'}</div>
                    <div className="text-muted small">
                      Created: {formatDate(pr.purchaseOrder?.createdAt)}
                    </div>
                  </div>
                  <Link
                    to={`/procurement/purchase-orders/${pr.purchaseOrder?._id}`}
                    className="btn btn-outline-success btn-sm"
                  >
                    View PO
                  </Link>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* ── Right Column ── */}
        <Col lg={4}>
          {/* Approval Info */}
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light fw-semibold">Approval Status</Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="text-muted small mb-1">HoD Approval</div>
                {pr.hodApproval?.action ? (
                  <div>
                    <Badge
                      bg={pr.hodApproval.action === 'approved' ? 'success' : 'danger'}
                      className="text-capitalize mb-1"
                    >
                      {pr.hodApproval.action}
                    </Badge>
                    {pr.hodApproval.comments && (
                      <div className="small text-muted mt-1">"{pr.hodApproval.comments}"</div>
                    )}
                    <div className="small text-muted">{formatDate(pr.hodApproval.timestamp)}</div>
                  </div>
                ) : (
                  <span className="text-muted small">Pending</span>
                )}
              </div>
              <div>
                <div className="text-muted small mb-1">Admin Approval</div>
                {pr.adminApproval?.action ? (
                  <div>
                    <Badge
                      bg={pr.adminApproval.action === 'approved' ? 'success' : 'danger'}
                      className="text-capitalize mb-1"
                    >
                      {pr.adminApproval.action}
                    </Badge>
                    {pr.adminApproval.comments && (
                      <div className="small text-muted mt-1">"{pr.adminApproval.comments}"</div>
                    )}
                    <div className="small text-muted">{formatDate(pr.adminApproval.timestamp)}</div>
                  </div>
                ) : (
                  <span className="text-muted small">Pending</span>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Budget Check */}
          {pr.budgetCheckResult && (
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-light fw-semibold">Budget Check</Card.Header>
              <Card.Body className="small">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Available Budget</span>
                  <span className="fw-semibold text-success">
                    {formatCurrency(pr.budgetCheckResult.availableBudget)}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Estimated Cost</span>
                  <span className="fw-semibold">
                    {formatCurrency(pr.budgetCheckResult.estimatedCost)}
                  </span>
                </div>
                {pr.budgetCheckResult.exceeded && (
                  <Alert variant="warning" className="mt-2 mb-0 py-1 px-2 small">
                    Budget exceeded
                    {pr.budgetCheckResult.overrideAcknowledged && ' (override acknowledged)'}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Audit Log */}
          <Card className="shadow-sm">
            <Card.Header className="bg-light fw-semibold">
              <FaHistory className="me-2" />
              Audit Log
            </Card.Header>
            <Card.Body className="p-0">
              {auditLog.length === 0 ? (
                <div className="text-center text-muted py-3 small">No audit history.</div>
              ) : (
                <ListGroup variant="flush">
                  {[...auditLog].reverse().map((entry, idx) => {
                    const changedBy = entry.changedBy;
                    const name = changedBy?.name
                      ?? (changedBy?.firstName
                        ? `${changedBy.firstName} ${changedBy.lastName ?? ''}`.trim()
                        : 'System');
                    return (
                      <ListGroup.Item key={entry._id ?? idx} className="py-2 px-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="small fw-semibold">{name}</div>
                            <div className="small text-muted">
                              {entry.previousStatus && (
                                <>
                                  <PRStatusBadge status={entry.previousStatus} />
                                  <span className="mx-1">→</span>
                                </>
                              )}
                              <PRStatusBadge status={entry.newStatus} />
                            </div>
                            {entry.comments && (
                              <div className="small text-muted mt-1 fst-italic">
                                "{entry.comments}"
                              </div>
                            )}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                            {formatDate(entry.timestamp)}
                          </div>
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      <ApproveModal
        show={showApproveModal}
        onHide={() => setShowApproveModal(false)}
        onConfirm={handleApprove}
        loading={actionLoading}
      />
      <RejectModal
        show={showRejectModal}
        onHide={() => setShowRejectModal(false)}
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </Container>
  );
}
