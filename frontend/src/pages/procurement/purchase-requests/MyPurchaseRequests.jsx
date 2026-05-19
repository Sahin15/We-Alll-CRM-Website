import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Form,
  Spinner, Alert, ButtonGroup,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaEye, FaEdit, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { getMyPRs, deletePR, submitPR } from '../../../api/procurementApi';
import PRStatusBadge from '../../../components/procurement/PRStatusBadge';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount ?? 0);

const formatDate = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_hod', label: 'Pending HoD' },
  { value: 'pending_admin', label: 'Pending Admin' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'po_created', label: 'PO Created' },
];

export default function MyPurchaseRequests() {
  const navigate = useNavigate();

  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionId, setActionId] = useState(null);

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await getMyPRs(params);
      // Backend returns { success, data: [...] }
      const raw = res.data;
      setPrs(raw?.data ?? (Array.isArray(raw) ? raw : []));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  const handleDelete = async (pr) => {
    if (!window.confirm(`Delete PR "${pr.prNumber}"? This cannot be undone.`)) return;
    setActionId(pr._id + '_del');
    try {
      await deletePR(pr._id);
      toast.success(`PR ${pr.prNumber} deleted.`);
      setPrs((prev) => prev.filter((p) => p._id !== pr._id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete PR.');
    } finally {
      setActionId(null);
    }
  };

  const handleSubmit = async (pr) => {
    if (!window.confirm(`Submit PR "${pr.prNumber}" for approval?`)) return;
    setActionId(pr._id + '_sub');
    try {
      await submitPR(pr._id, {});
      toast.success(`PR ${pr.prNumber} submitted for approval.`);
      fetchPRs();
    } catch (err) {
      const data = err.response?.data;
      if (data?.budgetWarning) {
        toast.warning(`Budget exceeded (available: ${formatCurrency(data.availableBudget)}). Open the PR to override.`);
      } else {
        toast.error(data?.message || 'Failed to submit PR.');
      }
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
          { label: 'My Requests' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">My Purchase Requests</h4>
          <small className="text-muted">Create and track your purchase requests</small>
        </div>
        <Button variant="primary" onClick={() => navigate('/procurement/purchase-requests/create')}>
          <FaPlus className="me-1" /> New Request
        </Button>
      </div>

      {/* ── Filters ── */}
      <Card className="mb-3 shadow-sm">
        <Card.Body className="py-2">
          <Row className="align-items-center g-2">
            <Col xs="auto">
              <Form.Label className="mb-0 fw-semibold small">Status:</Form.Label>
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
              <p className="mt-2 text-muted">Loading…</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="m-3">{error}</Alert>
          ) : prs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-2">No purchase requests found.</p>
              <Button variant="primary" size="sm" onClick={() => navigate('/procurement/purchase-requests/create')}>
                <FaPlus className="me-1" /> Create your first PR
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>PR Number</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th className="text-end">Amount</th>
                    <th>Created</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prs.map((pr) => (
                    <tr key={pr._id}>
                      <td>
                        <span
                          className="fw-semibold text-primary"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/procurement/purchase-requests/${pr._id}`)}
                        >
                          {pr.prNumber}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold">{pr.title || pr.items?.[0]?.itemName || '—'}</div>
                        <small className="text-muted">
                          {pr.items?.length || 0} item{pr.items?.length !== 1 ? 's' : ''}
                          {pr.priority && ` · ${pr.priority}`}
                        </small>
                      </td>
                      <td className="small">{pr.department?.name || '—'}</td>
                      <td><PRStatusBadge status={pr.status} /></td>
                      <td className="text-end fw-semibold">
                        {formatCurrency(pr.estimatedTotalCost)}
                      </td>
                      <td className="small">{formatDate(pr.createdAt)}</td>
                      <td className="text-center">
                        <ButtonGroup size="sm">
                          <Button
                            variant="outline-primary"
                            title="View Details"
                            onClick={() => navigate(`/procurement/purchase-requests/${pr._id}`)}
                          >
                            <FaEye />
                          </Button>
                          {pr.status === 'draft' && (
                            <>
                              <Button
                                variant="outline-success"
                                title="Submit for Approval"
                                disabled={!!actionId}
                                onClick={() => handleSubmit(pr)}
                              >
                                {actionId === pr._id + '_sub'
                                  ? <Spinner size="sm" animation="border" />
                                  : <FaPaperPlane />}
                              </Button>
                              <Button
                                variant="outline-secondary"
                                title="Edit"
                                onClick={() => navigate(`/procurement/purchase-requests/${pr._id}/edit`)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="outline-danger"
                                title="Delete"
                                disabled={!!actionId}
                                onClick={() => handleDelete(pr)}
                              >
                                {actionId === pr._id + '_del'
                                  ? <Spinner size="sm" animation="border" />
                                  : <FaTrash />}
                              </Button>
                            </>
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
    </Container>
  );
}
