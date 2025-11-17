import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Form,
} from "react-bootstrap";
import { FaEye, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  DataTable,
  SearchBar,
  FilterDropdown,
  LoadingSpinner,
} from "../../components/shared";
import { paymentAPI } from "../../services/api";
import { useCompany } from "../../context/CompanyContext";
import PaymentVerificationModal from "../../components/admin/PaymentVerificationModal";

const PaymentVerification = () => {
  const { selectedCompany } = useCompany();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchPendingPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany]);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching pending payments from API...");
      console.log("API URL:", import.meta.env.VITE_API_URL);
      
      const response = await paymentAPI.getPending();
      console.log("✅ Pending payments response:", response);
      console.log("Response data:", response.data);
      
      // Handle both response.data and direct array response
      const paymentsData = Array.isArray(response.data) ? response.data : response.data?.data || [];
      console.log("Payments data array:", paymentsData);
      console.log("Selected company:", selectedCompany);
      
      // Filter by company on frontend since backend returns all pending
      const filteredPayments = paymentsData.filter(
        (payment) => payment.subscription?.company === selectedCompany
      );
      console.log("Filtered payments:", filteredPayments);
      
      setPayments(filteredPayments);
    } catch (error) {
      console.error("❌ Error fetching pending payments:", error);
      console.error("Error response:", error.response);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      if (error.code === "ERR_NETWORK") {
        toast.error("Network error. Cannot connect to backend server. Make sure it's running on port 5000.");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please make sure the backend is running.");
      } else if (error.response?.status === 401) {
        toast.error("Unauthorized. Please log in again.");
      } else {
        const errorMessage = error.response?.data?.message || error.message || "Failed to fetch pending payments";
        toast.error(errorMessage);
      }
      
      // Set empty array on error so UI doesn't break
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPayment(null);
  };

  const handleVerify = async (paymentId, adminNotes) => {
    try {
      await paymentAPI.verify(paymentId, { adminNotes });
      toast.success("Payment verified successfully");
      handleCloseModal();
      fetchPendingPayments();
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast.error(error.response?.data?.message || "Failed to verify payment");
    }
  };

  const handleReject = async (paymentId, rejectionReason) => {
    try {
      await paymentAPI.reject(paymentId, { rejectionReason });
      toast.success("Payment rejected");
      handleCloseModal();
      fetchPendingPayments();
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error(error.response?.data?.message || "Failed to reject payment");
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.subscription?.subscriptionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = !paymentMethodFilter || payment.paymentMethod === paymentMethodFilter;
    return matchesSearch && matchesMethod;
  });

  const pendingCount = payments.length;

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

  const columns = [
    {
      key: "client",
      label: "Client",
      render: (_, payment) => payment.client?.name || "N/A",
      sortable: false,
    },
    {
      key: "subscription",
      label: "Subscription #",
      render: (_, payment) => payment.subscription?.subscriptionNumber || "N/A",
      sortable: false,
    },
    {
      key: "amount",
      label: "Amount",
      render: (value) => `₹${value?.toLocaleString("en-IN")}`,
    },
    {
      key: "paymentDate",
      label: "Payment Date",
      render: (value) => value ? new Date(value).toLocaleDateString() : "N/A",
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      render: (value) => (
        <Badge bg="info">{getPaymentMethodLabel(value)}</Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Submitted On",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, payment) => (
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => handleViewPayment(payment)}
          title="View Details"
        >
          <FaEye className="me-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>
            Payment Verification Queue
            {pendingCount > 0 && (
              <Badge bg="warning" text="dark" className="ms-3">
                {pendingCount} Pending
              </Badge>
            )}
          </h2>
          <p className="text-muted">
            Managing payments for: <strong>{selectedCompany}</strong>
          </p>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <SearchBar
            placeholder="Search by client, subscription, or transaction ID..."
            onSearch={setSearchTerm}
          />
        </Col>
        <Col md={3}>
          <FilterDropdown
            label="Payment Method"
            options={[
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "upi", label: "UPI" },
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "cheque", label: "Cheque" },
            ]}
            value={paymentMethodFilter}
            onChange={setPaymentMethodFilter}
            placeholder="All Methods"
          />
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable
            columns={columns}
            data={filteredPayments}
            loading={loading}
            emptyMessage="No pending payments to verify."
            initialItemsPerPage={20}
          />
        </Card.Body>
      </Card>

      {/* Payment Verification Modal */}
      {selectedPayment && (
        <PaymentVerificationModal
          show={showModal}
          onHide={handleCloseModal}
          payment={selectedPayment}
          onVerify={handleVerify}
          onReject={handleReject}
        />
      )}
    </Container>
  );
};

export default PaymentVerification;
