import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Alert } from "react-bootstrap";
import { FaCreditCard, FaCalendar, FaDollarSign } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import PaymentSubmissionModal from "../../components/client/PaymentSubmissionModal";

const ClientSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/subscriptions/my-subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscriptions(response.data);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = (subscription) => {
    setSelectedSubscription(subscription);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchSubscriptions();
    toast.success("Payment submitted successfully!");
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: "success", text: "Active" },
      pending: { bg: "warning", text: "Pending" },
      expired: { bg: "danger", text: "Expired" },
      cancelled: { bg: "secondary", text: "Cancelled" },
      suspended: { bg: "warning", text: "Suspended" },
    };

    const config = statusConfig[status?.toLowerCase()] || {
      bg: "secondary",
      text: status || "Unknown",
    };

    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const getBillingCycleLabel = (cycle) => {
    const labels = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      "half-yearly": "Half-Yearly",
      yearly: "Yearly",
      "one-time": "One-Time",
    };
    return labels[cycle] || cycle;
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
          <h2>My Subscriptions</h2>
          <p className="text-muted">View and manage your active subscriptions</p>
        </Col>
      </Row>

      {subscriptions.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading className="h6">No Subscriptions</Alert.Heading>
          <p className="mb-0">
            You don't have any subscriptions yet. Contact our sales team to get started!
          </p>
        </Alert>
      ) : (
        <Row>
          {subscriptions.map((subscription) => (
            <Col key={subscription._id} md={6} lg={4} className="mb-4">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Header className="bg-white border-bottom">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">{subscription.plan?.name || "Plan"}</h6>
                    {getStatusBadge(subscription.status)}
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <small className="text-muted">Subscription Number</small>
                    <div className="fw-bold">{subscription.subscriptionNumber}</div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Company</small>
                    <div className="fw-bold">{subscription.company}</div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex align-items-center text-muted mb-1">
                      <FaDollarSign className="me-2" />
                      <small>Amount</small>
                    </div>
                    <div className="fw-bold text-success fs-5">
                      {formatCurrency(subscription.totalAmount)}
                    </div>
                    <small className="text-muted">
                      {getBillingCycleLabel(subscription.billingCycle)}
                    </small>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex align-items-center text-muted mb-1">
                      <FaCalendar className="me-2" />
                      <small>Period</small>
                    </div>
                    <div>
                      <small>
                        {formatDate(subscription.startDate)} -{" "}
                        {formatDate(subscription.endDate)}
                      </small>
                    </div>
                  </div>

                  {subscription.addOns && subscription.addOns.length > 0 && (
                    <div className="mb-3">
                      <small className="text-muted">Add-ons</small>
                      <div>
                        {subscription.addOns.map((addOn, index) => (
                          <Badge key={index} bg="info" className="me-1">
                            {addOn.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {subscription.status === "pending" && (
                    <Alert variant="warning" className="mb-0 small">
                      Payment pending. Please submit payment to activate.
                    </Alert>
                  )}
                </Card.Body>
                <Card.Footer className="bg-white border-top">
                  {subscription.status === "pending" ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-100"
                      onClick={() => handleMakePayment(subscription)}
                    >
                      <FaCreditCard className="me-2" />
                      Make Payment
                    </Button>
                  ) : subscription.status === "active" ? (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="w-100"
                      disabled
                    >
                      <FaCreditCard className="me-2" />
                      Active
                    </Button>
                  ) : (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="w-100"
                      disabled
                    >
                      {subscription.status}
                    </Button>
                  )}
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Payment Submission Modal */}
      {selectedSubscription && (
        <PaymentSubmissionModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          subscription={selectedSubscription}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </Container>
  );
};

export default ClientSubscriptions;
