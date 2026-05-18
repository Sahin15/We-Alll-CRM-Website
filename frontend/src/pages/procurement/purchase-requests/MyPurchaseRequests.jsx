import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Badge, Form,
  Spinner, Alert, ButtonGroup,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { getMyPRs, deletePR } from '../../../api/procurementApi';
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
  const { user } = useAuth();

  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await getMyPRs(params);
      setPrs(res.data?.data || res.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load purchase requests.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  const handleDelete = async (pr) => {
    if (!window.confirm(`Delete PR "${pr.prNumber}"? This cannot be undone.`)) return;
    setDeletingId(pr._id);
    try {
      await deletePR(pr._id);
      toast.success(`PR ${pr.prNumber} deleted.`);
      setPrs((prev) => prev.filter((p) => p._id !== pr._id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete PR.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'My Purchase Requests' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">My Purchase Requests</h4>
          <small className="text-muted">Manage your purchase requests</small>
        </div>
        <Button variant="primary" onClick={() => navigate('/procurement/purchase-requests/create')}>
          <FaPlus className="me-1" /> Create New PR
        </Button>
      </div>

      {/* ── Filters ── */}
      <Card className="mb-3 shadow-sm">
        <Card.Body className="py-2">
          <Row className="align-items-center g-2">
            <Col xs="auto">
              <Form.Label className="mb-0 fw-semibold">Filter by Status:</Form.Label>
            </Col>
            <Col xs="auto">
              <ButtonGroup size="sm">
                {STATUS_FILTERS.map((f) => (
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
              <p className="mt-2 text-muted">Loading purchase requests…</p>
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
                    <th>Category</th>
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
                        <span className="fw-semibold text-primary">{pr.prNumber}</span>
                      </td>
                      <td>
                        <div className="fw-semibold">{pr.title || '—'}</div>
                        {pr.priority && (
                          <Badge
                            bg={
                              pr.priority === 'urgent' ? 'danger' :
                              pr.priority === 'high' ? 'warning' :
                              pr.priority === 'medium' ? 'info' : 'secondary'
                            }
                            text={pr.priority === 'high' || pr.priority === 'urgent' ? undefined : 'dark'}
                            className="text-capitalize"
                          >
                            {pr.priority}
                          </Badge>
                        )}
                      </td>
                      <td>{pr.category || '—'}</td>
                      <td><PRStatusBadge status={pr.status} /></td>
                      <td className="text-end fw-semibold">
                        {formatCurrency(pr.estimatedTotalCost ?? pr.estimatedAmount)}
                      </td>
                      <td>{formatDate(pr.createdAt)}</td>
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
                                variant="outline-secondary"
                                title="Edit"
                                onClick={() => navigate(`/procurement/purchase-requests/${pr._id}/edit`)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="outline-danger"
                                title="Delete"
                                disabled={deletingId === pr._id}
                                onClick={() => handleDelete(pr)}
                              >
                                {deletingId === pr._id ? <Spinner size="sm" animation="border" /> : <FaTrash />}
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
