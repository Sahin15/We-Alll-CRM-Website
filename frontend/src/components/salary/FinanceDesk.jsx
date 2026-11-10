import { useEffect, useState, useCallback } from "react";
import { Alert, Badge, Button, Card, Col, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PayrollSummary from "./PayrollSummary";
import PayrollExports from "./PayrollExports";
import PayrollApprovals from "./PayrollApprovals";
import {
  PayrollPageHeader,
  PayrollEmptyState,
  StatusChip,
} from "../payroll-ui";
import { usePayrollPeriod } from "../../context/PayrollPeriodContext.jsx";
import { payrollPeriodApi } from "../../api/payrollPeriodApi";
import { payrollSimplePreviewApi } from "../../api/payrollSimpleApi";

/**
 * Finance Desk — period close, exports, approvals (Hub V2).
 */
const FinanceDesk = () => {
  const payPeriod = usePayrollPeriod();
  const navigate = useNavigate();
  const [gate, setGate] = useState(null);
  const [paymentIso, setPaymentIso] = useState(null);
  const [missingSlip, setMissingSlip] = useState(0);
  const [loading, setLoading] = useState(true);

  const month = payPeriod?.month;
  const year = payPeriod?.year;

  const loadChecklist = useCallback(async () => {
    if (!month || !year) return;
    setLoading(true);
    try {
      const [gateRes, dateRes, rosterRes] = await Promise.all([
        payrollPeriodApi.gatesStatus({ month, year }),
        payrollPeriodApi.getPaymentDate(year, month),
        payrollSimplePreviewApi.getRoster({ month, year }),
      ]);
      setGate(gateRes.data?.data || null);
      setPaymentIso(dateRes.data?.data?.salaryPaymentDate || null);
      const rows = rosterRes.data?.data?.rows || [];
      setMissingSlip(
        rows.filter((r) => r.hasStructure && !r.hasSlip).length
      );
    } catch {
      toast.error("Failed to load finance checklist");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const gatesEnabled = Boolean(gate?.enabled);
  const periodStatus = gate?.status || null;
  const periodLocked = periodStatus === "locked";
  const markPaidGated = gatesEnabled
    ? Boolean(gate?.allowed?.markPaid)
  : null;

  const checklistRows = [
    {
      key: "payment",
      ok: Boolean(paymentIso),
      labelOk: "Payment date set",
      labelBad: "Payment date missing",
      action:
        !paymentIso && (
          <Button
            size="sm"
            variant="link"
            className="finance-checklist-link p-0"
            onClick={() =>
              navigate("/salary-management?workspace=run-payroll")
            }
          >
            Set in Run payroll
          </Button>
        ),
    },
    {
      key: "slips",
      ok: missingSlip === 0,
      labelOk: "All roster employees credited",
      labelBad: `${missingSlip} missing payslip(s)`,
      action:
        missingSlip > 0 ? (
          <Button
            size="sm"
            variant="link"
            className="finance-checklist-link p-0"
            onClick={() =>
              navigate("/salary-management?workspace=payslips&tab=missing")
            }
          >
            Fix on Payslips
          </Button>
        ) : null,
    },
    {
      key: "lock",
      ok: periodLocked,
      labelOk: "Pay period locked",
      labelBad: periodStatus
        ? `Pay period: ${periodStatus}`
        : "Pay period not opened",
      action:
        !periodLocked ? (
          <Button
            size="sm"
            variant="link"
            className="finance-checklist-link p-0"
            onClick={() => navigate("/salary-management/legacy?tab=periods")}
          >
            Manage periods
          </Button>
        ) : null,
    },
    {
      key: "markPaid",
      ok: gatesEnabled ? markPaidGated : true,
      labelOk: gatesEnabled
        ? "Mark as paid allowed"
        : "Mark as paid (gates off)",
      labelBad: "Mark as paid blocked — lock period first",
      hint: !gatesEnabled
        ? "Period gates are disabled; locking is optional in your tenant."
        : null,
    },
  ];

  return (
    <div>
      <PayrollPageHeader
        title="Finance desk"
        description="Verify the period, export for bank transfer, then mark slips paid when the period is locked."
        badge="Accounts"
      />

      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className="bg-white fw-semibold">
          Pre-flight checklist
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <div className="finance-preflight-checklist">
              {checklistRows.map((row) => {
                const variant = row.ok
                  ? "credited"
                  : row.key === "markPaid"
                    ? "danger"
                    : "warning";
                return (
                  <div key={row.key} className="finance-preflight-row">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span
                        className={
                          row.ok
                            ? "finance-preflight-icon text-success"
                            : "finance-preflight-icon text-warning"
                        }
                        aria-hidden
                      >
                        {row.ok ? "✓" : "!"}
                      </span>
                      <StatusChip
                        variant={variant}
                        label={row.ok ? row.labelOk : row.labelBad}
                      />
                      {row.hint && (
                        <span className="small text-muted">{row.hint}</span>
                      )}
                    </div>
                    {row.action ? <div>{row.action}</div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {!paymentIso && !loading && (
        <PayrollEmptyState
          title="Set payment date before export"
          description="HR must set the salary payment date under Run payroll before finance exports."
          actionLabel="Open Run payroll"
          onAction={() => navigate("/salary-management?workspace=run-payroll")}
        />
      )}

      <Row className="g-3 mb-3">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">Period summary</Card.Header>
            <Card.Body>
              <PayrollSummary />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white">Bank export</Card.Header>
            <Card.Body>
              <PayrollExports />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <span>Approvals</span>
              <Badge bg="light" text="dark">
                If workflow enabled
              </Badge>
            </Card.Header>
            <Card.Body>
              <PayrollApprovals />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {gatesEnabled && markPaidGated === false && (
        <Alert variant="warning" className="mt-3 small">
          Mark as paid requires a <strong>locked</strong> pay period. Open{" "}
          <strong>Legacy → Pay periods</strong> after HR finishes crediting slips.
        </Alert>
      )}
    </div>
  );
};

export default FinanceDesk;
