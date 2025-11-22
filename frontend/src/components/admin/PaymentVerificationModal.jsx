import { useState } from "react";
import { Modal, Button, Form, Row, Col, Badge, Image, Card } from "react-bootstrap";
import { FaCheckCircle, FaTimesCircle, FaSearchPlus } from "react-icons/fa";
import ConfirmDialog from "../shared/ConfirmDialog";

const PaymentVerificationModal = ({ show, onHide, payment, onVerify, onReject }) => {
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleVerifyClick = () => {
    setShowVerifyConfirm(true);
  };

  const handleRejectClick = () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    setShowRejectConfirm(true);
  };

  const handleConfirmVerify = async () => {
    setProcessing(true);
    try {
      await onVerify(payment._id, adminNotes);
      setShowVerifyConfirm(false);
    } catch (error) {
      console.error("Error verifying payment:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    setProcessing(true);
    try {
      await onReject(payment._id, rejectionReason);
      setShowRejectConfirm(false);
    } catch (error) {
      console.error("Error rejecting payment:", error);
    } finally {
      setProcessing(false);
    }
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

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Payment Verification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Payment Details Section */}
          <Card className="mb-3">
            <Card.Header>
              <strong>Payment Details</strong>
            </Card.Header>
            <Card.Body>
              <Row className="mb-2">
                <Col md={6}>
                  <strong>Client:</strong> {payment.client?.name || "N/A"}
                </Col>
                <Col md={6}>
                  <strong>Email:</strong> {payment.client?.email || "N/A"}
                </Col>
              </Row>
              <Row className="mb-2">
                <Col md={6}>
                  <strong>Phone:</strong> {payment.client?.phone || "N/A"}
                </Col>
                <Col md={6}>
                  <strong>Company:</strong> {payment.client?.company || "N/A"}
                </Col>
              </Row>
              <Row className="mb-2">
                <Col md={6}>
                  <strong>Subscription #:</strong>{" "}
                  {payment.subscription?.subscriptionNumber || "N/A"}
                </Col>
                <Col md={6}>
                  <strong>Amount:</strong>{" "}
                  <span className="text-success fw-bold">
                    ₹{payment.amount?.toLocaleString("en-IN")}
                  </span>
                </Col>
              </Row>
              <Row className="mb-2">
                <Col md={6}>
                  <strong>Payment Method:</strong>{" "}
                  <Badge bg="info">{getPaymentMethodLabel(payment.paymentMethod)}</Badge>
                </Col>
                <Col md={6}>
                  <strong>Payment Date:</strong> {formatDate(payment.paymentDate)}
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <strong>Submitted On:</strong> {formatDate(payment.createdAt)}
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Payment Method Specific Details */}
          {payment.paymentMethod === "upi" && payment.upiDetails && (
            <Card className="mb-3">
              <Card.Header>
                <strong>UPI Details</strong>
              </Card.Header>
              <Card.Body>
                <Row className="mb-2">
                  <Col md={6}>
                    <strong>UPI ID:</strong> {payment.upiDetails.upiId || "N/A"}
                  </Col>
                  <Col md={6}>
                    <strong>Transaction ID:</strong>{" "}
                    {payment.upiDetails.transactionId || payment.transactionId || "N/A"}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {payment.paymentMethod === "bank_transfer" && payment.transactionId && (
            <Card className="mb-3">
              <Card.Header>
                <strong>Bank Transfer Details</strong>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={12}>
                    <strong>Transaction ID:</strong> {payment.transactionId}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Payment Proof */}
          {payment.paymentProof && (
            <Card className="mb-3">
              <Card.Header>
                <strong>Payment Proof</strong>
              </Card.Header>
              <Card.Body className="text-center">
                <div className="position-relative d-inline-block">
                  <Image
                    src={payment.paymentProof}
                    alt="Payment Proof"
                    thumbnail
                    style={{ maxWidth: "100%", maxHeight: "400px", cursor: "pointer" }}
                    onClick={() => setShowImageModal(true)}
                  />
                  <Button
                    variant="light"
                    size="sm"
                    className="position-absolute top-0 end-0 m-2"
                    onClick={() => setShowImageModal(true)}
                  >
                    <FaSearchPlus /> Zoom
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Client Notes */}
          {payment.notes && (
            <Card className="mb-3">
              <Card.Header>
                <strong>Client Notes</strong>
              </Card.Header>
              <Card.Body>
                <p className="mb-0">{payment.notes}</p>
              </Card.Body>
            </Card>
          )}

          {/* Admin Notes */}
          <Card className="mb-3">
            <Card.Header>
              <strong>Admin Notes</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Add notes about this payment verification..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Rejection Reason (shown when rejecting) */}
          <Card className="mb-3">
            <Card.Header>
              <strong>Rejection Reason</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Provide a reason for rejection (required if rejecting)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
          <Button
            variant="danger"
            onClick={handleRejectClick}
            disabled={processing}
          >
            <FaTimesCircle className="me-2" />
            Reject Payment
          </Button>
          <Button
            variant="success"
            onClick={handleVerifyClick}
            disabled={processing}
          >
            <FaCheckCircle className="me-2" />
            Verify Payment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Zoom Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Payment Proof</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <Image
            src={payment.paymentProof}
            alt="Payment Proof"
            style={{ maxWidth: "100%", maxHeight: "80vh" }}
          />
        </Modal.Body>
      </Modal>

      {/* Verify Confirmation Dialog */}
      <ConfirmDialog
        show={showVerifyConfirm}
        onHide={() => setShowVerifyConfirm(false)}
        onConfirm={handleConfirmVerify}
        title="Verify Payment"
        message={`Are you sure you want to verify this payment of ₹${payment.amount?.toLocaleString("en-IN")}? This will activate the subscription and update the invoice status.`}
        confirmText="Verify"
        variant="success"
        loading={processing}
      />

      {/* Reject Confirmation Dialog */}
      <ConfirmDialog
        show={showRejectConfirm}
        onHide={() => setShowRejectConfirm(false)}
        onConfirm={handleConfirmReject}
        title="Reject Payment"
        message={`Are you sure you want to reject this payment? The client will be notified with the rejection reason.`}
        confirmText="Reject"
        variant="danger"
        loading={processing}
      />
    </>
  );
};

export default PaymentVerificationModal;
