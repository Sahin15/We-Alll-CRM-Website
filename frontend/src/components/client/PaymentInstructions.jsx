import { Card, Button, Alert } from "react-bootstrap";
import { FaCopy, FaCheckCircle } from "react-icons/fa";
import { useState } from "react";
import { toast } from "react-toastify";

const PaymentInstructions = ({ subscription, amount }) => {
  const [copiedField, setCopiedField] = useState("");

  const company = subscription?.company || "We Alll";

  // Company payment details
  const paymentDetails = {
    "We Alll": {
      upiId: "wealll@paytm",
      bankName: "HDFC Bank",
      accountName: "We Alll Marketing",
      accountNumber: "50200012345678",
      ifscCode: "HDFC0001234",
    },
    "Kolkata Digital": {
      upiId: "kolkatadigital@paytm",
      bankName: "ICICI Bank",
      accountName: "Kolkata Digital Services",
      accountNumber: "60300087654321",
      ifscCode: "ICIC0002345",
    },
  };

  const details = paymentDetails[company] || paymentDetails["We Alll"];

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success(`${field} copied to clipboard!`);
      setTimeout(() => setCopiedField(""), 2000);
    });
  };

  return (
    <div className="payment-instructions">
      <Alert variant="info" className="mb-3">
        <Alert.Heading className="h6">
          <FaCheckCircle className="me-2" />
          Payment Instructions
        </Alert.Heading>
        <p className="mb-0 small">
          Please make the payment using one of the methods below and upload the payment proof screenshot.
        </p>
      </Alert>

      {/* UPI Payment */}
      <Card className="mb-3">
        <Card.Header className="bg-primary text-white">
          <strong>Option 1: UPI Payment (Recommended)</strong>
        </Card.Header>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <small className="text-muted">UPI ID:</small>
              <div className="fw-bold">{details.upiId}</div>
            </div>
            <Button
              size="sm"
              variant={copiedField === "UPI ID" ? "success" : "outline-primary"}
              onClick={() => copyToClipboard(details.upiId, "UPI ID")}
            >
              {copiedField === "UPI ID" ? (
                <>
                  <FaCheckCircle className="me-1" /> Copied
                </>
              ) : (
                <>
                  <FaCopy className="me-1" /> Copy
                </>
              )}
            </Button>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">Amount:</small>
              <div className="fw-bold text-success">₹{amount?.toLocaleString("en-IN")}</div>
            </div>
          </div>
          {subscription?.subscriptionNumber && (
            <div className="mt-2">
              <small className="text-muted">Reference:</small>
              <div className="fw-bold">{subscription.subscriptionNumber}</div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Bank Transfer */}
      <Card className="mb-3">
        <Card.Header className="bg-secondary text-white">
          <strong>Option 2: Bank Transfer</strong>
        </Card.Header>
        <Card.Body>
          <div className="row g-2">
            <div className="col-md-6">
              <small className="text-muted">Bank Name:</small>
              <div className="fw-bold">{details.bankName}</div>
            </div>
            <div className="col-md-6">
              <small className="text-muted">Account Name:</small>
              <div className="fw-bold">{details.accountName}</div>
            </div>
            <div className="col-md-6">
              <small className="text-muted">Account Number:</small>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">{details.accountNumber}</span>
                <Button
                  size="sm"
                  variant={copiedField === "Account Number" ? "success" : "outline-secondary"}
                  onClick={() => copyToClipboard(details.accountNumber, "Account Number")}
                >
                  {copiedField === "Account Number" ? <FaCheckCircle /> : <FaCopy />}
                </Button>
              </div>
            </div>
            <div className="col-md-6">
              <small className="text-muted">IFSC Code:</small>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">{details.ifscCode}</span>
                <Button
                  size="sm"
                  variant={copiedField === "IFSC Code" ? "success" : "outline-secondary"}
                  onClick={() => copyToClipboard(details.ifscCode, "IFSC Code")}
                >
                  {copiedField === "IFSC Code" ? <FaCheckCircle /> : <FaCopy />}
                </Button>
              </div>
            </div>
            <div className="col-12">
              <small className="text-muted">Amount:</small>
              <div className="fw-bold text-success">₹{amount?.toLocaleString("en-IN")}</div>
            </div>
            {subscription?.subscriptionNumber && (
              <div className="col-12">
                <small className="text-muted">Reference:</small>
                <div className="fw-bold">{subscription.subscriptionNumber}</div>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Important Notes */}
      <Alert variant="warning" className="mb-0">
        <strong>Important:</strong>
        <ul className="mb-0 mt-2 small">
          <li>After making the payment, take a screenshot of the payment confirmation</li>
          <li>Upload the screenshot in the form below</li>
          <li>Include the transaction ID in the form</li>
          <li>Your payment will be verified by our team within 24 hours</li>
        </ul>
      </Alert>
    </div>
  );
};

export default PaymentInstructions;
