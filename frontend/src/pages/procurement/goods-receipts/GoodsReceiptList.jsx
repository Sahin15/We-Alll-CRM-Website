import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Card, Table, Button, Form, Row, Col, Spinner, Badge,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPlus, FaEye } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { listGRs } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export default function GoodsReceiptList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // hr and manager can also create GRs per backend writeRoles
  const canWrite = ['admin', 'superadmin', 'accounts', 'hr', 'manager'].includes(user?.role);

  const [grs, setGrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchGRs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (statusFilter) params.status = statusFilter;

      const res = await listGRs(params);
      const data = res.data?.data || res.data?.goodsReceipts || res.data || [];
      setGrs(Array.isArray(data) ? data : []);
      setTotalPages(res.data?.totalPages || 1);
    } catch {
      toast.error('Failed to load Goods Receipts');
    } finally {
      setLoading(false);
    }
  }, [page, fromDate, toDate, statusFilter]);

  useEffect(() => {
    fetchGRs();
  }, [fetchGRs]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchGRs();
  };

  const handleClear = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('');
    setPage(1);
  };

  const STATUS_FILTERS = [
    { value: '', label: 'All' },
    { value: 'recorded', label: 'Recorded' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Goods Receipts' },
        ]}
      />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold">Goods Receipts</h4>
          <small className="text-muted">All recorded goods receipts</small>
        </div>
        {canWrite && (
          <Button variant="primary" onClick={() => navigate('/procurement/goods-receipts/create')}>
            <FaPlus className="me-1" /> Record GR
          </Button>
        )}
      </div>

      {/* Status Filter Buttons */}
      <Card className="mb-3 shadow-sm">
        <Card.Body className="py-2">
          <Row className="align-items-center g-2">
            <Col xs="auto">
              <Form.Label className="mb-0 fw-semibold">Status:</Form.Label>
            </Col>
            <Col xs="auto">
              <div className="d-flex flex-wrap gap-1">
                {STATUS_FILTERS.map((f) => (
                  <Button
                    key={f.value}
                    size="sm"
                    variant={statusFilter === f.value ? 'primary' : 'outline-secondary'}
                    onClick={() => { setStatusFilter(f.value); setPage(1); }}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Date Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleFilter}>
            <Row className="g-2 align-items-end">
              <Col md={3}>
                <Form.Label className="small mb-1">From Date</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label className="small mb-1">To Date</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Col>
              <Col md="auto">
                <Button type="submit" size="sm" variant="primary">Filter</Button>
              </Col>
              <Col md="auto">
                <Button type="button" size="sm" variant="outline-secondary" onClick={handleClear}>
                  Clear
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner /> Loading…
            </div>
          ) : grs.length === 0 ? (
            <div className="text-center py-5 text-muted">No goods receipts found.</div>
          ) : (
            <Table responsive hover className="mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>GR Number</th>
                  <th>PO Number</th>
                  <th>Received Date</th>
                  <th>Received By</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grs.map((gr) => (
                  <tr key={gr._id}>
                    <td className="fw-semibold text-primary">{gr.grNumber}</td>
                    <td>{gr.purchaseOrder?.poNumber || '—'}</td>
                    <td>{formatDate(gr.receivedDate)}</td>
                    <td>{gr.receivedBy?.name || gr.receivedBy?.email || '—'}</td>
                    <td>{gr.lineItems?.length ?? 0}</td>
                    <td>
                      <Badge
                        bg={
                          gr.status === 'accepted'
                            ? 'success'
                            : gr.status === 'rejected'
                            ? 'danger'
                            : 'secondary'
                        }
                        className="text-capitalize"
                      >
                        {gr.status || 'recorded'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => navigate(`/procurement/goods-receipts/${gr._id}`)}
                      >
                        <FaEye className="me-1" />View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-between align-items-center">
            <span className="small text-muted">Page {page} of {totalPages}</span>
            <div className="d-flex gap-2">
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
}
