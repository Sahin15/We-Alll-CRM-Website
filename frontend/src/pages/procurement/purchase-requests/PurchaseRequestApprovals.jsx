import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Badge, Form,
  Spinner, Alert, ButtonGroup, Modal,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaCheck, FaTimes, FaFilter } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { listPRs, approvePR, rejectPR } from '../../../api/procurementApi';
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
      })
    : '—';

const STATUS_FILTERS = [
  { value: 'pending_hod,pending_admin', label: 'All Pending' },
  { value: 'pending_hod', label: 'Pending HoD' },
  { value: 'pending_admin', label: 'Pending Admin' },
];

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ show, pr, onHide, onConfirm, loading }) {
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
        {pr && (
          <div className="mb-3 p-2 bg-light rounded small">
            <div className="fw-semibold">{pr.prNumber}</div>
            <div className="text-muted">{pr.title}</div>
          </div>
        )}
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
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={loading || !reason.trim()}
        >
          {loading ? (
            <Spinner size="sm" animation="border" className="me-1" />
          ) : (
            <FaTimes className="me-1" />
          )}
          Confirm Rejection
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Approve Modal ────────────────────────────────────────────────────────────
function ApproveModal({ show, pr, onHide, onConfirm, loading }) {
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
        {pr && (
          <div className="mb-3 p-2 bg-light rounded small">
            <div className="fw-semibold">{pr.prNumber}</div>
            <div className="text-muted">{pr.title}</div>
            <div className="fw-semibold text-primary mt-1">
              {formatCurrency(pr.estimatedTotalCost ?? pr.estimatedAmount)}
            </div>
          </div>
        )}
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
          {loading ? (
            <Spinner size="sm" animation="border" className="me-1" />
          ) : (
            <FaCheck className="me-1" />
          )}
          Confirm Approval
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PurchaseRequestApprovals() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // HoD can only approve pending_hod PRs (their department's first-level approvals).
  // admin/superadmin/accounts approve pending_admin (second-level approvals).
  // HoD can also see pending_admin for visibility but cannot act on them.
  const isHoD = user?.role === 'hod';
  const isAdminOrAccounts = ['admin', 'superadmin', 'accounts'].includes(user?.role);

  // Default filter based on role: HoD sees pending_hod, admin/accounts see pending_admin
  const defaultFilter = isHoD ? 'pending_hod' : 'pending_admin';

  // Filter options available per role
  const statusFilters = isHoD
    ? [
        { value: 'pending_hod', label: 'Pending My Approval' },
        { value: 'pending_admin', label: 'Pending Admin (view only)' },
      ]
    : [
        { value: 'pending_hod,pending_admin', label: 'All Pending' },
        { value: 'pending_hod', label: 'Pending HoD' },
        { value: 'pending_admin', label: 'Pending Admin' },
      ];

  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(defaultFilter);
  const [actionLoading, setActionLoading] = useState(false);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  // Whether the current user can act on a given PR
  const canActOn = (pr) => {
    if (isHoD) return pr.status === 'pending_hod';
    if (isAdminOrAccounts) return pr.status === 'pending_admin';
    return false;
  };

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend only supports a single status value — fetch both separately if needed
      let allPRs = [];
      if (statusFilter.includes(',')) {
        const statuses = statusFilter.split(',');
        const results = await Promise.all(statuses.map((s) => listPRs({ status: s.trim() })));
        results.forEach((res) => {
          const raw = res.data;
          const items = raw?.data ?? (Array.isArray(raw) ? raw : []);
          allPRs = [...allPRs, ...items];
        });
      } else {
        const res = await listPRs({ status: statusFilter });
        const raw = res.data;
        allPRs = raw?.data ?? (Array.isArray(raw) ? raw : []);
      }
      setPrs(allPRs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending approvals.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  const handleApprove = async (comment) => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await approvePR(approveTarget._id, { comments: comment });
      toast.success(`PR ${approveTarget.prNumber} approved.`);
      setApproveTarget(null);
      fetchPRs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve PR.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await rejectPR(rejectTarget._id, { comments: reason });
      toast.success(`PR ${rejectTarget.prNumber} rejected.`);
      setRejectTarget(null);
      fetchPRs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject PR.');
    } finally {
      setActionLoading(false);
    }
  };

  const getRequestorName = (pr) => {
    const rb = pr.requestedBy;
    if (!rb) return '—';
    if (rb.name) return rb.name;
    if (rb.firstName) return `${rb.firstName} ${rb.lastName ?? ''}`.trim();
    return '—';
  };

  const getDepartmentName = (pr) => {
    const dept = pr.department;
    if (!dept) return '—';
    return dept.name ?? dept;
  };

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Requests', href: '/procurement/purchase-requests/my' },
          { label: 'Approvals' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">Purchase Request Approvals</h4>
          <small className="text-muted">
            {isHoD
              ? 'Review and approve purchase requests from your department'
              : 'Review and action purchase requests pending final approval'}
          </small>
        </div>
        {!loading && (
          <Badge bg="warning" text="dark" className="fs-6">
            {prs.length} pending
          </Badge>
        )}
      </div>

      {/* ── Filters ── */}
      <Card className="mb-3 shadow-sm">
        <Card.Body className="py-2">
          <Row className="align-items-center g-2">
            <Col xs="auto">
              <FaFilter className="text-muted me-1" />
              <Form.Label className="mb-0 fw-semibold">Filter:</Form.Label>
            </Col>
            <Col xs="auto">
              <ButtonGroup size="sm">
                {statusFilters.map((f) => (
                  <Button
                    key={f.value}
                    variant={statusFilter === f.value ? 'primary' : 'outline-secondary'}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </Button>
                ))}
              </ButtonGroup>
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
              <p className="mt-2 text-muted">Loading pending approvals…</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="m-3">
              {error}
            </Alert>
          ) : prs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaCheck size={32} className="mb-2 text-success" />
              <p className="mb-0">No pending purchase requests to review.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>PR Number</th>
                    <th>Title</th>
                    <th>Requestor</th>
                    <th>Department</th>
                    <th className="text-end">Amount</th>
                    <th>Status</th>
                    <th>Date Submitted</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prs.map((pr) => (
                    <tr key={pr._id}>
                      <td>
                        <span className="fw-semibold text-primary">{pr.prNumber}</span>
                      </td>
                      <td>
                        <div className="fw-semibold">{pr.title || '—'}</div>
                        {pr.priority && (
                          <Badge
                            bg={
                              pr.priority === 'critical' || pr.priority === 'urgent'
                                ? 'danger'
                                : pr.priority === 'high'
                                ? 'warning'
                                : pr.priority === 'medium'
                                ? 'info'
                                : 'secondary'
                            }
                            text={pr.priority === 'high' ? 'dark' : undefined}
                            className="text-capitalize"
                          >
                            {pr.priority}
                          </Badge>
                        )}
                      </td>
                      <td>{getRequestorName(pr)}</td>
                      <td>{getDepartmentName(pr)}</td>
                      <td className="text-end fw-semibold">
                        {formatCurrency(pr.estimatedTotalCost ?? pr.estimatedAmount)}
                      </td>
                      <td>
                        <PRStatusBadge status={pr.status} />
                      </td>
                      <td>{formatDate(pr.updatedAt ?? pr.createdAt)}</td>
                      <td className="text-center">
                        <ButtonGroup size="sm">
                          <Button
                            variant="outline-primary"
                            title="View Details"
                            onClick={() =>
                              navigate(`/procurement/purchase-requests/${pr._id}`)
                            }
                          >
                            <FaEye />
                          </Button>
                          {canActOn(pr) && (
                            <Button
                              variant="outline-success"
                              title="Approve"
                              disabled={actionLoading}
                              onClick={() => setApproveTarget(pr)}
                            >
                              <FaCheck />
                            </Button>
                          )}
                          {canActOn(pr) && (
                            <Button
                              variant="outline-danger"
                              title="Reject"
                              disabled={actionLoading}
                              onClick={() => setRejectTarget(pr)}
                            >
                              <FaTimes />
                            </Button>
                          )}
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
        {!loading && prs.length > 0 && (
          <Card.Footer className="text-muted small">
            Showing {prs.length} record{prs.length !== 1 ? 's' : ''}
          </Card.Footer>
        )}
      </Card>

      {/* Modals */}
      <ApproveModal
        show={!!approveTarget}
        pr={approveTarget}
        onHide={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        loading={actionLoading}
      />
      <RejectModal
        show={!!rejectTarget}
        pr={rejectTarget}
        onHide={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </Container>
  );
}
