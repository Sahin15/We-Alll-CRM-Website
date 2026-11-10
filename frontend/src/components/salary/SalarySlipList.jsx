import { useState, useEffect, useMemo } from "react";
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
  Nav,
} from "react-bootstrap";
import { PayrollPageHeader, PayrollDropdownMenu } from "../payroll-ui";
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
import { getCompanyYearOptions } from "../../constants/branding";
import { formatSlipPaymentDateDisplay } from "../../utils/slipPaymentDateDisplay.js";
import { usePayrollPeriodWithFallback } from "../../context/PayrollPeriodContext.jsx";
import SalaryPaymentDateCard from "./SalaryPaymentDateCard";
import CreditSalaryModal from "./CreditSalaryModal";
import { useSalaryCreditRoster } from "../../hooks/useSalaryCreditRoster";
import { creditSalaryApi } from "../../api/payrollSimpleApi";

/** One page per filter — typical payroll month fits well under this cap. */
const SALARY_SLIPS_LIST_LIMIT = 500;

/**
 * @param {{ hubV2?: boolean, onHealthRefresh?: () => void }} props
 */
const SalarySlipList = ({ hubV2 = false, onHealthRefresh }) => {
  const [viewTab, setViewTab] = useState("issued");
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Default to previous month — current month's slips are typically not generated yet
  const getPrevMonth = () => {
    const now = new Date();
    const m = now.getMonth(); // 0-indexed = previous month as 1-indexed
    return { month: m === 0 ? 12 : m, year: m === 0 ? now.getFullYear() - 1 : now.getFullYear() };
  };
  const prev = getPrevMonth();
  const { month: periodMonth, year: periodYear, setMonth, setYear } =
    usePayrollPeriodWithFallback(prev);
  
  const [filters, setFilters] = useState({
    month: periodMonth,
    year: periodYear,
    status: "",
    employee: "",
  });

  useEffect(() => {
    setFilters((f) =>
      f.month === periodMonth && f.year === periodYear
        ? f
        : { ...f, month: periodMonth, year: periodYear }
    );
  }, [periodMonth, periodYear]);
  const [totalSlips, setTotalSlips] = useState(0);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [gate, setGate] = useState(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [slipPaymentDate, setSlipPaymentDate] = useState(null);
  const [missingSlipSelection, setMissingSlipSelection] = useState(
    () => new Set()
  );
  const { paymentDate, rosterRows, refresh: refreshRoster } =
    useSalaryCreditRoster(filters.month, filters.year);

  const missingSlipRows = useMemo(
    () =>
      (rosterRows || []).filter(
        (row) => row.hasStructure && row.employee?._id && !row.hasSlip
      ),
    [rosterRows]
  );

  useEffect(() => {
    setMissingSlipSelection(new Set());
  }, [filters.month, filters.year, rosterRows]);

  useEffect(() => {
    fetchSalarySlips();
  }, [filters.month, filters.year, filters.status, filters.employee]);

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

  const effectivePaymentDate = slipPaymentDate || paymentDate;

  const toggleMissingSlip = (employeeId, checked) => {
    const id = String(employeeId);
    setMissingSlipSelection((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllMissingSlips = (checked) => {
    if (!checked) {
      setMissingSlipSelection(new Set());
      return;
    }
    setMissingSlipSelection(
      new Set(missingSlipRows.map((r) => String(r.employee._id)))
    );
  };

  const handleCreateSinglePayslip = async (employeeId) => {
    if (!effectivePaymentDate) {
      toast.error("Set salary payment date first");
      return;
    }
    try {
      setActionLoading(`credit-${employeeId}`);
      const res = await creditSalaryApi.credit({
        month: filters.month,
        year: filters.year,
        employeeIds: [employeeId],
        paymentDate:
          typeof effectivePaymentDate === "string"
            ? effectivePaymentDate
            : new Date(effectivePaymentDate).toISOString(),
      });
      const summary = res.data?.data?.summary;
      const ok = summary?.success ?? 0;
      toast.success(
        ok > 0 ? "Payslip created" : res.data?.message || "Credit completed"
      );
      await fetchSalarySlips();
      refreshRoster();
      onHealthRefresh?.();
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to create payslip"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const fetchSalarySlips = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: 1,
        limit: SALARY_SLIPS_LIST_LIMIT,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === null) {
          delete params[key];
        }
      });

      const response = await salarySlipApi.getAll(params);
      setSlips(response.data.slips || []);
      setTotalSlips(response.data.pagination?.total ?? 0);
    } catch (error) {
      console.error("Error fetching salary slips:", error);
      toast.error("Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (field === "month" && setMonth) setMonth(value);
    if (field === "year" && setYear) setYear(value);
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

  const years = getCompanyYearOptions();

  const displaySlips = useMemo(() => {
    if (viewTab === "unpaid") {
      return slips.filter((s) => s.status !== "paid");
    }
    return slips;
  }, [slips, viewTab]);

  return (
    <>
      {hubV2 && (
        <>
          <PayrollPageHeader
            title="Payslips"
            description="Official slips for the selected pay period. Create missing slips or mark paid after bank transfer."
          />
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link
                active={viewTab === "issued"}
                onClick={() => setViewTab("issued")}
                style={{ cursor: "pointer" }}
              >
                Issued
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={viewTab === "missing"}
                onClick={() => setViewTab("missing")}
                style={{ cursor: "pointer" }}
              >
                Missing ({missingSlipRows.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={viewTab === "unpaid"}
                onClick={() => setViewTab("unpaid")}
                style={{ cursor: "pointer" }}
              >
                Unpaid
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </>
      )}
      {/* Filters */}
      {!hubV2 && (
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
      )}

      {(!hubV2 || viewTab === "missing" || viewTab === "issued") && (
      <Row className="mb-3 align-items-center">
        <Col md={8}>
          <SalaryPaymentDateCard
            compact
            month={filters.month}
            year={filters.year}
            onDateChange={setSlipPaymentDate}
          />
        </Col>
        <Col md={4} className="text-md-end d-flex flex-wrap gap-2 justify-content-md-end">
          <Button
            variant="success"
            size="sm"
            disabled={!effectivePaymentDate}
            onClick={() => setShowCreditModal(true)}
          >
            Credit salary / create slips
          </Button>
          {missingSlipSelection.size > 0 && (
            <Button
              variant="outline-success"
              size="sm"
              disabled={!effectivePaymentDate}
              onClick={() => setShowCreditModal(true)}
            >
              Credit selected ({missingSlipSelection.size})
            </Button>
          )}
        </Col>
      </Row>
      )}

      <CreditSalaryModal
        show={showCreditModal}
        onHide={() => setShowCreditModal(false)}
        month={filters.month}
        year={filters.year}
        paymentDate={effectivePaymentDate}
        periodLabel={`${filters.month}/${filters.year}`}
        requirePreviewOnly={false}
        rosterRows={
          missingSlipSelection.size > 0
            ? rosterRows.filter((r) =>
                missingSlipSelection.has(String(r.employee?._id))
              )
            : rosterRows
        }
        onSuccess={() => {
          fetchSalarySlips();
          refreshRoster();
          setShowCreditModal(false);
          setMissingSlipSelection(new Set());
          onHealthRefresh?.();
        }}
      />

      {filters.month &&
        filters.year &&
        missingSlipRows.length > 0 &&
        (!hubV2 || viewTab === "missing") && (
        <div className="mb-4">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <h6 className="mb-0">Employees without payslip this period</h6>
            <Badge bg="secondary">{missingSlipRows.length}</Badge>
          </div>
          <Table responsive size="sm" bordered className="bg-white">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <Form.Check
                    type="checkbox"
                    aria-label="Select all without payslip"
                    checked={
                      missingSlipRows.length > 0 &&
                      missingSlipSelection.size === missingSlipRows.length
                    }
                    onChange={(e) => toggleAllMissingSlips(e.target.checked)}
                  />
                </th>
                <th>Employee</th>
                <th>Net (est.)</th>
                <th>Preview</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {missingSlipRows.map((row) => {
                const eid = String(row.employee._id);
                return (
                  <tr key={eid}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={missingSlipSelection.has(eid)}
                        onChange={(ev) =>
                          toggleMissingSlip(eid, ev.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <strong>{row.employee.name}</strong>
                      <br />
                      <small className="text-muted">
                        {row.employee.employeeId}
                      </small>
                    </td>
                    <td>{formatCurrency(row.netSalary || 0)}</td>
                    <td>
                      {row.hasPreview ? (
                        <Badge bg="info">Preview</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">
                          No preview
                        </Badge>
                      )}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-success"
                        disabled={
                          !effectivePaymentDate ||
                          actionLoading === `credit-${eid}`
                        }
                        onClick={() => handleCreateSinglePayslip(eid)}
                      >
                        {actionLoading === `credit-${eid}` ? (
                          <Spinner size="sm" animation="border" />
                        ) : (
                          "Create payslip"
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {(!hubV2 || viewTab !== "missing") && (
        <>
      {markPaidBlocked && (
        <Alert variant="warning" className="py-2">
          Period gates are on
          {gate?.status ? ` (status: ${gate.status})` : " (period not opened)"}
          . Mark as paid requires a <strong>locked</strong> pay period (
          <strong>Finance desk</strong> or Legacy → Pay periods).
        </Alert>
      )}

      <div className="mb-3">
        <small className="text-muted">
          {displaySlips.length > 0
            ? `Showing ${displaySlips.length} salary slip${displaySlips.length === 1 ? "" : "s"}`
            : "No salary slips"}
          {viewTab === "unpaid" && hubV2 ? " (not marked paid)" : ""}
          {!hubV2 && totalSlips > displaySlips.length
            ? ` (${totalSlips} total — narrow month/year or use Search)`
            : ""}
        </small>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <div className="mt-2">Loading salary slips...</div>
        </div>
      ) : displaySlips.length === 0 ? (
        <Alert variant="info">No salary slips found for the selected criteria.</Alert>
      ) : (
        <div className="payroll-preview-table-wrap payroll-payslip-table-wrap">
        <Table striped hover className="mb-0">
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
            {displaySlips.map((slip) => (
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
                  {formatSlipPaymentDateDisplay(slip.paymentDate)}
                </td>
                <td>
                  <Dropdown align="end">
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      Actions
                    </Dropdown.Toggle>
                    <PayrollDropdownMenu>
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
                    </PayrollDropdownMenu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        </div>
      )}
        </>
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
                  {formatSlipPaymentDateDisplay(selectedSlip.paymentDate)}
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