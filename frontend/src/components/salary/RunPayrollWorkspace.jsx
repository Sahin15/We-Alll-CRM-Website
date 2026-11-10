import { useState, useRef, useEffect } from "react";
import { Alert, Card, Nav } from "react-bootstrap";
import { PayrollStepHeader } from "../payroll-ui";
import HRSalaryPreviewManagement from "./HRSalaryPreviewManagement";
import SimplePayrollTab from "./SimplePayrollTab";
import SalaryPaymentDateCard from "./SalaryPaymentDateCard";
import { usePayrollPeriod } from "../../context/PayrollPeriodContext.jsx";

/**
 * Run Payroll workspace — wizard + team previews + per-employee salary breakdown.
 */
const RunPayrollWorkspace = ({
  onHealthRefresh,
  initialBreakdownEmployeeId = "",
  initialRunView = "",
}) => {
  const payPeriod = usePayrollPeriod();
  const [step, setStep] = useState(1);
  /** SMB default: build per-employee breakdown first, then team queue + credit. */
  const [runView, setRunView] = useState("breakdown");
  const [breakdownEmployeeId, setBreakdownEmployeeId] = useState("");
  const confirmRef = useRef(null);
  const issueRef = useRef(null);

  const month = payPeriod?.month;
  const year = payPeriod?.year;

  useEffect(() => {
    if (initialBreakdownEmployeeId) {
      setBreakdownEmployeeId(String(initialBreakdownEmployeeId));
      setRunView("breakdown");
    } else if (initialRunView === "queue") {
      setRunView("previews");
    }
  }, [initialBreakdownEmployeeId, initialRunView]);

  const handleBreakdownEmployeeChange = (id) => {
    setBreakdownEmployeeId(id ? String(id) : "");
  };

  const scrollToRef = (ref) => {
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Steps 2–3 live on Preview queue (payment date + credit). Step 1 starts on Build breakdown. */
  const handleStep = (n) => {
    setStep(n);
    if (n === 1) {
      setRunView("breakdown");
    } else {
      setRunView("previews");
    }
  };

  useEffect(() => {
    if (runView !== "previews") return;
    const t = window.setTimeout(() => {
      if (step === 2) scrollToRef(confirmRef);
      if (step === 3) scrollToRef(issueRef);
    }, 80);
    return () => window.clearTimeout(t);
  }, [step, runView]);

  const openBreakdownForEmployee = (employeeId) => {
    if (employeeId) setBreakdownEmployeeId(String(employeeId));
    setRunView("breakdown");
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePreviewSaved = () => {
    onHealthRefresh?.();
    if (runView === "breakdown") {
      setRunView("previews");
      setStep(1);
    }
  };

  return (
    <div>
      <PayrollStepHeader
        activeStep={step}
        onStep={handleStep}
        completedThrough={Math.max(0, step - 1)}
      />

      <Nav variant="tabs" className="mb-3 payroll-run-subtabs">
        <Nav.Item>
          <Nav.Link
            active={runView === "breakdown"}
            onClick={() => {
              setRunView("breakdown");
              setStep(1);
            }}
            style={{ cursor: "pointer" }}
            title="Step 1 — per-employee salary breakdown"
          >
            Build breakdown
            {step === 1 && runView === "breakdown" ? (
              <span className="text-primary ms-1">·</span>
            ) : null}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            active={runView === "previews"}
            onClick={() => {
              setRunView("previews");
              if (step < 2) setStep(1);
            }}
            style={{ cursor: "pointer" }}
            title="Team previews, queries, payment date, credit"
          >
            Preview queue
            {step >= 2 && runView === "previews" ? (
              <span className="text-primary ms-1">· step {step}</span>
            ) : null}
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {runView === "breakdown" && (
        <>
          <SimplePayrollTab
            embedInRunPayroll
            employeeId={breakdownEmployeeId}
            onEmployeeIdChange={handleBreakdownEmployeeChange}
            onPreviewSaved={handlePreviewSaved}
            key={`${month}-${year}`}
          />
        </>
      )}

      {runView === "previews" && (
        <>
          {step === 1 && (
            <p className="small text-muted mb-2">
              Review previews, respond to queries, or open{" "}
              <strong>Make corrections</strong>. Use{" "}
              <strong>Build breakdown</strong> to edit pay per employee.
            </p>
          )}
          {(step === 2 || step === 3) && (
            <Card className="border-0 shadow-sm mb-3" ref={confirmRef}>
              <Card.Body>
                <h6 className="mb-2">
                  {step === 2 ? "Step 2 — Confirm payment date" : "Payment date"}
                </h6>
                <SalaryPaymentDateCard month={month} year={year} />
                {step === 2 && (
                  <p className="small text-muted mb-0 mt-2">
                    Set the date employees will be paid, then go to{" "}
                    <strong>Issue</strong> to credit salary.
                  </p>
                )}
              </Card.Body>
            </Card>
          )}
          <div ref={issueRef}>
            {step === 3 && (
              <Alert variant="success" className="small py-2 mb-2">
                <strong>Step 3 — Issue credit salary</strong> using the green
                buttons below (all staff or selected rows).
              </Alert>
            )}
            <HRSalaryPreviewManagement
              hubV2
              hidePeriodControls
              hidePageTitle
              wizardStep={step}
              onEditBreakdown={openBreakdownForEmployee}
              onPreviewSaved={handlePreviewSaved}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default RunPayrollWorkspace;
