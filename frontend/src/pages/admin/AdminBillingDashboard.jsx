import { useState, useEffect } from "react";
import { Container, Row, Col, Card, ListGroup, Badge, Button, Spinner } from "react-bootstrap";
import { useCompany } from "../../context/CompanyContext";
import { toast } from "react-toastify";
import api from "../../services/api";

const AdminBillingDashboard = () => {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    revenue: {
      currentMonth: 0,
      previousMonth: 0,
      ytd: 0,
      percentageChange: 0,
    },
    quickStats: {
      activeSubscriptions: 0,
      pendingPayments: 0,
      overdueInvoices: 0,
    },
    revenueTrend: [],
    popularServices: [],
    popularPlans: [],
    recentActivity: [],
  });

  // Fetch dashboard stats
  const fetchDashboardStats = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = selectedCompany !== "All Companies" ? { company: selectedCompany } : {};
      const response = await api.get("/admin-dashboard/stats", { params });
      setStats(response.data);

      if (showRefreshToast) {
        toast.success("Dashboard refreshed");
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on mount and when company changes
  useEffect(() => {
    fetchDashboardStats();
  }, [selectedCompany]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    const variants = {
      verified: "success",
      pending: "warning",
      rejected: "danger",
      paid: "success",
      sent: "info",
      overdue: "danger",
      draft: "secondary",
      active: "success",
    };
    return variants[status] || "secondary";
  };

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Admin Billing Dashboard</h2>
              <p className="text-muted mb-0">
                Currently viewing: <strong>{selectedCompany}</strong>
              </p>
            </div>
            <Button
              variant="outline-primary"
              onClick={() => fetchDashboardStats(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Refresh
                </>
              )}
            </Button>
          </div>
        </Col>
      </Row>

      {/* Revenue Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Current Month Revenue</h6>
                  <h3 className="mb-1">{formatCurrency(stats.revenue.currentMonth)}</h3>
                  <small
                    className={
                      stats.revenue.percentageChange >= 0 ? "text-success" : "text-danger"
                    }
                  >
                    {stats.revenue.percentageChange >= 0 ? "+" : ""}
                    {stats.revenue.percentageChange.toFixed(1)}% from last month
                  </small>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <i className="bi bi-currency-rupee text-primary fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Previous Month Revenue</h6>
                  <h3 className="mb-1">{formatCurrency(stats.revenue.previousMonth)}</h3>
                  <small className="text-muted">Last month's total</small>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <i className="bi bi-graph-up text-info fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Year-to-Date Revenue</h6>
                  <h3 className="mb-1">{formatCurrency(stats.revenue.ytd)}</h3>
                  <small className="text-muted">Total for {new Date().getFullYear()}</small>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="bi bi-calendar-check text-success fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Active Subscriptions</h6>
                  <h3 className="mb-0">{stats.quickStats.activeSubscriptions}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="bi bi-check-circle text-success fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Pending Payments</h6>
                  <h3 className="mb-0">{stats.quickStats.pendingPayments}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <i className="bi bi-clock-history text-warning fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Overdue Invoices</h6>
                  <h3 className="mb-0">{stats.quickStats.overdueInvoices}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded">
                  <i className="bi bi-exclamation-triangle text-danger fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue Trend Chart */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-4">Revenue Trend (Last 12 Months)</h5>
              <div className="revenue-chart">
                {stats.revenueTrend.length > 0 ? (
                  <div className="d-flex align-items-end justify-content-between" style={{ height: "250px" }}>
                    {stats.revenueTrend.map((item, index) => {
                      const maxRevenue = Math.max(...stats.revenueTrend.map((t) => t.revenue));
                      const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={index} className="text-center flex-fill" style={{ maxWidth: "80px" }}>
                          <div
                            className="bg-primary rounded-top mx-auto"
                            style={{
                              height: `${height}%`,
                              width: "40px",
                              minHeight: item.revenue > 0 ? "10px" : "0",
                            }}
                            title={formatCurrency(item.revenue)}
                          ></div>
                          <small className="text-muted d-block mt-2" style={{ fontSize: "0.7rem" }}>
                            {item.month}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted text-center">No revenue data available</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Popular Services and Plans */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="mb-3">Popular Services (Top 5)</h5>
              {stats.popularServices.length > 0 ? (
                <ListGroup variant="flush">
                  {stats.popularServices.map((service, index) => (
                    <ListGroup.Item key={service._id} className="px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">
                            {index + 1}. {service.name}
                          </div>
                          <small className="text-muted">
                            {service.category} • {formatCurrency(service.basePrice)}
                          </small>
                        </div>
                        <Badge bg="primary" pill>
                          {service.subscriptionCount} subscriptions
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center py-4">No services data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="mb-3">Popular Plans (Top 5)</h5>
              {stats.popularPlans.length > 0 ? (
                <ListGroup variant="flush">
                  {stats.popularPlans.map((plan, index) => (
                    <ListGroup.Item key={plan._id} className="px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">
                            {index + 1}. {plan.name}
                          </div>
                          <small className="text-muted">
                            {plan.planType} • {formatCurrency(plan.totalPrice)}
                          </small>
                        </div>
                        <Badge bg="success" pill>
                          {plan.subscriptionCount} subscriptions
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center py-4">No plans data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Recent Activity</h5>
              {stats.recentActivity.length > 0 ? (
                <ListGroup variant="flush">
                  {stats.recentActivity.map((activity, index) => (
                    <ListGroup.Item key={index} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <i
                              className={`bi ${
                                activity.type === "payment"
                                  ? "bi-cash-coin text-success"
                                  : "bi-file-earmark-text text-primary"
                              } me-2`}
                            ></i>
                            <span className="fw-bold text-capitalize">{activity.type}</span>
                            <Badge bg={getStatusVariant(activity.status)} className="ms-2">
                              {activity.status}
                            </Badge>
                          </div>
                          <div className="text-muted small">
                            {activity.client && <span>Client: {activity.client} • </span>}
                            {activity.type === "payment" && activity.subscription && (
                              <span>Subscription: {activity.subscription} • </span>
                            )}
                            {activity.type === "invoice" && activity.invoiceNumber && (
                              <span>Invoice: {activity.invoiceNumber} • </span>
                            )}
                            <span>{formatDate(activity.date)}</span>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold">{formatCurrency(activity.amount)}</div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center py-4">No recent activity</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminBillingDashboard;
