import { useEffect, useState } from "react";
import { Container, Tabs, Tab, Button } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import {
  PayrollPageHeader,
} from "../../components/payroll-ui";
import { PayrollPeriodProvider } from "../../context/PayrollPeriodContext.jsx";
import SalaryStructures from "../../components/salary/SalaryStructures";
import TemplateManagement from "../../components/salary/TemplateManagement";
import GenerateSalarySlips from "../../components/salary/GenerateSalarySlips";
import PayrollPeriods from "../../components/salary/PayrollPeriods";
import PayrollApprovals from "../../components/salary/PayrollApprovals";
import PayrollExports from "../../components/salary/PayrollExports";
import PayrollDualRun from "../../components/salary/PayrollDualRun";

const LEGACY_TABS = new Set([
  "structures",
  "templates",
  "generate",
  "periods",
  "approvals",
  "exports",
  "dual-run",
]);

/**
 * Advanced / legacy payroll tools (Hub V2).
 */
const PayrollLegacyContent = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "structures";
  const [activeTab, setActiveTab] = useState(
    LEGACY_TABS.has(tabParam) ? tabParam : "structures"
  );

  useEffect(() => {
    if (LEGACY_TABS.has(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const onSelect = (k) => {
    if (!k) return;
    setActiveTab(k);
    setSearchParams({ tab: k });
  };

  return (
    <Container fluid className="mt-4 payroll-hub-page">
      <Button
        variant="link"
        className="ps-0 mb-2 text-decoration-none"
        onClick={() => navigate("/salary-management")}
      >
        <FaArrowLeft className="me-2" />
        Back to payroll hub
      </Button>
      <PayrollPageHeader
        title="Legacy & advanced"
        description="Structures, templates, allowance generate, pay periods, dual-run — use only when required."
        badge="Advanced"
      />
      <Tabs activeKey={activeTab} onSelect={onSelect} className="mb-3">
        <Tab eventKey="structures" title="Structures">
          {activeTab === "structures" && <SalaryStructures />}
        </Tab>
        <Tab eventKey="templates" title="Templates">
          {activeTab === "templates" && <TemplateManagement />}
        </Tab>
        <Tab eventKey="generate" title="Generate slips">
          {activeTab === "generate" && <GenerateSalarySlips />}
        </Tab>
        <Tab eventKey="periods" title="Pay periods">
          {activeTab === "periods" && <PayrollPeriods />}
        </Tab>
        <Tab eventKey="approvals" title="Approvals">
          {activeTab === "approvals" && <PayrollApprovals />}
        </Tab>
        <Tab eventKey="exports" title="Exports">
          {activeTab === "exports" && <PayrollExports />}
        </Tab>
        <Tab eventKey="dual-run" title="Dual run">
          {activeTab === "dual-run" && <PayrollDualRun />}
        </Tab>
      </Tabs>
    </Container>
  );
};

const PayrollLegacyPage = () => (
  <PayrollPeriodProvider>
    <PayrollLegacyContent />
  </PayrollPeriodProvider>
);

export default PayrollLegacyPage;
