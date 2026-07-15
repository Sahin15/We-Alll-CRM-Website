import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Table, Button, Form,
  InputGroup, Badge, Spinner, Alert,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  FaPlus, FaSearch, FaEye, FaEdit, FaBan, FaCheckCircle,
  FaStar, FaRegStar,
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { listVendors, deactivateVendor, updateVendor } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const CATEGORIES = [
  'IT Hardware', 'IT Software', 'Office Supplies', 'Furniture',
  'Services', 'Marketing', 'Travel', 'Maintenance', 'Other',
];

const StarRating = ({ rating }) => {
  if (!rating) return <span className="text-muted">—</span>;
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) =>
        s <= rating
          ? <FaStar key={s} style={{ color: '#ffc107' }} />
          : <FaRegStar key={s} style={{ color: '#dee2e6' }} />
      )}
    </span>
  );
};

const VendorList = () => {
  const navigate = useNavigate();
  const { canAccess } = useAuth();

  const canWrite = canAccess('procurement.vendor.manage', ['admin', 'superadmin', 'accounts']);

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter === 'active') params.isActive = true;
      if (statusFilter === 'inactive') params.isActive = false;

      const res = await listVendors(params);
      const data = res.data?.vendors || res.data?.data || res.data || [];
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load vendors.');
      toast.error('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchVendors, 300);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  const handleToggleActive = async (vendor) => {
    const action = vendor.isActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} "${vendor.name}"?`)) return;
    setActionLoading(vendor._id);
    try {
      if (vendor.isActive) {
        await deactivateVendor(vendor._id);
        toast.success(`Vendor "${vendor.name}" deactivated.`);
      } else {
        await updateVendor(vendor._id, { isActive: true });
        toast.success(`Vendor "${vendor.name}" reactivated.`);
      }
      fetchVendors();
    } catch {
      toast.error(`Failed to ${action} vendor.`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Vendors' },
        ]}
      />

      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">Vendors</h4>
          <small className="text-muted">Manage your supplier and vendor directory</small>
        </Col>
        <Col xs="auto">
          {canWrite && (
            <Button variant="primary" onClick={() => navigate('/procurement/vendors/create')}>
              <FaPlus className="me-2" />
              Add Vendor
            </Button>
          )}
        </Col>
      </Row>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by vendor name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Vendors</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading vendors...</p>
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-0">No vendors found.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Categories</th>
                  <th>Primary Contact</th>
                  <th>Rating</th>
                  <th>Total Spend</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor._id}>
                    <td className="fw-semibold">{vendor.name}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {(vendor.categories || []).map((cat) => (
                          <Badge key={cat} bg="secondary" className="fw-normal">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div>{vendor.primaryContact?.name}</div>
                      <small className="text-muted">{vendor.primaryContact?.email}</small>
                    </td>
                    <td>
                      <StarRating rating={vendor.rating} />
                    </td>
                    <td className="fw-semibold">{formatCurrency(vendor.totalSpend)}</td>
                    <td>
                      <Badge bg={vendor.isActive ? 'success' : 'secondary'}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          title="View"
                          onClick={() => navigate(`/procurement/vendors/${vendor._id}`)}
                        >
                          <FaEye />
                        </Button>
                        {canWrite && (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            title="Edit"
                            onClick={() => navigate(`/procurement/vendors/${vendor._id}/edit`)}
                          >
                            <FaEdit />
                          </Button>
                        )}
                        {canWrite && (
                          <Button
                            size="sm"
                            variant={vendor.isActive ? 'outline-danger' : 'outline-success'}
                            title={vendor.isActive ? 'Deactivate' : 'Reactivate'}
                            disabled={actionLoading === vendor._id}
                            onClick={() => handleToggleActive(vendor)}
                          >
                            {actionLoading === vendor._id ? (
                              <Spinner size="sm" animation="border" />
                            ) : vendor.isActive ? (
                              <FaBan />
                            ) : (
                              <FaCheckCircle />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default VendorList;
