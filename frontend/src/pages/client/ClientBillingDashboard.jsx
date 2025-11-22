import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Alert } from "react-bootstrap";
import {
  FaCheckCircle,
  FaClock,
  FaDollarSign,
  FaHistory,
  FaFileInvoice,
  FaCreditCard,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import PaymentStatusBadge from "../../components/client/PaymentStatusBadge";

const ClientBillingDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/client-dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString("en-IN") || 0}`;
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Billing Dashboard</h2>
          <p className="text-muted">Manage your subscriptions and payments</p>
        </Col>
      </Row>

      {/* Alert for pending payments */}
      {stats?.pendingPaymentsCount > 0 && (
        <Alert variant="warning" className="mb-4">
          <Alert.Heading className="h6">
            <FaClock className="me-2" />
            Pending Payments
          </Alert.Heading>
          <p className="mb-2">
            You have {stats.pendingPaymentsCount} payment(s) pending verification totaling{" "}
            {formatCurrency(stats.pendingPaymentsTotal)}.
          </p>
          <Button
            as={Link}
            to="/client/payments"
            variant="warning"
            size="sm"
          >
            View Payments
          </Button>
        </Alert>
      )}

      {/* Alert for amount due */}
      {stats?.totalDue > 0 && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading className="h6">
            <FaDollarSign className="me-2" />
            Payment Due
          </Alert.Heading>
          <p className="mb-2">
            You have {formatCurrency(stats.totalDue)} due for payment.
            {stats.nextPaymentDue && (
              <> Next payment due: <strong>{formatDate(stats.nextPaymentDue)}</strong></>
            )}
          </p>
          <Button
            as={Link}
            to="/client/subscriptions"
            variant="danger"
            size="sm"
          >
            Make Payment
          </Button>
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1">Active Subscriptions</p>
                  <h3 className="mb-0">{stats?.activeSubscriptions || 0}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <FaCheckCircle size={24} className="text-success" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1">Pending Payments</p>
                  <h3 className="mb-0">{stats?.pendingPaymentsCount || 0}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <FaClock size={24} className="text-warning" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1">Total Due</p>
                  <h3 className="mb-0">{formatCurrency(stats?.totalDue)}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded">
                  <FaDollarSign size={24} className="text-danger" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1">Pending Subscriptions</p>
                  <h3 className="mb-0">{stats?.pendingSubscriptions || 0}</h3>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <FaCreditCard size={24} className="text-info" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Quick Actions</h5>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  as={Link}
                  to="/client/subscriptions"
                  variant="primary"
                >
                  <FaCreditCard className="me-2" />
                  View Subscriptions
                </Button>
                <Button
                  as={Link}
                  to="/client/invoices"
                  variant="outline-primary"
                >
                  <FaFileInvoice className="me-2" />
                  View Invoices
                </Button>
                <Button
                  as={Link}
                  to="/client/payments"
                  variant="outline-primary"
                >
                  <FaHistory className="me-2" />
                  Payment History
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Recent Activity</h5>
            </Card.Header>
            <Card.Body>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="list-group list-group-flush">
                  {stats.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="list-group-item border-0 px-0 py-3"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            {activity.type === "payment" ? (
                              <FaCreditCard className="text-primary me-2" />
                            ) : (
                              <FaFileInvoice className="text-info me-2" />
                            )}
                            <strong>
                              {activity.type === "payment"
                                ? "Payment"
                                : "Invoice"}{" "}
                              {activity.type === "payment"
                                ? activity.subscription
                                : activity.invoiceNumber}
                            </strong>
                          </div>
                          <div className="d-flex align-items-center gap-3">
                            <small className="text-muted">
                              {formatDate(activity.date)}
                            </small>
                            <PaymentStatusBadge status={activity.status} />
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold">
                            {formatCurrency(activity.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4 mb-0">
                  No recent activity
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ClientBillingDashboard;
