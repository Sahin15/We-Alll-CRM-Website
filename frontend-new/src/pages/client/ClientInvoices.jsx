import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Table, Alert } from "react-bootstrap";
import { FaDownload, FaEye, FaFileInvoice } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";

const ClientInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/invoices/my-invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/invoices/${invoice._id}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      // Check if response is JSON (error) or PDF
      if (response.headers["content-type"]?.includes("application/json")) {
        toast.warning(
          "PDF generation feature is not yet implemented. This feature will be added in a future update."
        );
        return;
      }

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      if (error.response?.status === 501) {
        toast.warning(
          "PDF generation feature is not yet implemented. This feature will be added in a future update."
        );
      } else {
        toast.error(error.response?.data?.message || "Failed to download PDF");
      }
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: "secondary", text: "Draft" },
      sent: { bg: "info", text: "Sent" },
      paid: { bg: "success", text: "Paid" },
      overdue: { bg: "danger", text: "Overdue" },
      cancelled: { bg: "secondary", text: "Cancelled" },
    };

    const config = statusConfig[status?.toLowerCase()] || {
      bg: "secondary",
      text: status || "Unknown",
    };

    return <Badge bg={config.bg}>{config.text}</Badge>;
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
          <h2>My Invoices</h2>
          <p className="text-muted">View and download your invoices</p>
        </Col>
      </Row>

      {invoices.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading className="h6">
            <FaFileInvoice className="me-2" />
            No Invoices
          </Alert.Heading>
          <p className="mb-0">
            You don't have any invoices yet. Invoices will appear here once generated.
          </p>
        </Alert>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Invoice #</th>
                    <th>Subscription</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice._id}>
                      <td>
                        <strong>{invoice.invoiceNumber}</strong>
                      </td>
                      <td>{invoice.subscription?.subscriptionNumber || "N/A"}</td>
                      <td>{formatDate(invoice.issueDate)}</td>
                      <td>{formatDate(invoice.dueDate)}</td>
                      <td>
                        <strong className="text-success">
                          {formatCurrency(invoice.totalAmount)}
                        </strong>
                      </td>
                      <td>{getStatusBadge(invoice.status)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleDownloadPDF(invoice)}
                            title="Download PDF"
                          >
                            <FaDownload />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default ClientInvoices;
