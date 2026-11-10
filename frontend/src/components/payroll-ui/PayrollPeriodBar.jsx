import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { getCompanyYearOptions } from "../../constants/branding";
import { usePayrollPeriod } from "../../context/PayrollPeriodContext.jsx";
import { payrollPeriodApi } from "../../api/payrollPeriodApi";
import StatusChip from "./StatusChip";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * @param {{ onCredit?: () => void, onViewSlips?: () => void, showActions?: boolean }} props
 */
const PayrollPeriodBar = ({ onCredit, onViewSlips, showActions = true }) => {
  const payPeriod = usePayrollPeriod();
  const [gateStatus, setGateStatus] = useState(null);
  const [paymentIso, setPaymentIso] = useState(null);
  const [loading, setLoading] = useState(false);

  const month = payPeriod?.month;
  const year = payPeriod?.year;

  const refreshMeta = useCallback(async () => {
    if (!month || !year) return;
    setLoading(true);
    try {
      const [gateRes, dateRes] = await Promise.all([
        payrollPeriodApi.gatesStatus({ month, year }),
        payrollPeriodApi.getPaymentDate(year, month),
      ]);
      setGateStatus(gateRes.data?.data || null);
      setPaymentIso(dateRes.data?.data?.salaryPaymentDate || null);
    } catch {
      setGateStatus(null);
      setPaymentIso(null);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    refreshMeta();
  }, [refreshMeta]);

  if (!payPeriod) return null;

  const paymentLabel = paymentIso
    ? new Date(paymentIso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const periodStatus = gateStatus?.status || "open";

  return (
    <div className="payroll-period-bar">
      <Row className="align-items-center g-2">
        <Col xs={12} md="auto">
          <span className="text-muted small me-2">Pay period</span>
          <Form.Select
            size="sm"
            className="d-inline-block"
            style={{ width: "auto", minWidth: 88 }}
            value={month || ""}
            onChange={(e) =>
              payPeriod.setMonth(parseInt(e.target.value, 10))
            }
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Form.Select>
          <Form.Select
            size="sm"
            className="d-inline-block ms-1"
            style={{ width: "auto", minWidth: 92 }}
            value={year || ""}
            onChange={(e) =>
              payPeriod.setYear(parseInt(e.target.value, 10))
            }
          >
            {getCompanyYearOptions().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={12} md="auto" className="d-flex flex-wrap align-items-center gap-2">
          {loading ? (
            <Spinner size="sm" animation="border" />
          ) : (
            <>
              <StatusChip
                variant={periodStatus === "locked" ? "credited" : "preview"}
                label={`Period ${periodStatus}`}
              />
              {paymentLabel ? (
                <Badge bg="primary" className="fw-normal">
                  Pay date {paymentLabel}
                </Badge>
              ) : (
                <Badge bg="secondary" className="fw-normal">
                  Payment date not set
                </Badge>
              )}
            </>
          )}
        </Col>
        {showActions && (
          <Col xs={12} md className="text-md-end d-flex flex-wrap gap-2 justify-content-md-end">
            {onViewSlips && (
              <Button size="sm" variant="outline-secondary" onClick={onViewSlips}>
                View payslips
              </Button>
            )}
            {onCredit && (
              <Button
                size="sm"
                variant="success"
                disabled={!paymentIso}
                onClick={onCredit}
                title={!paymentIso ? "Set payment date in Run Payroll first" : undefined}
              >
                Quick credit
              </Button>
            )}
          </Col>
        )}
      </Row>
    </div>
  );
};

export default PayrollPeriodBar;
