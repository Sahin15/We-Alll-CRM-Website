import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import {
  FaCheck,
  FaPlus,
  FaRedo,
  FaBan,
} from "react-icons/fa";
import api from "../../services/api";
import { salaryStructureApi, salaryPreviewApi } from "../../api/salaryApi";
import {
  ADJUSTMENT_TYPE_OPTIONS,
  payrollAdjustmentApi,
  payrollSimplePreviewApi,
} from "../../api/payrollSimpleApi";
import { attendanceApi } from "../../api/attendanceApi";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatInr = (amount) => {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const statusBadge = (status) => {
  const map = {
    draft: "secondary",
    approved: "success",
    rejected: "danger",
    void: "dark",
    active: "success",
  };
  return <Badge bg={map[status] || "secondary"}>{status}</Badge>;
};

/**
 * HR Simple Payroll tab (SP-05): structure + preview + adjustments for one employee/month.
 */
const SimplePayrollTab = () => {
  const prev = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    return {
      month: m === 0 ? 12 : m,
      year: m === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    };
  }, []);

  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(prev.month);
  const [year, setYear] = useState(prev.year);

  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
  const [adjLoading, setAdjLoading] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [showCreateStructure, setShowCreateStructure] = useState(false);
  const [structureForm, setStructureForm] = useState({
    monthlySalary: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    tdsEnabled: false,
    tds: "",
    notes: "",
    status: "active",
  });

  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjForm, setAdjForm] = useState({
    type: "bonus",
    amount: "",
    direction: "",
    reason: "",
    remarks: "",
    amountMode: "fixed",
    days: "1",
  });

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");

  const [showPreviewGenModal, setShowPreviewGenModal] = useState(false);
  const [previewGenMeta, setPreviewGenMeta] = useState(null);
  const [previewGenOverride, setPreviewGenOverride] = useState({
    totalDays: 0,
    workingDays: 0,
    holidays: 0,
    weekends: 0,
  });
  const [previewGenBusy, setPreviewGenBusy] = useState(false);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees.slice(0, 80);
    return employees
      .filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.employeeId?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [employees, search]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await api.get("/users/employees");
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load employees");
    }
  }, []);

  const loadStructure = useCallback(async () => {
    if (!employeeId) {
      setStructure(null);
      return;
    }
    setStructureLoading(true);
    try {
      const res = await salaryStructureApi.getActiveStructure(employeeId);
      setStructure(res.data || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setStructure(null);
      } else {
        console.error(err);
        toast.error("Failed to load salary structure");
        setStructure(null);
      }
    } finally {
      setStructureLoading(false);
    }
  }, [employeeId]);

  const loadPreview = useCallback(async () => {
    if (!employeeId) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await payrollSimplePreviewApi.get({
        employee: employeeId,
        month,
        year,
        // Net must not include auto LOP — HR deducts via adjustments only
        automaticDeductions: 0,
      });
      setPreview(res.data?.data ?? res.data ?? null);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error || "Failed to load simple payroll preview"
      );
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [employeeId, month, year]);

  const loadAttendance = useCallback(async () => {
    if (!employeeId) {
      setAttendanceSummary(null);
      return;
    }
    setAttendanceLoading(true);
    try {
      const res = await attendanceApi.getAttendanceSummary(
        employeeId,
        month,
        year
      );
      setAttendanceSummary(res.data || null);
    } catch (err) {
      console.error(err);
      setAttendanceSummary(null);
    } finally {
      setAttendanceLoading(false);
    }
  }, [employeeId, month, year]);

  const loadAdjustments = useCallback(async () => {
    if (!employeeId) {
      setAdjustments([]);
      return;
    }
    setAdjLoading(true);
    try {
      const res = await payrollAdjustmentApi.list({
        employee: employeeId,
        month,
        year,
      });
      setAdjustments(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load adjustments");
      setAdjustments([]);
    } finally {
      setAdjLoading(false);
    }
  }, [employeeId, month, year]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadStructure(),
      loadPreview(),
      loadAdjustments(),
      loadAttendance(),
    ]);
  }, [loadStructure, loadPreview, loadAdjustments, loadAttendance]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!employeeId) {
      setStructure(null);
      setPreview(null);
      setAdjustments([]);
      setAttendanceSummary(null);
      return;
    }
    refreshAll();
  }, [employeeId, month, year, refreshAll]);

  const monthlyForDayRate = useMemo(() => {
    if (structure?.monthlySalary != null) return Number(structure.monthlySalary);
    if (structure?.basicSalary != null) return Number(structure.basicSalary);
    if (preview?.sections?.monthlySalary?.amount != null) {
      return Number(preview.sections.monthlySalary.amount);
    }
    return 0;
  }, [structure, preview]);

  const perDayRate = useMemo(() => {
    if (preview?.perDaySalary != null) return Number(preview.perDaySalary);
    return Math.round(monthlyForDayRate / 30);
  }, [preview, monthlyForDayRate]);

  const perDayComputedAmount = useMemo(() => {
    const days = Math.max(0, Number(adjForm.days) || 0);
    return Math.round(perDayRate * days);
  }, [adjForm.days, perDayRate]);

  const openSuggestedDeduction = () => {
    const unpaid = preview?.attendanceReport?.unpaidLeaveDays || 0;
    const suggested = preview?.attendanceReport?.suggestedDeduction || 0;
    setAdjForm({
      type: "absent_deduction",
      amount: suggested > 0 ? String(suggested) : "",
      direction: "",
      reason:
        unpaid > 0
          ? `Attendance-based deduction (${unpaid} unpaid day(s))`
          : "Attendance-based deduction",
      remarks: preview?.attendanceReport?.detail || "",
      amountMode: "per_day",
      days: unpaid > 0 ? String(unpaid) : "1",
    });
    setShowAdjModal(true);
  };

  const countWeekends = (m, y, upToDay) => {
    let count = 0;
    for (let d = 1; d <= upToDay; d++) {
      if (new Date(y, m - 1, d).getDay() === 0) count++;
    }
    return count;
  };

  const isSimple = structure?.payrollMode === "simple";

  const openGenerateSalaryPreview = async () => {
    if (!employeeId) {
      toast.error("Select an employee first");
      return;
    }
    if (!isSimple) {
      toast.error("Active structure must be in simple mode");
      return;
    }
    const now = new Date();
    const isCurrentMonth =
      month === now.getMonth() + 1 && year === now.getFullYear();
    const todayDay = now.getDate();
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const monthName = MONTH_NAMES[month - 1];
    const effectiveDays = isCurrentMonth ? todayDay : totalDaysInMonth;

    let workingDays = 0;
    let holidays = 0;
    let weekends = 0;
    try {
      const res = await api.get("/salary-preview/working-days-info", {
        params: { month, year },
      });
      workingDays = res.data.workingDays || 0;
      holidays = res.data.holidays || 0;
      weekends = res.data.weekends || 0;
    } catch {
      weekends = countWeekends(month, year, effectiveDays);
      workingDays = Math.max(0, effectiveDays - weekends);
    }

    setPreviewGenMeta({
      monthName,
      year,
      totalDaysInMonth,
      isCurrentMonth,
      todayDate: now.toLocaleDateString("en-GB"),
      todayDay,
      note: isCurrentMonth
        ? `Preview for ${monthName} ${year} (current month — ${todayDay}/${totalDaysInMonth} days so far). Confirm pay figures below, then generate.`
        : `Preview for ${monthName} ${year}. Confirm pay figures below, then generate for the employee to acknowledge or raise a concern.`,
    });
    setPreviewGenOverride({
      totalDays: effectiveDays,
      workingDays,
      holidays,
      weekends,
    });
    setShowPreviewGenModal(true);
  };

  const confirmGenerateSalaryPreview = async () => {
    setPreviewGenBusy(true);
    try {
      await salaryPreviewApi.generate(
        employeeId,
        month,
        year,
        {},
        previewGenOverride
      );
      toast.success(
        "Salary preview saved from Simple Payroll. Employee can review it under My Salary Preview."
      );
      setShowPreviewGenModal(false);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to generate salary preview";
      toast.error(msg);
    } finally {
      setPreviewGenBusy(false);
    }
  };

  const handleCreateStructure = async (e) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Select an employee first");
      return;
    }
    const monthly = Number(structureForm.monthlySalary);
    if (!(monthly >= 0) || Number.isNaN(monthly)) {
      toast.error("Enter a valid monthly salary");
      return;
    }
    setBusy(true);
    try {
      await salaryStructureApi.create({
        employee: employeeId,
        effectiveFrom: structureForm.effectiveFrom,
        payrollMode: "simple",
        monthlySalary: monthly,
        tdsEnabled: Boolean(structureForm.tdsEnabled),
        tds: structureForm.tdsEnabled ? Number(structureForm.tds) || 0 : 0,
        notes: structureForm.notes || "",
        status: structureForm.status || "active",
        basicSalary: monthly,
        hra: 0,
        specialAllowance: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
        providentFund: 0,
        professionalTax: 0,
        esi: 0,
      });
      toast.success("Simple salary structure created");
      setShowCreateStructure(false);
      setStructureForm({
        monthlySalary: "",
        effectiveFrom: new Date().toISOString().slice(0, 10),
        tdsEnabled: false,
        tds: "",
        notes: "",
        status: "active",
      });
      await refreshAll();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to create structure"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    const amount =
      adjForm.amountMode === "per_day"
        ? perDayComputedAmount
        : Number(adjForm.amount);
    if (!(amount >= 0) || Number.isNaN(amount)) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!adjForm.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setBusy(true);
    try {
      let reason = adjForm.reason.trim();
      if (
        adjForm.amountMode === "per_day" &&
        !/day/i.test(reason)
      ) {
        reason = `${reason} (${adjForm.days} day(s) @ ${formatInr(perDayRate)}/day)`;
      }
      const payload = {
        employee: employeeId,
        month,
        year,
        type: adjForm.type,
        amount,
        reason,
        remarks: adjForm.remarks || "",
      };
      if (adjForm.type === "other" && adjForm.direction) {
        payload.direction = adjForm.direction;
      }
      await payrollAdjustmentApi.create(payload);
      toast.success("Adjustment created as draft");
      setShowAdjModal(false);
      setAdjForm({
        type: "bonus",
        amount: "",
        direction: "",
        reason: "",
        remarks: "",
        amountMode: "fixed",
        days: "1",
      });
      await Promise.all([loadAdjustments(), loadPreview()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create adjustment");
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (id) => {
    setBusy(true);
    try {
      await payrollAdjustmentApi.approve(id);
      toast.success("Adjustment approved");
      await Promise.all([loadAdjustments(), loadPreview()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) {
      toast.error("Void reason is required");
      return;
    }
    setBusy(true);
    try {
      await payrollAdjustmentApi.void(voidTarget._id, {
        reason: voidReason.trim(),
      });
      toast.success("Adjustment voided");
      setVoidTarget(null);
      setVoidReason("");
      await Promise.all([loadAdjustments(), loadPreview()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Void failed");
    } finally {
      setBusy(false);
    }
  };

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2];
  }, []);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h5 className="mb-1">Simple Payroll</h5>
          <p className="text-muted small mb-0">
            Monthly Salary ± manual adjustments − TDS = Net. Attendance is shown
            for review; HR chooses whether to deduct.
          </p>
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          disabled={!employeeId || busy}
          onClick={refreshAll}
        >
          <FaRedo className="me-1" /> Refresh
        </Button>
      </div>

      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={5}>
              <Form.Label>Employee</Form.Label>
              <Form.Control
                className="mb-2"
                placeholder="Search name / ID / email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Form.Select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Select employee…</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name}
                    {emp.employeeId ? ` (${emp.employeeId})` : ""}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>Month</Form.Label>
              <Form.Select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label>Year</Form.Label>
              <Form.Select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <div className="small text-muted">
                Period:{" "}
                <strong>
                  {MONTH_NAMES[month - 1]} {year}
                </strong>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {!employeeId && (
        <Alert variant="light" className="border">
          Select an employee to manage simple salary structure, preview, and
          adjustments.
        </Alert>
      )}

      {employeeId && (
        <>
          {/* Structure */}
          <Card className="mb-3 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <strong>Salary Structure</strong>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowCreateStructure(true)}
              >
                <FaPlus className="me-1" />
                {structure ? "New simple structure" : "Create simple structure"}
              </Button>
            </Card.Header>
            <Card.Body>
              {structureLoading ? (
                <Spinner animation="border" size="sm" />
              ) : !structure ? (
                <Alert variant="warning" className="mb-0">
                  No active salary structure. Create a simple structure
                  (Monthly Salary + TDS) to continue.
                </Alert>
              ) : structure.payrollMode !== "simple" ? (
                <Alert variant="info" className="mb-0">
                  Active structure is <strong>legacy</strong> mode
                  (basic/HRA allowances). Create a new{" "}
                  <strong>simple</strong> structure to use this tab&apos;s
                  preview and generate path, or manage allowances under Salary
                  Structures.
                  <div className="mt-2 small text-muted">
                    Current basic: {formatInr(structure.basicSalary)} · Status:{" "}
                    {statusBadge(structure.status)}
                  </div>
                </Alert>
              ) : (
                <Row>
                  <Col md={3}>
                    <div className="text-muted small">Monthly Salary</div>
                    <div className="fs-5 fw-semibold">
                      {formatInr(
                        structure.monthlySalary ?? structure.basicSalary
                      )}
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-muted small">Effective From</div>
                    <div>
                      {structure.effectiveFrom
                        ? new Date(structure.effectiveFrom).toLocaleDateString(
                            "en-GB"
                          )
                        : "—"}
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="text-muted small">TDS</div>
                    <div>
                      {structure.tdsEnabled
                        ? formatInr(structure.tds)
                        : "Disabled"}
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="text-muted small">Status</div>
                    <div>{statusBadge(structure.status)}</div>
                  </Col>
                  <Col md={2}>
                    <div className="text-muted small">Mode</div>
                    <Badge bg="primary">simple</Badge>
                  </Col>
                  {structure.notes && (
                    <Col xs={12} className="mt-2">
                      <div className="text-muted small">Notes</div>
                      <div>{structure.notes}</div>
                    </Col>
                  )}
                </Row>
              )}
            </Card.Body>
          </Card>

          {/* Preview */}
          <Card className="mb-3 shadow-sm">
            <Card.Header className="bg-white">
              <strong>Month Preview</strong>
              <span className="text-muted small ms-2">
                {MONTH_NAMES[month - 1]} {year}
              </span>
            </Card.Header>
            <Card.Body>
              {previewLoading ? (
                <Spinner animation="border" size="sm" />
              ) : !preview ? (
                <Alert variant="secondary" className="mb-0">
                  Preview unavailable.
                </Alert>
              ) : !preview.applicable ? (
                <Alert variant="warning" className="mb-0">
                  {preview.reason ||
                    "Simple preview not applicable for this employee."}
                </Alert>
              ) : (
                <>
                  {preview.totals?.rejected && (
                    <Alert variant="danger">
                      {preview.totals.rejectReason ||
                        "Net salary would be negative — approve fewer deductions or fix adjustments."}
                    </Alert>
                  )}
                  <Accordion defaultActiveKey={["0", "4"]} alwaysOpen>
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>
                        Monthly Salary —{" "}
                        {formatInr(preview.sections?.monthlySalary?.amount)}
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="small text-muted">
                          {preview.sections?.monthlySalary?.detail ||
                            `Per day (÷${preview.dayDivisor || 30}): ${formatInr(preview.perDaySalary)}`}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="1">
                      <Accordion.Header>
                        Attendance report (review only)
                        {preview.attendanceReport?.suggestedDeduction > 0 && (
                          <Badge bg="warning" text="dark" className="ms-2">
                            Suggested{" "}
                            {formatInr(
                              preview.attendanceReport.suggestedDeduction
                            )}
                          </Badge>
                        )}
                      </Accordion.Header>
                      <Accordion.Body>
                        <Alert variant="light" className="border small py-2">
                          Nothing here is deducted automatically. If HR decides
                          to deduct, add a manual adjustment below (or use the
                          button).
                        </Alert>
                        {attendanceLoading ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <Row className="g-2 small mb-3">
                            <Col xs={6} md={3}>
                              <div className="text-muted">Present</div>
                              <strong>
                                {attendanceSummary?.summary?.present ?? "—"}
                              </strong>
                            </Col>
                            <Col xs={6} md={3}>
                              <div className="text-muted">Absent</div>
                              <strong>
                                {attendanceSummary?.summary?.absent ?? "—"}
                              </strong>
                            </Col>
                            <Col xs={6} md={3}>
                              <div className="text-muted">Late</div>
                              <strong>
                                {attendanceSummary?.summary?.late ?? "—"}
                              </strong>
                            </Col>
                            <Col xs={6} md={3}>
                              <div className="text-muted">On leave</div>
                              <strong>
                                {attendanceSummary?.summary?.onLeave ?? "—"}
                              </strong>
                            </Col>
                            <Col xs={6} md={3}>
                              <div className="text-muted">Half day</div>
                              <strong>
                                {attendanceSummary?.summary?.halfDay ?? "—"}
                              </strong>
                            </Col>
                            <Col xs={6} md={3}>
                              <div className="text-muted">Unpaid leave (suggested)</div>
                              <strong>
                                {preview.attendanceReport?.unpaidLeaveDays ?? 0}{" "}
                                day(s)
                              </strong>
                            </Col>
                            <Col xs={6} md={3}>
                              <div className="text-muted">Per day</div>
                              <strong>
                                {formatInr(
                                  preview.attendanceReport?.perDaySalary ??
                                    preview.perDaySalary
                                )}
                              </strong>
                            </Col>
                            <Col xs={6} md={3}>
                              <div className="text-muted">Suggested deduct</div>
                              <strong>
                                {formatInr(
                                  preview.attendanceReport?.suggestedDeduction
                                )}
                              </strong>
                            </Col>
                          </Row>
                        )}
                        <p className="small text-muted mb-2">
                          {preview.attendanceReport?.detail ||
                            "No leave-impact suggestion for this period."}
                        </p>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={openSuggestedDeduction}
                        >
                          <FaPlus className="me-1" />
                          Add manual deduction from attendance
                        </Button>
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="2">
                      <Accordion.Header>
                        Manual Adjustments —{" "}
                        {formatInr(
                          preview.sections?.manualAdjustments?.amount
                        )}
                        {preview.sections?.manualAdjustments?.pendingCount >
                          0 && (
                          <Badge bg="secondary" className="ms-2">
                            {
                              preview.sections.manualAdjustments.pendingCount
                            }{" "}
                            draft
                          </Badge>
                        )}
                      </Accordion.Header>
                      <Accordion.Body>
                        {preview.sections?.manualAdjustments?.note && (
                          <Alert variant="light" className="border py-2 small">
                            {preview.sections.manualAdjustments.note}
                          </Alert>
                        )}
                        {(preview.sections?.manualAdjustments?.lines || [])
                          .length === 0 ? (
                          <span className="text-muted small">
                            No adjustments this month.
                          </span>
                        ) : (
                          <Table size="sm" responsive className="mb-0">
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.sections.manualAdjustments.lines.map(
                                (line, idx) => (
                                  <tr key={line.id || idx}>
                                    <td>{line.type}</td>
                                    <td>
                                      {line.signedAmount >= 0 ? "+" : ""}
                                      {formatInr(line.signedAmount)}
                                    </td>
                                    <td>{statusBadge(line.status)}</td>
                                    <td className="small">{line.reason}</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </Table>
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="3">
                      <Accordion.Header>
                        TDS —{" "}
                        {preview.sections?.tds?.enabled
                          ? formatInr(preview.sections?.tds?.amount)
                          : "Off"}
                      </Accordion.Header>
                      <Accordion.Body className="small text-muted">
                        {preview.sections?.tds?.enabled
                          ? "TDS is enabled on the active simple structure."
                          : "TDS is disabled for this employee."}
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="4">
                      <Accordion.Header>
                        Final Net —{" "}
                        {preview.totals?.rejected
                          ? "Rejected"
                          : formatInr(preview.sections?.netSalary?.amount)}
                      </Accordion.Header>
                      <Accordion.Body>
                        <Row className="small">
                          <Col xs={6}>Monthly</Col>
                          <Col xs={6} className="text-end">
                            {formatInr(preview.totals?.monthlySalary)}
                          </Col>
                          <Col xs={6}>± Adjustments</Col>
                          <Col xs={6} className="text-end">
                            {formatInr(preview.totals?.adjustmentsTotal)}
                          </Col>
                          <Col xs={6}>− TDS</Col>
                          <Col xs={6} className="text-end">
                            {formatInr(preview.totals?.tdsAmount)}
                          </Col>
                          <Col xs={6} className="fw-semibold pt-2">
                            Net
                          </Col>
                          <Col xs={6} className="text-end fw-semibold pt-2">
                            {preview.totals?.rejected
                              ? "—"
                              : formatInr(preview.totals?.netSalary)}
                          </Col>
                        </Row>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </>
              )}
            </Card.Body>
          </Card>

          {/* Generate employee-facing salary preview */}
          <Card className="mb-3 shadow-sm">
            <Card.Header className="bg-white d-flex flex-wrap gap-2 justify-content-between align-items-center">
              <div>
                <strong>Employee salary preview</strong>
                <div className="text-muted small">
                  Creates the preview from this screen&apos;s Monthly Salary,
                  adjustments, and TDS. The employee can then acknowledge it or
                  raise a concern.
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                disabled={!isSimple || busy || previewGenBusy}
                onClick={openGenerateSalaryPreview}
              >
                Generate salary preview
              </Button>
            </Card.Header>
          </Card>

          {/* Adjustments */}
          <Card className="shadow-sm">
            <Card.Header className="bg-white d-flex flex-wrap gap-2 justify-content-between align-items-center">
              <strong>Adjustments</strong>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!employeeId || busy}
                  onClick={() => {
                    setAdjForm({
                      type: "bonus",
                      amount: "",
                      direction: "",
                      reason: "",
                      remarks: "",
                      amountMode: "fixed",
                      days: "1",
                    });
                    setShowAdjModal(true);
                  }}
                >
                  <FaPlus className="me-1" /> Add adjustment
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {adjLoading ? (
                <Spinner animation="border" size="sm" />
              ) : adjustments.length === 0 ? (
                <p className="text-muted mb-0 small">
                  No adjustments for this employee/month.
                </p>
              ) : (
                <Table responsive hover size="sm" className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.map((adj) => (
                      <tr key={adj._id}>
                        <td>{adj.type}</td>
                        <td>{formatInr(adj.amount)}</td>
                        <td>{statusBadge(adj.status)}</td>
                        <td className="small">{adj.reason}</td>
                        <td>
                          <div className="d-flex gap-1">
                            {adj.status === "draft" && (
                              <Button
                                size="sm"
                                variant="outline-success"
                                disabled={busy}
                                onClick={() => handleApprove(adj._id)}
                                title="Approve"
                              >
                                <FaCheck />
                              </Button>
                            )}
                            {adj.status !== "void" && (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                disabled={busy}
                                onClick={() => {
                                  setVoidTarget(adj);
                                  setVoidReason("");
                                }}
                                title="Void"
                              >
                                <FaBan />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {/* Create structure modal */}
      <Modal
        show={showCreateStructure}
        onHide={() => setShowCreateStructure(false)}
        centered
      >
        <Form onSubmit={handleCreateStructure}>
          <Modal.Header closeButton>
            <Modal.Title>Create simple salary structure</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {structure?.payrollMode === "simple" && (
              <Alert variant="info" className="small">
                Creating an <strong>active</strong> structure will supersede the
                current one from the effective date.
              </Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Monthly Salary (₹)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                required
                value={structureForm.monthlySalary}
                onChange={(e) =>
                  setStructureForm((f) => ({
                    ...f,
                    monthlySalary: e.target.value,
                  }))
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Effective From</Form.Label>
              <Form.Control
                type="date"
                required
                value={structureForm.effectiveFrom}
                onChange={(e) =>
                  setStructureForm((f) => ({
                    ...f,
                    effectiveFrom: e.target.value,
                  }))
                }
              />
            </Form.Group>
            <Form.Check
              type="switch"
              className="mb-2"
              label="TDS Enabled"
              checked={structureForm.tdsEnabled}
              onChange={(e) =>
                setStructureForm((f) => ({
                  ...f,
                  tdsEnabled: e.target.checked,
                }))
              }
            />
            {structureForm.tdsEnabled && (
              <Form.Group className="mb-3">
                <Form.Label>TDS Amount (₹)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={structureForm.tds}
                  onChange={(e) =>
                    setStructureForm((f) => ({ ...f, tds: e.target.value }))
                  }
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={structureForm.status}
                onChange={(e) =>
                  setStructureForm((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={structureForm.notes}
                onChange={(e) =>
                  setStructureForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowCreateStructure(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? <Spinner size="sm" animation="border" /> : "Save"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add adjustment modal */}
      <Modal show={showAdjModal} onHide={() => setShowAdjModal(false)} centered>
        <Form onSubmit={handleCreateAdjustment}>
          <Modal.Header closeButton>
            <Modal.Title>Add adjustment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={adjForm.type}
                onChange={(e) =>
                  setAdjForm((f) => ({ ...f, type: e.target.value }))
                }
              >
                {ADJUSTMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            {adjForm.type === "other" && (
              <Form.Group className="mb-3">
                <Form.Label>Direction</Form.Label>
                <Form.Select
                  value={adjForm.direction}
                  onChange={(e) =>
                    setAdjForm((f) => ({ ...f, direction: e.target.value }))
                  }
                  required
                >
                  <option value="">Select…</option>
                  <option value="credit">Credit (+)</option>
                  <option value="debit">Debit (−)</option>
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Amount entry</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check
                  type="radio"
                  id="adj-amount-fixed"
                  label="Fixed amount (₹)"
                  checked={adjForm.amountMode === "fixed"}
                  onChange={() =>
                    setAdjForm((f) => ({ ...f, amountMode: "fixed" }))
                  }
                />
                <Form.Check
                  type="radio"
                  id="adj-amount-per-day"
                  label="Per day (Monthly ÷ 30)"
                  checked={adjForm.amountMode === "per_day"}
                  onChange={() =>
                    setAdjForm((f) => ({ ...f, amountMode: "per_day" }))
                  }
                />
              </div>
            </Form.Group>
            {adjForm.amountMode === "per_day" ? (
              <>
                <Alert variant="light" className="border small py-2">
                  Per day = {formatInr(perDayRate)} (Monthly{" "}
                  {formatInr(monthlyForDayRate)} ÷ 30)
                </Alert>
                <Form.Group className="mb-3">
                  <Form.Label>Days</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={adjForm.days}
                    onChange={(e) =>
                      setAdjForm((f) => ({ ...f, days: e.target.value }))
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Calculated amount (₹)</Form.Label>
                  <Form.Control
                    type="text"
                    readOnly
                    value={perDayComputedAmount}
                  />
                </Form.Group>
              </>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label>Amount (₹)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  required
                  value={adjForm.amount}
                  onChange={(e) =>
                    setAdjForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Reason</Form.Label>
              <Form.Control
                required
                value={adjForm.reason}
                onChange={(e) =>
                  setAdjForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Remarks</Form.Label>
              <Form.Control
                value={adjForm.remarks}
                onChange={(e) =>
                  setAdjForm((f) => ({ ...f, remarks: e.target.value }))
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAdjModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? <Spinner size="sm" animation="border" /> : "Create draft"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Void modal */}
      <Modal
        show={Boolean(voidTarget)}
        onHide={() => setVoidTarget(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Void adjustment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small">
            Void <strong>{voidTarget?.type}</strong> (
            {formatInr(voidTarget?.amount)})?
          </p>
          <Form.Group>
            <Form.Label>Reason</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setVoidTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={handleVoid}>
            Void
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm salary preview generation */}
      <Modal
        show={showPreviewGenModal}
        onHide={() => setShowPreviewGenModal(false)}
        centered
      >
        <Modal.Header
          closeButton
          className={
            previewGenMeta?.isCurrentMonth
              ? "bg-warning"
              : "bg-primary text-white"
          }
        >
          <Modal.Title>
            {previewGenMeta?.isCurrentMonth
              ? "Mid-Month Preview"
              : "Confirm Salary Preview Generation"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewGenMeta && (
            <>
              <Alert
                variant={previewGenMeta.isCurrentMonth ? "warning" : "info"}
                className="small"
              >
                {previewGenMeta.note}
              </Alert>

              <h6 className="mb-2">Pay summary (from Simple Payroll)</h6>
              {preview?.totals?.rejected ? (
                <Alert variant="danger" className="small">
                  Net would be negative — fix adjustments before generating.
                </Alert>
              ) : (
                <Table bordered size="sm" className="mb-3">
                  <tbody>
                    <tr>
                      <td className="text-muted">Monthly salary</td>
                      <td className="text-end">
                        <strong>
                          {formatInr(preview?.totals?.monthlySalary)}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">± Adjustments total</td>
                      <td className="text-end">
                        <strong>
                          {formatInr(preview?.totals?.adjustmentsTotal)}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">− TDS</td>
                      <td className="text-end">
                        <strong>
                          {formatInr(preview?.totals?.tdsAmount)}
                        </strong>
                      </td>
                    </tr>
                    <tr className="table-success">
                      <td>
                        <strong>Net amount</strong>
                      </td>
                      <td className="text-end">
                        <strong>
                          {formatInr(preview?.totals?.netSalary)}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              )}

              {(preview?.sections?.manualAdjustments?.lines || []).length >
                0 && (
                <div className="mb-3">
                  <div className="small text-muted mb-1">
                    Adjustments on this screen
                  </div>
                  <ul className="small mb-0 ps-3">
                    {preview.sections.manualAdjustments.lines.map(
                      (line, idx) => (
                        <li key={line.id || idx}>
                          {line.type}:{" "}
                          {line.signedAmount >= 0 ? "+" : ""}
                          {formatInr(line.signedAmount)}
                          {line.status !== "approved" ? (
                            <span className="text-muted">
                              {" "}
                              ({line.status} — not in net until approved)
                            </span>
                          ) : null}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <details className="small text-muted mb-0">
                <summary className="mb-2" style={{ cursor: "pointer" }}>
                  Calendar / working days (optional)
                </summary>
                <div className="border rounded p-2 bg-light">
                  <div className="mb-1">
                    {previewGenMeta.monthName} {previewGenMeta.year}:{" "}
                    {previewGenOverride.totalDays} days ·{" "}
                    {previewGenOverride.weekends} Sundays ·{" "}
                    {previewGenOverride.holidays} holidays ·{" "}
                    <strong>{previewGenOverride.workingDays} working</strong>
                  </div>
                  <Row className="g-2">
                    <Col xs={4}>
                      <Form.Label className="small mb-0">Total</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        min="1"
                        max={previewGenMeta.totalDaysInMonth}
                        value={previewGenOverride.totalDays}
                        onChange={(e) =>
                          setPreviewGenOverride((o) => ({
                            ...o,
                            totalDays: Number(e.target.value),
                          }))
                        }
                      />
                    </Col>
                    <Col xs={4}>
                      <Form.Label className="small mb-0">Working</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        min="0"
                        value={previewGenOverride.workingDays}
                        onChange={(e) =>
                          setPreviewGenOverride((o) => ({
                            ...o,
                            workingDays: Number(e.target.value),
                          }))
                        }
                      />
                    </Col>
                    <Col xs={4}>
                      <Form.Label className="small mb-0">Holidays</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        min="0"
                        value={previewGenOverride.holidays}
                        onChange={(e) =>
                          setPreviewGenOverride((o) => ({
                            ...o,
                            holidays: Number(e.target.value),
                          }))
                        }
                      />
                    </Col>
                  </Row>
                </div>
              </details>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPreviewGenModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant={previewGenMeta?.isCurrentMonth ? "warning" : "primary"}
            disabled={
              previewGenBusy || Boolean(preview?.totals?.rejected)
            }
            onClick={confirmGenerateSalaryPreview}
          >
            {previewGenBusy ? (
              <Spinner size="sm" animation="border" />
            ) : (
              "Confirm & Generate"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SimplePayrollTab;
