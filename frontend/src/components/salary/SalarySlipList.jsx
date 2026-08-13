import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Table,
  Button,
  Form,
  Badge,
  Spinner,
  Alert,
  Modal,
  Dropdown,
} from "react-bootstrap";
import {
  FaEye,
  FaDownload,
  FaEnvelope,
  FaEdit,
  FaTrash,
  FaFilter,
  FaSearch,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { salarySlipApi } from "../../api/salaryApi";
import { payrollPeriodApi } from "../../api/payrollPeriodApi";

const SalarySlipList = () => {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Default to previous month — current month's slips are typically not generated yet
  const getPrevMonth = () => {
    const now = new Date();
    const m = now.getMonth(); // 0-indexed = previous month as 1-indexed
    return { month: m === 0 ? 12 : m, year: m === 0 ? now.getFullYear() - 1 : now.getFullYear() };
  };
  const prev = getPrevMonth();
  
  const [filters, setFilters] = useState({
    month: prev.month,
    year: prev.year,
    status: "",
    employee: "",
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 20,
  });
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [gate, setGate] = useState(null);

  useEffect(() => {
    fetchSalarySlips();
  }, [filters, pagination.current]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!filters.month || !filters.year) {
        setGate(null);
        return;
      }
      try {
        const res = await payrollPeriodApi.gatesStatus({
          month: filters.month,
          year: filters.year,
        });
        if (!cancelled) setGate(res.data?.data || null);
      } catch {
        if (!cancelled) setGate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.month, filters.year]);

  const markPaidBlocked = Boolean(gate?.enabled && !gate?.allowed?.markPaid);

  const fetchSalarySlips = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.current,
        limit: pagination.limit,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === null) {
          delete params[key];
        }
      });

      const response = await salarySlipApi.getAll(params);
      setSlips(response.data.slips || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching salary slips:", error);
      toast.error("Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleSendEmail = async (slipId) => {
    try {
      setActionLoading(slipId);
      await salarySlipApi.sendEmail(slipId);
      toast.success("Email sent successfully");
      fetchSalarySlips();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async (slipId) => {
    try {
      setActionLoading(slipId);
      await salarySlipApi.markAsPaid(slipId);
      toast.success("Marked as paid successfully");
      fetchSalarySlips();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error(
        error.response?.data?.message || "Failed to mark as paid"
      );
    } finally {
      setActionLoading(null);
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
      minimumFractionDigits: 0,
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

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }

  return (
    <>
      {/* Filters */}
      <Row className="mb-3">
        <Col md={2}>
          <Form.Select
            value={filters.month}
            onChange={(e) => handleFilterChange("month", parseInt(e.target.value))}
          >
            <option value="">All Months</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={filters.year}
            onChange={(e) => handleFilterChange("year", parseInt(e.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="generated">Generated</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="downloaded">Downloaded</option>
            <option value="paid">Paid</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Control
            type="text"
            placeholder="Search employee..."
            value={filters.employee}
            onChange={(e) => handleFilterChange("employee", e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Button variant="outline-secondary" onClick={fetchSalarySlips}>
            <FaSearch className="me-1" />
            Search
          </Button>
        </Col>
      </Row>

      {markPaidBlocked && (
        <Alert variant="warning" className="py-2">
          Period gates are on
          {gate?.status ? ` (status: ${gate.status})` : " (period not opened)"}
          . Mark as paid requires a <strong>locked</strong> pay period.
        </Alert>
      )}

      {/* Results Info */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <small className="text-muted">
          Showing {slips.length} of {pagination.total} salary slips
        </small>
        {pagination.pages > 1 && (
          <div className="d-flex gap-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === pagination.current ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, current: page }))}
              >
                {page}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <div className="mt-2">Loading salary slips...</div>
        </div>
      ) : slips.length === 0 ? (
        <Alert variant="info">No salary slips found for the selected criteria.</Alert>
      ) : (
        <Table responsive striped hover>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Period</th>
              <th>Gross Salary</th>
              <th>Net Salary</th>
              <th>Status</th>
              <th>Payment Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slips.map((slip) => (
              <tr key={slip._id}>
                <td>
                  <div>
                    <strong>{slip.employee.name}</strong>
                    <br />
                    <small className="text-muted">{slip.employee.employeeId}</small>
                  </div>
                </td>
                <td>{slip.payPeriod}</td>
                <td>{formatCurrency(slip.totalEarnings)}</td>
                <td>
                  <strong className="text-success">
                    {formatCurrency(slip.netSalary)}
                  </strong>
                </td>
                <td>{getStatusBadge(slip.status)}</td>
                <td>
                  {new Date(slip.paymentDate).toLocaleDateString("en-IN")}
                </td>
                <td>
                  <Dropdown align="end">
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      Actions
                    </Dropdown.Toggle>
                    <Dropdown.Menu style={{ zIndex: 2000 }}>
                      <Dropdown.Item onClick={() => handleViewDetails(slip)}>
                        <FaEye className="me-1" />
                        View Details
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={() => handleSendEmail(slip._id)}
                        disabled={actionLoading === slip._id}
                      >
                        <FaEnvelope className="me-1" />
                        Send Email
                      </Dropdown.Item>
                      {slip.status !== "paid" && (
                        <Dropdown.Item
                          onClick={() => handleMarkAsPaid(slip._id)}
                          disabled={
                            actionLoading === slip._id || markPaidBlocked
                          }
                          title={
                            markPaidBlocked
                              ? "Period must be locked to mark slips paid"
                              : undefined
                          }
                        >
                          Mark as Paid
                          {markPaidBlocked ? " (period not locked)" : ""}
                        </Dropdown.Item>
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Detail Modal */}
      {selectedSlip && (
        <Modal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Salary Slip Details - {selectedSlip.payPeriod}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <h6>Employee Information</h6>
                <p className="mb-1">
                  <strong>Name:</strong> {selectedSlip.employee.name}
                </p>
                <p className="mb-1">
                  <strong>ID:</strong> {selectedSlip.employee.employeeId}
                </p>
                <p className="mb-3">
                  <strong>Designation:</strong> {selectedSlip.employee.designation}
                </p>
              </Col>
              <Col md={6}>
                <h6>Payment Information</h6>
                <p className="mb-1">
                  <strong>Status:</strong> {getStatusBadge(selectedSlip.status)}
                </p>
                <p className="mb-1">
                  <strong>Payment Date:</strong>{" "}
                  {new Date(selectedSlip.paymentDate).toLocaleDateString("en-IN")}
                </p>
                <p className="mb-3">
                  <strong>Downloads:</strong> {selectedSlip.downloadCount || 0}
                </p>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <h6>Earnings</h6>
                <p className="mb-1">Basic: {formatCurrency(selectedSlip.earnings.basicSalary)}</p>
                <p className="mb-1">HRA: {formatCurrency(selectedSlip.earnings.hra)}</p>
                <p className="mb-1">Allowances: {formatCurrency(selectedSlip.earnings.specialAllowance)}</p>
                <p className="mb-1">
                  <strong>Total: {formatCurrency(selectedSlip.totalEarnings)}</strong>
                </p>
              </Col>
              <Col md={6}>
                <h6>Deductions</h6>
                <p className="mb-1">PF: {formatCurrency(selectedSlip.deductions.providentFund)}</p>
                <p className="mb-1">
                  PT:{" "}
                  {formatCurrency(
                    (selectedSlip.deductions.professionalTax || 0) > 0
                      ? selectedSlip.deductions.professionalTax
                      : selectedSlip.deductions.tds || 0
                  )}
                </p>
                {(selectedSlip.deductions.professionalTax || 0) > 0 &&
                  (selectedSlip.deductions.tds || 0) > 0 && (
                  <p className="mb-1">
                    TDS: {formatCurrency(selectedSlip.deductions.tds)}
                  </p>
                )}
                <p className="mb-1">
                  <strong>Total: {formatCurrency(selectedSlip.totalDeductions)}</strong>
                </p>
              </Col>
            </Row>

            <Row className="mt-3">
              <Col>
                <div className="bg-success text-white p-3 rounded text-center">
                  <h4 className="mb-0">
                    Net Salary: {formatCurrency(selectedSlip.netSalary)}
                  </h4>
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSendEmail(selectedSlip._id)}
              disabled={actionLoading === selectedSlip._id}
            >
              <FaEnvelope className="me-1" />
              Send Email
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default SalarySlipList;