import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Badge, Spinner, Form, ProgressBar,
} from 'react-bootstrap';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { toast } from 'react-toastify';
import { Link, Navigate } from 'react-router-dom';
import {
  FaShoppingCart, FaFileInvoice, FaRupeeSign, FaClock, FaChartPie,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import {
  getSummary,
  getBudgetUtilisation,
  monthlyTrend,
  spendByCategory,
  topVendors,
  listInvoices,
} from '../../api/procurementApi';
import PRStatusBadge from '../../components/procurement/PRStatusBadge';
import PaymentDueAlert from '../../components/procurement/PaymentDueAlert';

const COLORS = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#06d6a0', '#ffd166'];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2];

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, title, value, sub, color, loading }) => (
  <Card className="h-100 shadow-sm border-0">
    <Card.Body className="d-flex align-items-center gap-3">
      <div
        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 56, height: 56, background: `${color}20` }}
      >
        <Icon size={24} style={{ color }} />
      </div>
      <div className="flex-grow-1 min-w-0">
        <div className="text-muted small mb-1">{title}</div>
        {loading ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <div className="fw-bold fs-5 text-truncate">{value}</div>
        )}
        {sub && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{sub}</div>}
      </div>
    </Card.Body>
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProcurementDashboard = () => {
  const { user } = useAuth();

  // Only admin/superadmin/accounts can view the analytics dashboard.
  // hr, manager, hod, employee are redirected to their own purchase requests.
  const canViewDashboard = ['admin', 'superadmin', 'accounts'].includes(user?.role);
  if (!canViewDashboard) {
    return <Navigate to="/procurement/purchase-requests/my" replace />;
  }

  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [budgetUtil, setBudgetUtil] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const fetchAll = useCallback(async (selectedYear) => {
    setLoading(true);
    try {
      const params = { year: selectedYear };
      const [
        summaryRes,
        budgetRes,
        trendRes,
        categoryRes,
        vendorRes,
        invoiceRes,
      ] = await Promise.allSettled([
        getSummary(params),
        getBudgetUtilisation(params),
        monthlyTrend(params),
        spendByCategory(params),
        topVendors({ ...params, limit: 5 }),
        listInvoices({ status: 'unpaid,partial', limit: 50 }),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (budgetRes.status === 'fulfilled') setBudgetUtil(budgetRes.value.data ?? []);
      if (trendRes.status === 'fulfilled') setTrendData(trendRes.value.data ?? []);
      if (categoryRes.status === 'fulfilled') setCategoryData(categoryRes.value.data ?? []);
      if (vendorRes.status === 'fulfilled') setVendorData(vendorRes.value.data ?? []);
      if (invoiceRes.status === 'fulfilled') {
        const raw = invoiceRes.value.data;
        setInvoices(Array.isArray(raw) ? raw : raw?.invoices ?? raw?.data ?? []);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(year);
  }, [year, fetchAll]);

  // Derived values
  const totalBudget = Array.isArray(budgetUtil)
    ? budgetUtil.reduce((s, b) => s + (b.totalBudget ?? 0), 0)
    : 0;
  const totalSpent = Array.isArray(budgetUtil)
    ? budgetUtil.reduce((s, b) => s + (b.totalSpent ?? 0), 0)
    : 0;
  const utilPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const recentPRs = summary?.recentPRs ?? [];
  const pendingPaymentsTotal = summary?.pendingPaymentsTotal ?? 0;

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">
            <FaChartPie className="me-2 text-primary" />
            Procurement Dashboard
          </h4>
          <p className="text-muted mb-0 small">Overview of procurement activity</p>
        </Col>
        <Col xs="auto">
          <Form.Select
            size="sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 110 }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {/* Payment Due Alert */}
      <PaymentDueAlert invoices={invoices} />

      {/* Summary Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl>
          <SummaryCard
            icon={FaShoppingCart}
            title="Total PRs"
            value={
              <span>
                {summary?.totalPRs ?? 0}
                {(summary?.pendingPRs ?? 0) > 0 && (
                  <Badge bg="warning" text="dark" className="ms-2 fs-6">
                    {summary.pendingPRs} pending
                  </Badge>
                )}
              </span>
            }
            color="#4361ee"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} xl>
          <SummaryCard
            icon={FaFileInvoice}
            title="Total POs"
            value={
              <span>
                {summary?.totalPOs ?? 0}
                {(summary?.issuedPOs ?? 0) > 0 && (
                  <Badge bg="info" className="ms-2 fs-6">
                    {summary.issuedPOs} issued
                  </Badge>
                )}
              </span>
            }
            color="#3a0ca3"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} xl>
          <SummaryCard
            icon={FaRupeeSign}
            title={`Total Spend (YTD ${year})`}
            value={formatCurrency(summary?.totalSpend ?? 0)}
            color="#7209b7"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} xl>
          <SummaryCard
            icon={FaClock}
            title="Pending Payments"
            value={formatCurrency(pendingPaymentsTotal)}
            sub="Outstanding invoices"
            color="#f72585"
            loading={loading}
          />
        </Col>
        <Col xs={12} xl>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small mb-1">Budget Utilisation</div>
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <>
                  <div className="fw-bold fs-5 mb-2">{utilPct}%</div>
                  <ProgressBar
                    now={utilPct}
                    variant={utilPct >= 90 ? 'danger' : utilPct >= 70 ? 'warning' : 'success'}
                    style={{ height: 10 }}
                  />
                  <div className="d-flex justify-content-between mt-1" style={{ fontSize: '0.72rem' }}>
                    <span className="text-muted">Spent: {formatCurrency(totalSpent)}</span>
                    <span className="text-muted">Budget: {formatCurrency(totalBudget)}</span>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row className="g-3 mb-4">
        {/* Monthly Spend Trend */}
        <Col xs={12} lg={7}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-bottom-0 pt-3 pb-0">
              <h6 className="fw-semibold mb-0">Monthly Spend Trend</h6>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: 260 }}>
                  <Spinner animation="border" />
                </div>
              ) : trendData.length === 0 ? (
                <div className="text-center text-muted py-5">No trend data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) =>
                        v >= 100000
                          ? `₹${(v / 100000).toFixed(1)}L`
                          : v >= 1000
                          ? `₹${(v / 1000).toFixed(0)}K`
                          : `₹${v}`
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Spend']}
                    />
                    <Bar dataKey="spend" fill="#4361ee" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Spend by Category */}
        <Col xs={12} lg={5}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-bottom-0 pt-3 pb-0">
              <h6 className="fw-semibold mb-0">Spend by Category</h6>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: 260 }}>
                  <Spinner animation="border" />
                </div>
              ) : categoryData.length === 0 ? (
                <div className="text-center text-muted py-5">No category data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="spend"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ category, percent }) =>
                        `${category} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tables Row */}
      <Row className="g-3">
        {/* Recent Purchase Requests */}
        <Col xs={12} lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h6 className="fw-semibold mb-0">Recent Purchase Requests</h6>
              <Link to="/procurement/purchase-requests" className="small text-primary text-decoration-none">
                View all
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : recentPRs.length === 0 ? (
                <div className="text-center text-muted py-4">No recent purchase requests</div>
              ) : (
                <Table hover responsive className="mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>PR No.</th>
                      <th>Title</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPRs.slice(0, 5).map((pr) => (
                      <tr key={pr._id}>
                        <td>
                          <Link
                            to={`/procurement/purchase-requests/${pr._id}`}
                            className="text-decoration-none fw-semibold"
                          >
                            {pr.prNumber ?? pr.requestNumber ?? '—'}
                          </Link>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 160 }}>
                          {pr.title ?? pr.description ?? '—'}
                        </td>
                        <td>{formatCurrency(pr.totalAmount ?? pr.estimatedAmount ?? 0)}</td>
                        <td>
                          <PRStatusBadge status={pr.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Top Vendors by Spend */}
        <Col xs={12} lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h6 className="fw-semibold mb-0">Top Vendors by Spend</h6>
              <Link to="/procurement/vendors" className="small text-primary text-decoration-none">
                View all
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : vendorData.length === 0 ? (
                <div className="text-center text-muted py-4">No vendor data available</div>
              ) : (
                <Table hover responsive className="mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Vendor</th>
                      <th>POs</th>
                      <th>Total Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorData.slice(0, 5).map((v, i) => (
                      <tr key={v._id ?? i}>
                        <td>
                          <Badge
                            bg="light"
                            text="dark"
                            className="border"
                            style={{ width: 24, textAlign: 'center' }}
                          >
                            {i + 1}
                          </Badge>
                        </td>
                        <td className="fw-semibold text-truncate" style={{ maxWidth: 160 }}>
                          {v.vendorName ?? v.name ?? '—'}
                        </td>
                        <td>{v.poCount ?? v.totalOrders ?? '—'}</td>
                        <td className="fw-semibold">{formatCurrency(v.totalSpend ?? v.spend ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProcurementDashboard;
