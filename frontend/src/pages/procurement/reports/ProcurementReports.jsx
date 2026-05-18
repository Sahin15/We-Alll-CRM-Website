import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Tab, Nav, Form, Button, Spinner, Alert,
} from 'react-bootstrap';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { toast } from 'react-toastify';
import { FaDownload, FaSync } from 'react-icons/fa';
import {
  spendByVendor,
  spendByDepartment,
  spendByCategory,
  monthlyTrend,
  prStatusSummary,
  topVendors,
  exportCSV,
} from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const COLORS = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#06d6a0', '#ffd166', '#ef233c'];

const formatCurrency = (v) =>
  v >= 100000
    ? `₹${(v / 100000).toFixed(1)}L`
    : v >= 1000
    ? `₹${(v / 1000).toFixed(0)}K`
    : `₹${v}`;

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2];
const MONTH_OPTIONS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const EmptyState = ({ message = 'No data available for the selected period.' }) => (
  <div className="text-center text-muted py-5">{message}</div>
);

const ChartSpinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: 300 }}>
    <Spinner animation="border" variant="primary" />
  </div>
);

export default function ProcurementReports() {
  const [activeTab, setActiveTab] = useState('spend-vendor');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState('');
  const [exporting, setExporting] = useState(false);

  // Data states
  const [vendorData, setVendorData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [prStatusData, setPrStatusData] = useState([]);
  const [topVendorData, setTopVendorData] = useState([]);

  // Loading states per tab
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const params = { year, ...(month ? { month } : {}) };

  const fetchTab = useCallback(async (tab) => {
    setLoading((prev) => ({ ...prev, [tab]: true }));
    setErrors((prev) => ({ ...prev, [tab]: null }));
    try {
      switch (tab) {
        case 'spend-vendor': {
          const res = await spendByVendor(params);
          setVendorData(res.data ?? []);
          break;
        }
        case 'spend-dept': {
          const res = await spendByDepartment(params);
          setDeptData(res.data ?? []);
          break;
        }
        case 'spend-category': {
          const res = await spendByCategory(params);
          setCategoryData(res.data ?? []);
          break;
        }
        case 'monthly-trend': {
          const res = await monthlyTrend(params);
          setTrendData(res.data ?? []);
          break;
        }
        case 'pr-status': {
          const res = await prStatusSummary(params);
          setPrStatusData(res.data ?? []);
          break;
        }
        case 'top-vendors': {
          const res = await topVendors({ ...params, limit: 10 });
          setTopVendorData(res.data ?? []);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [tab]: err.response?.data?.message || 'Failed to load report data.',
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTab(activeTab);
  }, [activeTab, year, month, fetchTab]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await exportCSV({ ...params, report: activeTab });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `procurement-report-${activeTab}-${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully.');
    } catch {
      toast.error('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const isLoading = loading[activeTab];
  const tabError = errors[activeTab];

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Reports' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">Procurement Reports</h4>
          <small className="text-muted">Analyse spend, vendors, and procurement activity</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Form.Select
            size="sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 100 }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Form.Select>
          <Form.Select
            size="sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ width: 130 }}
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Form.Select>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => fetchTab(activeTab)}
            title="Refresh"
          >
            <FaSync />
          </Button>
          <Button
            size="sm"
            variant="outline-success"
            onClick={handleExportCSV}
            disabled={exporting}
          >
            {exporting ? <Spinner size="sm" animation="border" className="me-1" /> : <FaDownload className="me-1" />}
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            <Nav variant="tabs" className="px-3 pt-2">
              <Nav.Item>
                <Nav.Link eventKey="spend-vendor">Spend by Vendor</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="spend-dept">Spend by Department</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="spend-category">Spend by Category</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="monthly-trend">Monthly Trend</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="pr-status">PR Status Summary</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="top-vendors">Top Vendors</Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content className="p-3">
              {/* Spend by Vendor */}
              <Tab.Pane eventKey="spend-vendor">
                {isLoading ? <ChartSpinner /> : tabError ? (
                  <Alert variant="danger">{tabError}</Alert>
                ) : vendorData.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={vendorData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="vendor" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v), 'Spend']} />
                      <Bar dataKey="spend" fill="#4361ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Tab.Pane>

              {/* Spend by Department */}
              <Tab.Pane eventKey="spend-dept">
                {isLoading ? <ChartSpinner /> : tabError ? (
                  <Alert variant="danger">{tabError}</Alert>
                ) : deptData.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={deptData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="department" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v), 'Spend']} />
                      <Bar dataKey="spend" fill="#3a0ca3" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Tab.Pane>

              {/* Spend by Category */}
              <Tab.Pane eventKey="spend-category">
                {isLoading ? <ChartSpinner /> : tabError ? (
                  <Alert variant="danger">{tabError}</Alert>
                ) : categoryData.length === 0 ? <EmptyState /> : (
                  <Row>
                    <Col md={7}>
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            dataKey="spend"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={130}
                            label={({ category, percent }) =>
                              `${category} (${(percent * 100).toFixed(0)}%)`
                            }
                          >
                            {categoryData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Col>
                    <Col md={5}>
                      <div className="table-responsive mt-3">
                        <table className="table table-sm">
                          <thead className="table-light">
                            <tr><th>Category</th><th className="text-end">Spend</th></tr>
                          </thead>
                          <tbody>
                            {categoryData.map((row, i) => (
                              <tr key={i}>
                                <td>
                                  <span className="me-2" style={{ color: COLORS[i % COLORS.length] }}>●</span>
                                  {row.category}
                                </td>
                                <td className="text-end fw-semibold">
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(row.spend)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Col>
                  </Row>
                )}
              </Tab.Pane>

              {/* Monthly Trend */}
              <Tab.Pane eventKey="monthly-trend">
                {isLoading ? <ChartSpinner /> : tabError ? (
                  <Alert variant="danger">{tabError}</Alert>
                ) : trendData.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v), 'Spend']} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="spend"
                        stroke="#4361ee"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Tab.Pane>

              {/* PR Status Summary */}
              <Tab.Pane eventKey="pr-status">
                {isLoading ? <ChartSpinner /> : tabError ? (
                  <Alert variant="danger">{tabError}</Alert>
                ) : prStatusData.length === 0 ? <EmptyState /> : (
                  <Row>
                    <Col md={6}>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={prStatusData}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={110}
                            label={({ status, count }) => `${status}: ${count}`}
                          >
                            {prStatusData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Col>
                    <Col md={6}>
                      <div className="table-responsive mt-3">
                        <table className="table table-sm">
                          <thead className="table-light">
                            <tr><th>Status</th><th className="text-end">Count</th></tr>
                          </thead>
                          <tbody>
                            {prStatusData.map((row, i) => (
                              <tr key={i}>
                                <td>
                                  <span className="me-2" style={{ color: COLORS[i % COLORS.length] }}>●</span>
                                  {row.status}
                                </td>
                                <td className="text-end fw-semibold">{row.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Col>
                  </Row>
                )}
              </Tab.Pane>

              {/* Top Vendors */}
              <Tab.Pane eventKey="top-vendors">
                {isLoading ? <ChartSpinner /> : tabError ? (
                  <Alert variant="danger">{tabError}</Alert>
                ) : topVendorData.length === 0 ? <EmptyState /> : (
                  <Row>
                    <Col md={8}>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={topVendorData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="vendorName" tick={{ fontSize: 11 }} width={100} />
                          <Tooltip formatter={(v) => [new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v), 'Spend']} />
                          <Bar dataKey="totalSpend" fill="#7209b7" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Col>
                    <Col md={4}>
                      <div className="table-responsive mt-3">
                        <table className="table table-sm">
                          <thead className="table-light">
                            <tr><th>#</th><th>Vendor</th><th className="text-end">Spend</th></tr>
                          </thead>
                          <tbody>
                            {topVendorData.map((row, i) => (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{row.vendorName || row.name}</td>
                                <td className="text-end fw-semibold">
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(row.totalSpend ?? row.spend ?? 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Col>
                  </Row>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>
    </Container>
  );
}
