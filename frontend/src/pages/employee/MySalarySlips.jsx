import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Alert,
  Form,
} from "react-bootstrap";
import {
  FaFileInvoiceDollar,
  FaDownload,
  FaEye,
  FaCalendarAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { salarySlipApi } from "../../api/salaryApi";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/shared/PageHeader";
import MobileFilterSheet from "../../components/shared/MobileFilterSheet";
import MobileModal from "../../components/shared/MobileModal";
import ResponsiveChartGrid from "../../components/shared/ResponsiveChartGrid";

const MySalarySlips = () => {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchSalarySlips();
  }, [selectedYear]);

  const fetchSalarySlips = async () => {
    try {
      setLoading(true);
      const response = await salarySlipApi.getMySlips({ year: selectedYear });
      setSlips(response.data || []);
    } catch (error) {
      console.error("Error fetching salary slips:", error);
      toast.error("Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (slip) => {
    try {
      setDownloading(slip._id);
      const response = await salarySlipApi.downloadPDF(slip._id);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `salary-slip-${slip.month}-${slip.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Track download
      await salarySlipApi.trackDownload(slip._id);
      
      toast.success("Salary slip downloaded successfully");
      fetchSalarySlips(); // Refresh to update download count
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download salary slip");
    } finally {
      setDownloading(null);
    }
  };

  const handleViewDetails = (slip) => {
    setSelectedSlip(slip);
    setShowDetailModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: "secondary", text: "Draft" },
      generated: { bg: "info", text: "Generated" },
      sent: { bg: "primary", text: "Sent" },
      viewed: { bg: "success", text: "Viewed" },
      downloaded: { bg: "success", text: "Downloaded" },
      paid: { bg: "success", text: "Paid" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div className="mt-2">Loading salary slips...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <PageHeader
        title={
          <>
            <FaFileInvoiceDollar className="me-2" />
            My Salary Slips
          </>
        }
        subtitle="View and download your salary slips"
      />

      <MobileFilterSheet title="Filter by Year" showApply={false}>
        <Form.Group>
          <Form.Label>Year</Form.Label>
          <Form.Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </MobileFilterSheet>

      {/* Salary Slips List */}
      {slips.length === 0 ? (
        <Alert variant="info">
          <FaFileInvoiceDollar className="me-2" />
          No salary slips found for {selectedYear}
        </Alert>
      ) : (
        <ResponsiveChartGrid>
          {slips.map((slip) => (
            <Card key={slip._id} className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="mb-1">{slip.payPeriod}</h5>
                      <small className="text-muted">
                        <FaCalendarAlt className="me-1" />
                        {new Date(slip.paymentDate).toLocaleDateString("en-IN")}
                      </small>
                    </div>
                    {getStatusBadge(slip.status)}
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Gross Salary:</span>
                      <strong>{formatCurrency(slip.totalEarnings)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Deductions:</span>
                      <strong className="text-danger">
                        -{formatCurrency(slip.totalDeductions)}
                      </strong>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <span className="fw-bold">Net Salary:</span>
                      <strong className="text-success fs-5">
                        {formatCurrency(slip.netSalary)}
                      </strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">
                      Days Worked: {slip.daysWorked}/{slip.totalWorkingDays}
                    </small>
                    {slip.downloadCount > 0 && (
                      <small className="text-muted d-block">
                        Downloaded {slip.downloadCount} time(s)
                      </small>
                    )}
                  </div>

                  <div className="d-grid gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewDetails(slip)}
                    >
                      <FaEye className="me-1" />
                      View Details
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleDownloadPDF(slip)}
                      disabled={downloading === slip._id}
                    >
                      {downloading === slip._id ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            className="me-1"
                          />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <FaDownload className="me-1" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
          ))}
        </ResponsiveChartGrid>
      )}

      {selectedSlip && (
        <MobileModal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          title={`Salary Slip - ${selectedSlip.payPeriod}`}
          footer={
            <>
              <Button
                variant="secondary"
                className="touch-target"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </Button>
              <Button
                variant="success"
                className="touch-target"
                onClick={() => handleDownloadPDF(selectedSlip)}
                disabled={downloading === selectedSlip._id}
              >
                {downloading === selectedSlip._id ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-1" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FaDownload className="me-1" />
                    Download PDF
                  </>
                )}
              </Button>
            </>
          }
        >
            {/* Employee Info */}
            <Card className="mb-3">
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <p className="mb-1">
                      <strong>Employee:</strong> {selectedSlip.employee.name}
                    </p>
                    <p className="mb-1">
                      <strong>Employee ID:</strong>{" "}
                      {selectedSlip.employee.employeeId}
                    </p>
                    <p className="mb-0">
                      <strong>Designation:</strong>{" "}
                      {selectedSlip.employee.designation}
                    </p>
                  </Col>
                  <Col md={6}>
                    <p className="mb-1">
                      <strong>Payment Date:</strong>{" "}
                      {new Date(selectedSlip.paymentDate).toLocaleDateString(
                        "en-IN"
                      )}
                    </p>
                    <p className="mb-0">
                      <strong>Status:</strong>{" "}
                      {getStatusBadge(selectedSlip.status)}
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Earnings */}
            <Card className="mb-3">
              <Card.Header className="bg-success text-white">
                <strong>Earnings</strong>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-2">
                  <span>Basic Salary</span>
                  <strong>
                    {formatCurrency(selectedSlip.earnings.basicSalary)}
                  </strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>HRA</span>
                  <strong>{formatCurrency(selectedSlip.earnings.hra)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Special Allowance</span>
                  <strong>
                    {formatCurrency(selectedSlip.earnings.specialAllowance)}
                  </strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Transport Allowance</span>
                  <strong>
                    {formatCurrency(selectedSlip.earnings.transportAllowance)}
                  </strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Medical Allowance</span>
                  <strong>
                    {formatCurrency(selectedSlip.earnings.medicalAllowance)}
                  </strong>
                </div>
                {selectedSlip.earnings.bonus > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>Bonus</span>
                    <strong>
                      {formatCurrency(selectedSlip.earnings.bonus)}
                    </strong>
                  </div>
                )}
                <hr />
                <div className="d-flex justify-content-between">
                  <strong>Total Earnings</strong>
                  <strong className="text-success">
                    {formatCurrency(selectedSlip.totalEarnings)}
                  </strong>
                </div>
              </Card.Body>
            </Card>

            {/* Deductions */}
            <Card className="mb-3">
              <Card.Header className="bg-danger text-white">
                <strong>Deductions</strong>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-2">
                  <span>Provident Fund (PF)</span>
                  <strong>
                    {formatCurrency(selectedSlip.deductions.providentFund)}
                  </strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Professional Tax (PT)</span>
                  <strong>
                    {formatCurrency(selectedSlip.deductions.professionalTax)}
                  </strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>TDS</span>
                  <strong>
                    {formatCurrency(selectedSlip.deductions.tds)}
                  </strong>
                </div>
                {selectedSlip.deductions.lossOfPay > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>Loss of Pay</span>
                    <strong>
                      {formatCurrency(selectedSlip.deductions.lossOfPay)}
                    </strong>
                  </div>
                )}
                <hr />
                <div className="d-flex justify-content-between">
                  <strong>Total Deductions</strong>
                  <strong className="text-danger">
                    {formatCurrency(selectedSlip.totalDeductions)}
                  </strong>
                </div>
              </Card.Body>
            </Card>

            {/* Net Salary */}
            <Card className="mb-3 bg-primary text-white">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="mb-0">Net Salary</h4>
                  <h3 className="mb-0">
                    {formatCurrency(selectedSlip.netSalary)}
                  </h3>
                </div>
              </Card.Body>
            </Card>

            {/* Attendance */}
            <Card>
              <Card.Header>
                <strong>Attendance Summary</strong>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col xs={6} md={3}>
                    <p className="mb-1 text-muted small">Working Days</p>
                    <p className="mb-0 fw-bold">
                      {selectedSlip.totalWorkingDays}
                    </p>
                  </Col>
                  <Col xs={6} md={3}>
                    <p className="mb-1 text-muted small">Days Worked</p>
                    <p className="mb-0 fw-bold">{selectedSlip.daysWorked}</p>
                  </Col>
                  <Col xs={6} md={3}>
                    <p className="mb-1 text-muted small">Paid Leaves</p>
                    <p className="mb-0 fw-bold">{selectedSlip.paidLeaves}</p>
                  </Col>
                  <Col xs={6} md={3}>
                    <p className="mb-1 text-muted small">Unpaid Leaves</p>
                    <p className="mb-0 fw-bold text-danger">
                      {selectedSlip.unpaidLeaves}
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
        </MobileModal>
      )}
    </Container>
  );
};

export default MySalarySlips;
