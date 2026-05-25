import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Button,
  Form,
  Badge,
  Spinner,
  Alert,
  Dropdown,
} from "react-bootstrap";
import {
  FaEye,
  FaDownload,
  FaEnvelope,
  FaEdit,
  FaTrash,
  FaSearch,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { salarySlipApi } from "../../api/salaryApi";
import MobileFilterSheet from "../shared/MobileFilterSheet";
import ResponsiveDataTable from "../shared/ResponsiveDataTable";
import MobileModal from "../shared/MobileModal";
import FormFieldStack from "../shared/FormFieldStack";

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

  useEffect(() => {
    fetchSalarySlips();
  }, [filters, pagination.current]);

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
      toast.error("Failed to mark as paid");
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

  const activeFilterCount = [
    filters.status,
    filters.employee,
  ].filter(Boolean).length;

  const slipColumns = [
    {
      key: "employee",
      label: "Employee",
      mobilePriority: 1,
      render: (_, row) => (
        <div>
          <strong>{row.employee.name}</strong>
          <br />
          <small className="text-muted">{row.employee.employeeId}</small>
        </div>
      ),
    },
    { key: "payPeriod", label: "Period", mobilePriority: 2 },
    {
      key: "totalEarnings",
      label: "Gross Salary",
      hideOnMobile: true,
      render: (_, row) => formatCurrency(row.totalEarnings),
    },
    {
      key: "netSalary",
      label: "Net Salary",
      mobilePriority: 3,
      render: (_, row) => (
        <strong className="text-success">{formatCurrency(row.netSalary)}</strong>
      ),
    },
    {
      key: "status",
      label: "Status",
      mobilePriority: 4,
      render: (_, row) => getStatusBadge(row.status),
    },
    {
      key: "paymentDate",
      label: "Payment Date",
      hideOnMobile: true,
      render: (_, row) => new Date(row.paymentDate).toLocaleDateString("en-IN"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" size="sm" className="touch-target">
            Actions
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => handleViewDetails(row)}>
              <FaEye className="me-1" />
              View Details
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => handleSendEmail(row._id)}
              disabled={actionLoading === row._id}
            >
              <FaEnvelope className="me-1" />
              Send Email
            </Dropdown.Item>
            {row.status !== "paid" && (
              <Dropdown.Item
                onClick={() => handleMarkAsPaid(row._id)}
                disabled={actionLoading === row._id}
              >
                Mark as Paid
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown>
      ),
    },
  ];

  return (
    <>
      <MobileFilterSheet
        title="Salary Slip Filters"
        activeFilterCount={activeFilterCount}
        onClear={() =>
          setFilters({ month: prev.month, year: prev.year, status: "", employee: "" })
        }
        onApply={fetchSalarySlips}
      >
        <FormFieldStack md={6}>
          <Form.Group>
            <Form.Label>Month</Form.Label>
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
          </Form.Group>
          <Form.Group>
            <Form.Label>Year</Form.Label>
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
          </Form.Group>
          <Form.Group>
            <Form.Label>Status</Form.Label>
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
          </Form.Group>
          <Form.Group>
            <Form.Label>Employee</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search employee..."
              value={filters.employee}
              onChange={(e) => handleFilterChange("employee", e.target.value)}
            />
          </Form.Group>
        </FormFieldStack>
      </MobileFilterSheet>

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

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <div className="mt-2">Loading salary slips...</div>
        </div>
      ) : slips.length === 0 ? (
        <Alert variant="info">No salary slips found for the selected criteria.</Alert>
      ) : (
        <ResponsiveDataTable
          columns={slipColumns}
          data={slips}
          loading={false}
          emptyMessage="No salary slips found for the selected criteria."
          paginated={false}
          keyField="_id"
        />
      )}

      {selectedSlip && (
        <MobileModal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          title={`Salary Slip Details - ${selectedSlip.payPeriod}`}
          footer={
            <>
              <Button variant="secondary" className="touch-target" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                className="touch-target"
                onClick={() => handleSendEmail(selectedSlip._id)}
                disabled={actionLoading === selectedSlip._id}
              >
                <FaEnvelope className="me-1" />
                Send Email
              </Button>
            </>
          }
        >
          <FormFieldStack md={6}>
            <div>
              <h6>Employee Information</h6>
              <p className="mb-1">
                <strong>Name:</strong> {selectedSlip.employee.name}
              </p>
              <p className="mb-1">
                <strong>ID:</strong> {selectedSlip.employee.employeeId}
              </p>
              <p className="mb-0">
                <strong>Designation:</strong> {selectedSlip.employee.designation}
              </p>
            </div>
            <div>
              <h6>Payment Information</h6>
              <p className="mb-1">
                <strong>Status:</strong> {getStatusBadge(selectedSlip.status)}
              </p>
              <p className="mb-1">
                <strong>Payment Date:</strong>{" "}
                {new Date(selectedSlip.paymentDate).toLocaleDateString("en-IN")}
              </p>
              <p className="mb-0">
                <strong>Downloads:</strong> {selectedSlip.downloadCount || 0}
              </p>
            </div>
            <div>
              <h6>Earnings</h6>
              <p className="mb-1">Basic: {formatCurrency(selectedSlip.earnings.basicSalary)}</p>
              <p className="mb-1">HRA: {formatCurrency(selectedSlip.earnings.hra)}</p>
              <p className="mb-1">Allowances: {formatCurrency(selectedSlip.earnings.specialAllowance)}</p>
              <p className="mb-0">
                <strong>Total: {formatCurrency(selectedSlip.totalEarnings)}</strong>
              </p>
            </div>
            <div>
              <h6>Deductions</h6>
              <p className="mb-1">PF: {formatCurrency(selectedSlip.deductions.providentFund)}</p>
              <p className="mb-1">TDS: {formatCurrency(selectedSlip.deductions.tds)}</p>
              <p className="mb-1">PT: {formatCurrency(selectedSlip.deductions.professionalTax)}</p>
              <p className="mb-0">
                <strong>Total: {formatCurrency(selectedSlip.totalDeductions)}</strong>
              </p>
            </div>
          </FormFieldStack>

          <div className="bg-success text-white p-3 rounded text-center mt-3">
            <h4 className="mb-0">
              Net Salary: {formatCurrency(selectedSlip.netSalary)}
            </h4>
          </div>
        </MobileModal>
      )}
    </>
  );
};

export default SalarySlipList;