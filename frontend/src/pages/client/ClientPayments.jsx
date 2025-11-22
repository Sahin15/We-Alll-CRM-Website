import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Alert, Button, Modal, Image } from "react-bootstrap";
import { FaEye, FaHistory } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import PaymentStatusBadge from "../../components/client/PaymentStatusBadge";

const ClientPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/payments/my-payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayments(response.data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString("en-IN") || 0}`;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      bank_transfer: "Bank Transfer",
      upi: "UPI",
      cash: "Cash",
      card: "Card",
      cheque: "Cheque",
      paypal: "PayPal",
      other: "Other",
    };
    return labels[method] || method;
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
          <h2>Payment History</h2>
          <p className="text-muted">Track your payment submissions and status</p>
        </Col>
      </Row>

      {payments.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading className="h6">
            <FaHistory className="me-2" />
            No Payments
          </Alert.Heading>
          <p className="mb-0">
            You haven't made any payments yet. Payments will appear here once submitted.
          </p>
        </Alert>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Date</th>
                    <th>Subscription</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>{formatDate(payment.createdAt)}</td>
                      <td>{payment.subscription?.subscriptionNumber || "N/A"}</td>
                      <td>
                        <strong className="text-success">
                          {formatCurrency(payment.amount)}
                        </strong>
                      </td>
                      <td>{getPaymentMethodLabel(payment.paymentMethod)}</td>
                      <td>
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleViewDetails(payment)}
                          title="View Details"
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <Modal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Payment Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="mb-3">
              <Col md={6}>
                <small className="text-muted">Subscription</small>
                <div className="fw-bold">
                  {selectedPayment.subscription?.subscriptionNumber || "N/A"}
                </div>
              </Col>
              <Col md={6}>
                <small className="text-muted">Amount</small>
                <div className="fw-bold text-success fs-5">
                  {formatCurrency(selectedPayment.amount)}
                </div>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <small className="text-muted">Payment Method</small>
                <div className="fw-bold">
                  {getPaymentMethodLabel(selectedPayment.paymentMethod)}
                </div>
              </Col>
              <Col md={6}>
                <small className="text-muted">Status</small>
                <div>
                  <PaymentStatusBadge status={selectedPayment.status} />
                </div>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <small className="text-muted">Submitted On</small>
                <div>{formatDate(selectedPayment.createdAt)}</div>
              </Col>
              {selectedPayment.verifiedAt && (
                <Col md={6}>
                  <small className="text-muted">Verified On</small>
                  <div>{formatDate(selectedPayment.verifiedAt)}</div>
                </Col>
              )}
            </Row>

            {selectedPayment.upiDetails && (
              <Row className="mb-3">
                <Col md={6}>
                  <small className="text-muted">UPI ID</small>
                  <div>{selectedPayment.upiDetails.upiId || "N/A"}</div>
                </Col>
                <Col md={6}>
                  <small className="text-muted">Transaction ID</small>
                  <div>{selectedPayment.upiDetails.transactionId || "N/A"}</div>
                </Col>
              </Row>
            )}

            {selectedPayment.transactionId && !selectedPayment.upiDetails && (
              <Row className="mb-3">
                <Col md={12}>
                  <small className="text-muted">Transaction ID</small>
                  <div>{selectedPayment.transactionId}</div>
                </Col>
              </Row>
            )}

            {selectedPayment.paymentProof && (
              <Row className="mb-3">
                <Col md={12}>
                  <small className="text-muted">Payment Proof</small>
                  <div className="mt-2">
                    <Image
                      src={selectedPayment.paymentProof}
                      alt="Payment Proof"
                      thumbnail
                      style={{ maxWidth: "100%", maxHeight: "400px" }}
                    />
                  </div>
                </Col>
              </Row>
            )}

            {selectedPayment.notes && (
              <Row className="mb-3">
                <Col md={12}>
                  <small className="text-muted">Your Notes</small>
                  <div className="border rounded p-2 bg-light">
                    {selectedPayment.notes}
                  </div>
                </Col>
              </Row>
            )}

            {selectedPayment.status === "rejected" && selectedPayment.rejectionReason && (
              <Alert variant="danger">
                <Alert.Heading className="h6">Rejection Reason</Alert.Heading>
                <p className="mb-0">{selectedPayment.rejectionReason}</p>
              </Alert>
            )}

            {selectedPayment.status === "verified" && (
              <Alert variant="success">
                <Alert.Heading className="h6">Payment Verified</Alert.Heading>
                <p className="mb-0">
                  Your payment has been verified and your subscription is now active.
                </p>
              </Alert>
            )}

            {selectedPayment.status === "pending" && (
              <Alert variant="warning">
                <Alert.Heading className="h6">Verification Pending</Alert.Heading>
                <p className="mb-0">
                  Your payment is being verified by our team. This usually takes up to 24 hours.
                </p>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
};

export default ClientPayments;
