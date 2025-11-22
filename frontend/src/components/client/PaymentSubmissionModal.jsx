import { useState } from "react";
import { Modal, Button, Form, Row, Col, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import ImageUpload from "./ImageUpload";
import PaymentInstructions from "./PaymentInstructions";
import axios from "axios";

const PaymentSubmissionModal = ({ show, onHide, subscription, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: subscription?.totalAmount || 0,
    paymentMethod: "upi",
    paymentDate: new Date().toISOString().split("T")[0],
    upiId: "",
    transactionId: "",
    bankName: "",
    paymentProof: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleImageUpload = (imageUrl) => {
    setFormData({ ...formData, paymentProof: imageUrl });
    if (errors.paymentProof) {
      setErrors({ ...errors, paymentProof: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = "Please select a payment method";
    }

    if (!formData.paymentDate) {
      newErrors.paymentDate = "Payment date is required";
    }

    if (formData.paymentMethod === "upi") {
      if (!formData.upiId) {
        newErrors.upiId = "UPI ID is required";
      }
      if (!formData.transactionId) {
        newErrors.transactionId = "Transaction ID is required";
      }
    }

    if (formData.paymentMethod === "bank_transfer") {
      if (!formData.transactionId) {
        newErrors.transactionId = "Transaction ID is required";
      }
    }

    if (!formData.paymentProof) {
      newErrors.paymentProof = "Payment proof screenshot is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        subscriptionId: subscription._id,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        paymentProof: formData.paymentProof,
        notes: formData.notes,
      };

      if (formData.paymentMethod === "upi") {
        payload.upiDetails = {
          upiId: formData.upiId,
          transactionId: formData.transactionId,
        };
      } else if (formData.paymentMethod === "bank_transfer") {
        payload.transactionId = formData.transactionId;
        if (formData.bankName) {
          payload.bankName = formData.bankName;
        }
      }

      await axios.post(
        `${API_BASE_URL}/payments/submit-verification`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Payment submitted successfully! We'll verify it within 24 hours.");
      onHide();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error(error.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Submit Payment</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Payment Instructions */}
          <PaymentInstructions subscription={subscription} amount={formData.amount} />

          <hr className="my-4" />

          <h6 className="mb-3">Payment Details</h6>

          {/* Amount */}
          <Form.Group className="mb-3">
            <Form.Label>
              Amount <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              isInvalid={!!errors.amount}
              min="0"
              step="0.01"
            />
            <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
          </Form.Group>

          {/* Payment Method */}
          <Form.Group className="mb-3">
            <Form.Label>
              Payment Method <span className="text-danger">*</span>
            </Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="UPI"
                name="paymentMethod"
                value="upi"
                checked={formData.paymentMethod === "upi"}
                onChange={handleChange}
              />
              <Form.Check
                inline
                type="radio"
                label="Bank Transfer"
                name="paymentMethod"
                value="bank_transfer"
                checked={formData.paymentMethod === "bank_transfer"}
                onChange={handleChange}
              />
              <Form.Check
                inline
                type="radio"
                label="Cash"
                name="paymentMethod"
                value="cash"
                checked={formData.paymentMethod === "cash"}
                onChange={handleChange}
              />
            </div>
            {errors.paymentMethod && (
              <div className="text-danger small">{errors.paymentMethod}</div>
            )}
          </Form.Group>

          {/* Payment Date */}
          <Form.Group className="mb-3">
            <Form.Label>
              Payment Date <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="date"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleChange}
              isInvalid={!!errors.paymentDate}
              max={new Date().toISOString().split("T")[0]}
            />
            <Form.Control.Feedback type="invalid">{errors.paymentDate}</Form.Control.Feedback>
          </Form.Group>

          {/* UPI Details */}
          {formData.paymentMethod === "upi" && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Your UPI ID <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleChange}
                    placeholder="yourname@paytm"
                    isInvalid={!!errors.upiId}
                  />
                  <Form.Control.Feedback type="invalid">{errors.upiId}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Transaction ID <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={handleChange}
                    placeholder="TXN123456789"
                    isInvalid={!!errors.transactionId}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.transactionId}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          )}

          {/* Bank Transfer Details */}
          {formData.paymentMethod === "bank_transfer" && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Transaction ID <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={handleChange}
                    placeholder="BANK123456"
                    isInvalid={!!errors.transactionId}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.transactionId}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bank Name (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="HDFC Bank"
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {/* Payment Proof Upload */}
          <Form.Group className="mb-3">
            <Form.Label>
              Payment Proof Screenshot <span className="text-danger">*</span>
            </Form.Label>
            <ImageUpload
              onUploadSuccess={handleImageUpload}
              onUploadError={(error) => setErrors({ ...errors, paymentProof: error })}
            />
            {errors.paymentProof && (
              <div className="text-danger small mt-2">{errors.paymentProof}</div>
            )}
          </Form.Group>

          {/* Notes */}
          <Form.Group className="mb-3">
            <Form.Label>Notes (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional information about this payment..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Submitting...
              </>
            ) : (
              "Submit for Verification"
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default PaymentSubmissionModal;
