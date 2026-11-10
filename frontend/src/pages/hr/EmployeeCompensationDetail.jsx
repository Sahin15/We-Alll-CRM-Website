import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarAlt,
  FaChartLine,
  FaGraduationCap,
  FaMoneyBillWave,
  FaUserCheck,
} from "react-icons/fa";
import "../../components/payroll-ui/payroll-ui.css";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { payrollCompensationApi } from "../../api/payrollSimpleApi";
import { salaryStructureApi } from "../../api/salaryApi";
import {
  PayrollPeriodProvider,
  usePayrollPeriod,
} from "../../context/PayrollPeriodContext.jsx";

const REASON_OPTIONS = [
  { value: "joining", label: "Joining" },
  { value: "internship", label: "Internship conversion" },
  { value: "increment", label: "Increment" },
  { value: "promotion", label: "Promotion" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other" },
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatInr = (n) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(n));

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN") : "—";

const eventIcon = (kind) => {
  switch (kind) {
    case "joined":
      return <FaUserCheck size={12} />;
    case "internship":
      return <FaGraduationCap size={12} />;
    case "full_time":
      return <FaBriefcase size={12} />;
    case "salary_structure":
      return <FaMoneyBillWave size={12} />;
    default:
      return <FaMoneyBillWave size={12} />;
  }
};

const initials = (name) => {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Full-page compensation journey for one employee (opened from Payroll tab roster).
 */
const EmployeeCompensationDetail = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const payPeriod = usePayrollPeriod();
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    monthlySalary: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    changeReason: "increment",
    tdsEnabled: false,
    tds: "",
    notes: "",
  });

  const loadTimeline = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await payrollCompensationApi.getTimeline(employeeId);
      setTimeline(res.data?.data || null);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error("Employee not found");
        navigate("/salary-management?workspace=compensation");
        return;
      }
      toast.error("Failed to load compensation timeline");
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId, navigate]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const activeStructure = useMemo(() => {
    const structures = (timeline?.events || []).filter(
      (e) => e.kind === "salary_structure"
    );
    const active = structures.find((s) => s.status === "active");
    return active || structures[structures.length - 1] || null;
  }, [timeline]);

  const periodLabel = useMemo(() => {
    const m = payPeriod?.month;
    const y = payPeriod?.year;
    if (!m || !y) return "This month";
    return `${MONTH_SHORT[m - 1]} ${y}`;
  }, [payPeriod?.month, payPeriod?.year]);

  const openMonthBreakdown = () => {
    const params = new URLSearchParams({
      workspace: "run-payroll",
      employee: employeeId,
    });
    const m = payPeriod?.month;
    const y = payPeriod?.year;
    if (m) params.set("month", m);
    if (y) params.set("year", y);
    navigate(`/salary-management?${params.toString()}`);
  };

  const openTeamPreviews = () => {
    const params = new URLSearchParams({
      workspace: "run-payroll",
      view: "queue",
    });
    const m = payPeriod?.month;
    const y = payPeriod?.year;
    if (m) params.set("month", m);
    if (y) params.set("year", y);
    navigate(`/salary-management?${params.toString()}`);
  };

  const openSalaryModal = () => {
    setSalaryForm((f) => ({
      ...f,
      monthlySalary: activeStructure?.amount
        ? String(activeStructure.amount)
        : "",
      effectiveFrom: new Date().toISOString().slice(0, 10),
    }));
    setShowSalaryModal(true);
  };

  const saveSalary = async () => {
    const monthly = Number(salaryForm.monthlySalary);
    if (!monthly || monthly <= 0) {
      toast.error("Enter a valid monthly salary");
      return;
    }
    setSaving(true);
    try {
      await salaryStructureApi.create({
        employee: employeeId,
        payrollMode: "simple",
        status: "active",
        monthlySalary: monthly,
        effectiveFrom: salaryForm.effectiveFrom,
        changeReason: salaryForm.changeReason,
        notes: salaryForm.notes,
        tdsEnabled: salaryForm.tdsEnabled,
        tds: salaryForm.tdsEnabled ? Number(salaryForm.tds) || 0 : 0,
        basicSalary: monthly,
        hra: 0,
        specialAllowance: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
      });
      toast.success("Salary structure saved");
      setShowSalaryModal(false);
      await loadTimeline();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save salary structure"
      );
    } finally {
      setSaving(false);
    }
  };

  const emp = timeline?.employee;

  return (
    <Container fluid className="py-4 comp-detail-page payroll-hub-page">
      <div className="comp-detail-topbar">
        <button
          type="button"
          className="comp-detail-back border-0"
          onClick={() => navigate("/salary-management?workspace=compensation")}
        >
          <FaArrowLeft size={14} />
          Compensation roster
        </button>
        <span className="text-muted small">
          Payroll hub / {emp?.name || "Employee"}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <div className="text-muted mt-2">Loading profile…</div>
        </div>
      ) : (
        <>
          <CompDetailHero emp={emp} activeStructure={activeStructure} />

          <Row className="g-4 mb-4">
            <Col lg={4}>
              <CompDetailSidebar
                activeStructure={activeStructure}
                periodLabel={periodLabel}
                onChangeSalary={openSalaryModal}
                onBreakdown={openMonthBreakdown}
                onPreviews={openTeamPreviews}
              />
            </Col>
            <Col lg={8}>
              <CompDetailTimeline events={timeline?.events} />
            </Col>
          </Row>
        </>
      )}

      <Modal show={showSalaryModal} onHide={() => setShowSalaryModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Record salary change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted">
            Creates a new salary structure segment and supersedes the previous
            active one (compensation history).
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Monthly salary (INR)</Form.Label>
            <Form.Control
              type="number"
              value={salaryForm.monthlySalary}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, monthlySalary: e.target.value })
              }
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Effective from</Form.Label>
            <Form.Control
              type="date"
              value={salaryForm.effectiveFrom}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, effectiveFrom: e.target.value })
              }
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Reason</Form.Label>
            <Form.Select
              value={salaryForm.changeReason}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, changeReason: e.target.value })
              }
            >
              {REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Notes (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={salaryForm.notes}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, notes: e.target.value })
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSalaryModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={saveSalary}>
            {saving ? <Spinner size="sm" /> : "Save structure"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

function CompDetailHero({ emp, activeStructure }) {
  return (
    <div className="comp-detail-hero">
      <Row className="align-items-center g-3">
        <Col xs="auto">
          <div className="comp-detail-avatar">{initials(emp?.name)}</div>
        </Col>
        <Col>
          <h1 className="h3 mb-2">{emp?.name || "Employee"}</h1>
          <div>
            {emp?.employeeId && (
              <span className="comp-detail-meta-chip">{emp.employeeId}</span>
            )}
            {emp?.department?.name && (
              <span className="comp-detail-meta-chip">{emp.department.name}</span>
            )}
            {emp?.designation && (
              <span className="comp-detail-meta-chip">{emp.designation}</span>
            )}
          </div>
        </Col>
        <Col xs={12} md="auto" className="text-md-end">
          <div className="text-muted small">Current monthly (simple)</div>
          <div className="fs-4 fw-bold text-primary">
            {activeStructure?.amount != null
              ? formatInr(activeStructure.amount)
              : "Not set"}
          </div>
          {activeStructure?.date && (
            <div className="text-muted small">
              Since {formatDate(activeStructure.date)}
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
}

function CompDetailSidebar({
  activeStructure,
  periodLabel,
  onChangeSalary,
  onBreakdown,
  onPreviews,
}) {
  return (
    <div className="d-flex flex-column gap-3">
      <div className="comp-current-pay">
        <div className="text-muted small mb-1">Long-term compensation</div>
        <div className="amount">
          {activeStructure?.amount != null
            ? formatInr(activeStructure.amount)
            : "—"}
        </div>
        <p className="small text-muted mb-0 mt-2">
          Promotions, joining salary, and internship live here. Monthly LOP,
          bonuses, and crediting payslips are under Run payroll.
        </p>
        <Button
          variant="success"
          size="sm"
          className="mt-3 w-100"
          onClick={onChangeSalary}
        >
          Record salary change
        </Button>
      </div>

      <div>
        <h6 className="text-muted text-uppercase small mb-2" style={{ letterSpacing: "0.06em" }}>
          This month — {periodLabel}
        </h6>
        <Row className="g-2">
          <Col xs={12}>
            <button
              type="button"
              className="comp-action-tile border-0"
              onClick={onBreakdown}
            >
              <FaChartLine className="comp-action-tile__icon text-primary" />
              <h6 className="mb-1">Salary breakdown</h6>
              <p className="small text-muted">
                Attendance, leave balance, adjustments, save preview for this
                employee.
              </p>
            </button>
          </Col>
          <Col xs={12}>
            <button
              type="button"
              className="comp-action-tile border-0"
              onClick={onPreviews}
            >
              <FaCalendarAlt className="comp-action-tile__icon text-primary" />
              <h6 className="mb-1">Preview queue &amp; credit</h6>
              <p className="small text-muted">
                Queries, payment date, and credit salary for the period.
              </p>
            </button>
          </Col>
        </Row>
      </div>
    </div>
  );
}

function CompDetailTimeline({ events }) {
  const list = events || [];
  return (
    <div>
      <h2 className="h5 mb-3">Career timeline</h2>
      {list.length === 0 ? (
        <div className="comp-action-tile">
          <p className="text-muted mb-2">No events yet.</p>
          <p className="small text-muted mb-0">
            Record the first salary structure to start the journey.
          </p>
        </div>
      ) : (
        <div className="comp-timeline-rail">
          {list.map((ev, idx) => (
            <CompTimelineItem key={`${ev.kind}-${idx}`} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompTimelineItem({ ev }) {
  return (
    <div className="comp-timeline-item">
      <div className="comp-timeline-node">{eventIcon(ev.kind)}</div>
      <div className="comp-timeline-card">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
          <span className="fw-semibold">{ev.label}</span>
          {ev.kind === "salary_structure" && ev.status && (
            <Badge bg={ev.status === "active" ? "success" : "secondary"}>
              {ev.status}
            </Badge>
          )}
        </div>
        <div className="small text-muted">
          {formatDate(ev.date)}
          {ev.periodEnd
            ? ` → ${formatDate(ev.periodEnd)}`
            : ev.kind === "salary_structure"
            ? " → Present"
            : ""}
        </div>
        {ev.amount != null && (
          <div className="fw-semibold text-success mt-1">
            {formatInr(ev.amount)}
          </div>
        )}
        {ev.notes && (
          <p className="small text-muted mb-0 mt-2">{ev.notes}</p>
        )}
      </div>
    </div>
  );
}

const EmployeeCompensationDetailPage = () => (
  <PayrollPeriodProvider>
    <EmployeeCompensationDetail />
  </PayrollPeriodProvider>
);

export default EmployeeCompensationDetailPage;
