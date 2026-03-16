import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Spinner, Alert } from "react-bootstrap";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { getExpenseAnalytics, getMonthlyTrends, getCategoryStats } from "../../api/expenseApi";
import toast from "../../utils/toast";

const ExpenseAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [months, setMonths] = useState(12);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters, months]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [categoryRes, statusRes, trendsRes, statsRes] = await Promise.all([
        getExpenseAnalytics({ ...params, groupBy: "category" }),
        getExpenseAnalytics({ ...params, groupBy: "status" }),
        getMonthlyTrends({ months }),
        getCategoryStats(),
      ]);

      // Format category data
      const formattedCategory = categoryRes.analytics.map((item) => ({
        name: item._id.replace(/_/g, " "),
        value: item.total,
        count: item.count,
      }));
      setCategoryData(formattedCategory);

      // Format status data
      const formattedStatus = statusRes.analytics.map((item) => ({
        name: item._id,
        value: item.total,
        count: item.count,
      }));
      setStatusData(formattedStatus);

      // Format trend data
      const formattedTrends = trendsRes.trends.map((item) => ({
        month: `${item._id.month}/${item._id.year}`,
        total: item.total,
        approved: item.approved,
        pending: item.pending,
        rejected: item.rejected,
      }));
      setTrendData(formattedTrends);

      // Format category stats
      setCategoryStats(statsRes.categoryStats);
    } catch (error) {
      toast.error("Failed to fetch analytics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Expense Analytics</h2>
          <p className="text-muted">Visualize and analyze expense data</p>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 p-3">
        <Row>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Trend Months</Form.Label>
              <Form.Select value={months} onChange={(e) => setMonths(e.target.value)}>
                <option value="3">Last 3 Months</option>
                <option value="6">Last 6 Months</option>
                <option value="12">Last 12 Months</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </Card>

      {/* Charts Row 1 */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Expenses by Category</h6>
            </Card.Header>
            <Card.Body>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Alert variant="info" className="mb-0">
                  No data available
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Expenses by Status</h6>
            </Card.Header>
            <Card.Body>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert variant="info" className="mb-0">
                  No data available
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Trend Chart */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Monthly Expense Trends</h6>
            </Card.Header>
            <Card.Body>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" />
                    <Line type="monotone" dataKey="approved" stroke="#82ca9d" name="Approved" />
                    <Line type="monotone" dataKey="pending" stroke="#ffc658" name="Pending" />
                    <Line type="monotone" dataKey="rejected" stroke="#ff7c7c" name="Rejected" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Alert variant="info" className="mb-0">
                  No data available
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Category Statistics Table */}
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Category Statistics</h6>
            </Card.Header>
            <Card.Body>
              {categoryStats.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Category</th>
                        <th>Total</th>
                        <th>Count</th>
                        <th>Average</th>
                        <th>Pending</th>
                        <th>Approved</th>
                        <th>Rejected</th>
                        <th>Reimbursed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryStats.map((stat) => (
                        <tr key={stat._id}>
                          <td>
                            <strong>{stat._id.replace(/_/g, " ")}</strong>
                          </td>
                          <td>{formatCurrency(stat.total)}</td>
                          <td>{stat.count}</td>
                          <td>{formatCurrency(stat.average)}</td>
                          <td>
                            <span className="badge bg-warning">{stat.pending}</span>
                          </td>
                          <td>
                            <span className="badge bg-info">{stat.approved}</span>
                          </td>
                          <td>
                            <span className="badge bg-danger">{stat.rejected}</span>
                          </td>
                          <td>
                            <span className="badge bg-success">{stat.reimbursed}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Alert variant="info" className="mb-0">
                  No data available
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ExpenseAnalytics;
