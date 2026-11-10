import { useEffect, useMemo, useState } from "react";
import { Container, Nav, Button } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PayrollPageHeader,
  PayrollPeriodBar,
  PayrollKpiRow,
} from "../../components/payroll-ui";
import { usePayrollPeriod } from "../../context/PayrollPeriodContext.jsx";
import { usePayrollPeriodHealth } from "../../hooks/usePayrollPeriodHealth";
import EmployeeCompensationPayroll from "../../components/salary/EmployeeCompensationPayroll";
import RunPayrollWorkspace from "../../components/salary/RunPayrollWorkspace";
import SalarySlipList from "../../components/salary/SalarySlipList";
import FinanceDesk from "../../components/salary/FinanceDesk";

const WORKSPACES = [
  { key: "compensation", label: "Compensation" },
  { key: "run-payroll", label: "Run payroll" },
  { key: "payslips", label: "Payslips" },
  { key: "finance", label: "Finance desk" },
];

const formatInr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const defaultWorkspaceForRole = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "accounts") return "finance";
  if (r === "hr" || r === "manager") return "run-payroll";
  return "run-payroll";
};

const SalaryManagementHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const payPeriod = usePayrollPeriod();
  const [workspace, setWorkspace] = useState(
    defaultWorkspaceForRole(user?.role)
  );
  /** One-shot deep link from compensation (?employee=) — not kept in the URL. */
  const [runPayrollDeepLink] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      employeeId: params.get("employee") || "",
      runView: params.get("view") || "",
    };
  });

  const month = payPeriod?.month;
  const year = payPeriod?.year;
  const { health, loading: healthLoading, refresh: refreshHealth } =
    usePayrollPeriodHealth(month, year);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ws = params.get("workspace");
    const legacyTab = params.get("tab");
    const mapLegacy = {
      "simple-payroll": "compensation",
      previews: "run-payroll",
      slips: "payslips",
      reports: "finance",
    };
    if (ws && WORKSPACES.some((w) => w.key === ws)) {
      setWorkspace(ws);
    } else if (legacyTab && mapLegacy[legacyTab]) {
      setWorkspace(mapLegacy[legacyTab]);
    }
    const m = params.get("month");
    const y = params.get("year");
    if (payPeriod && m && y) {
      const monthNum = parseInt(m, 10);
      const yearNum = parseInt(y, 10);
      if (monthNum >= 1 && monthNum <= 12) {
        payPeriod.setPeriod(monthNum, yearNum);
      }
    }
    if (params.get("employee") || params.get("view")) {
      params.delete("employee");
      params.delete("view");
      const qs = params.toString();
      navigate(
        qs ? `/salary-management?${qs}` : "/salary-management",
        { replace: true }
      );
    }
  }, [location.search]);

  const kpiItems = useMemo(
    () => [
      { label: "Previews", value: health.previewCount },
      { label: "Slips credited", value: health.creditedCount },
      { label: "Open queries", value: health.openQueries },
      { label: "Missing slips", value: health.missingSlipCount },
      {
        label: "Net payout",
        value: formatInr(health.totalNet),
        hint: "Selected period",
      },
    ],
    [health]
  );

  const selectWorkspace = (key) => {
    setWorkspace(key);
    const params = new URLSearchParams(location.search);
    params.set("workspace", key);
    navigate(`/salary-management?${params.toString()}`, { replace: true });
  };

  return (
    <Container fluid className="mt-4 payroll-hub-page">
      <PayrollPageHeader
        title="Payroll hub"
        description="Compensation history, monthly run, payslips, and finance close — in one place."
        badge="Salary management"
        actions={
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => navigate("/salary-management/legacy")}
          >
            Legacy tools
          </Button>
        }
      />

      <PayrollPeriodBar
        onViewSlips={() => selectWorkspace("payslips")}
        onCredit={() => selectWorkspace("run-payroll")}
      />

      {(workspace === "run-payroll" ||
        workspace === "payslips" ||
        workspace === "finance") && (
        <PayrollKpiRow items={kpiItems} loading={healthLoading} />
      )}

      <Nav variant="pills" className="payroll-workspace-nav mb-3 flex-wrap gap-1">
        {WORKSPACES.map((w) => (
          <Nav.Item key={w.key}>
            <Nav.Link
              active={workspace === w.key}
              onClick={() => selectWorkspace(w.key)}
              style={{ cursor: "pointer" }}
            >
              {w.label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {workspace === "compensation" && <EmployeeCompensationPayroll />}
      {workspace === "run-payroll" && (
        <RunPayrollWorkspace
          onHealthRefresh={refreshHealth}
          initialBreakdownEmployeeId={runPayrollDeepLink.employeeId}
          initialRunView={runPayrollDeepLink.runView}
        />
      )}
      {workspace === "payslips" && (
        <SalarySlipList hubV2 onHealthRefresh={refreshHealth} />
      )}
      {workspace === "finance" && <FinanceDesk />}
    </Container>
  );
};

export default SalaryManagementHub;
