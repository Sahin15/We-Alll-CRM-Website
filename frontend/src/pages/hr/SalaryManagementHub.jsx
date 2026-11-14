import { useEffect, useMemo, useState } from "react";
import { Container, Nav } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PayrollHubPageHeader,
  PayrollHubDashboard,
} from "../../components/payroll-ui";
import { usePayrollPeriod } from "../../context/PayrollPeriodContext.jsx";
import { usePayrollPeriodHealth } from "../../hooks/usePayrollPeriodHealth";
import { usePayrollHubStats } from "../../hooks/usePayrollHubStats";
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
  const { refresh: refreshHealth } = usePayrollPeriodHealth(month, year);
  const hubStats = usePayrollHubStats(month, year);

  const refreshAll = () => {
    refreshHealth();
    hubStats.refresh();
  };

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

  const workspaceTabs = useMemo(
    () =>
      WORKSPACES.map((w) => ({
        ...w,
        badge:
          w.key === "compensation" && hubStats.totalEmployees
            ? hubStats.totalEmployees
            : null,
      })),
    [hubStats.totalEmployees]
  );

  const selectWorkspace = (key) => {
    setWorkspace(key);
    const params = new URLSearchParams(location.search);
    params.set("workspace", key);
    navigate(`/salary-management?${params.toString()}`, { replace: true });
  };

  return (
    <Container fluid className="mt-4 payroll-hub-page">
      <PayrollHubPageHeader
        onLegacyTools={() => navigate("/salary-management/legacy")}
      />

      <PayrollHubDashboard
        stats={hubStats}
        loading={hubStats.loading}
        onRunPayroll={() => selectWorkspace("run-payroll")}
        onPayrollReports={() => selectWorkspace("finance")}
      />

      <Nav className="payroll-workspace-tabs mb-3 flex-nowrap overflow-auto">
        {workspaceTabs.map((w) => (
          <Nav.Item key={w.key}>
            <Nav.Link
              active={workspace === w.key}
              onClick={() => selectWorkspace(w.key)}
              style={{ cursor: "pointer" }}
              className="d-flex align-items-center gap-2"
            >
              <span>{w.label}</span>
              {w.badge != null && (
                <span className="payroll-tab-count">{w.badge}</span>
              )}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {workspace === "compensation" && <EmployeeCompensationPayroll />}
      {workspace === "run-payroll" && (
        <RunPayrollWorkspace
          onHealthRefresh={refreshAll}
          initialBreakdownEmployeeId={runPayrollDeepLink.employeeId}
          initialRunView={runPayrollDeepLink.runView}
        />
      )}
      {workspace === "payslips" && (
        <SalarySlipList hubV2 onHealthRefresh={refreshAll} />
      )}
      {workspace === "finance" && <FinanceDesk />}
    </Container>
  );
};

export default SalaryManagementHub;
