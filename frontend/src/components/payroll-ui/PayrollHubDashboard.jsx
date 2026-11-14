import { useCallback, useEffect, useState } from "react";
import { Button, Form, Spinner } from "react-bootstrap";
import {
  FaCalculator,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaCoins,
  FaExclamationCircle,
  FaUsers,
} from "react-icons/fa";
import { getCompanyYearOptions } from "../../constants/branding";
import { usePayrollPeriod } from "../../context/PayrollPeriodContext.jsx";
import { payrollPeriodApi } from "../../api/payrollPeriodApi";
import PayrollKpiRow from "./PayrollKpiRow.jsx";
import StatusChip from "./StatusChip.jsx";

const MONTHS_FULL = [
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

const formatInr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

/**
 * @param {{
 *   stats: Record<string, unknown>,
 *   loading?: boolean,
 *   onRunPayroll?: () => void,
 *   onPayrollReports?: () => void,
 * }} props
 */
const PayrollHubDashboard = ({
  stats,
  loading = false,
  onRunPayroll,
  onPayrollReports,
}) => {
  const payPeriod = usePayrollPeriod();
  const [paymentIso, setPaymentIso] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const month = payPeriod?.month;
  const year = payPeriod?.year;

  const refreshPaymentDate = useCallback(async () => {
    if (!month || !year) return;
    setMetaLoading(true);
    try {
      const dateRes = await payrollPeriodApi.getPaymentDate(year, month);
      setPaymentIso(dateRes.data?.data?.salaryPaymentDate || null);
    } catch {
      setPaymentIso(null);
    } finally {
      setMetaLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    refreshPaymentDate();
  }, [refreshPaymentDate]);

  if (!payPeriod || !month || !year) return null;

  const paymentLabel = paymentIso
    ? new Date(paymentIso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not set";

  const periodTitle = `${MONTHS_FULL[month - 1]} ${year} payroll`;
  const configuredPct =
    stats.totalEmployees > 0
      ? ((stats.configured / stats.totalEmployees) * 100).toFixed(1)
      : "0";

  const shiftPeriod = (delta) => {
    let m = month + delta;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    payPeriod.setPeriod(m, y);
  };

  const employeeCount = stats.periodRosterCount || stats.totalEmployees;

  const kpiItems = [
    {
      label: "Total employees",
      value: stats.totalEmployees,
      hint: "Active roster",
      Icon: FaUsers,
      tone: "primary",
    },
    {
      label: "Configured",
      value: stats.configured,
      hint: `${configuredPct}% of employees`,
      Icon: FaCheckCircle,
      tone: "success",
    },
    {
      label: "Need setup",
      value: stats.needSetup,
      hint: "Configure salary structure",
      Icon: FaExclamationCircle,
      tone: "warning",
    },
    {
      label: "Estimated payroll",
      value: formatInr(stats.estimatedGross),
      hint: "From active structures",
      Icon: FaCalculator,
      tone: "purple",
    },
    {
      label: "Paid",
      value: formatInr(stats.paidNet),
      hint: "Credited slips (period)",
      Icon: FaCoins,
      tone: "info",
    },
    {
      label: "Pending payment",
      value: formatInr(stats.pendingNet),
      hint: "Estimated − paid",
      Icon: FaClock,
      tone: "danger",
    },
  ];

  return (
    <div className="payroll-hub-dashboard mb-3">
      <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-3 payroll-hub-period-controls">
        <Button
          variant="outline-secondary"
          size="sm"
          className="payroll-period-chevron"
          onClick={() => shiftPeriod(-1)}
          aria-label="Previous month"
        >
          <FaChevronLeft size={12} aria-hidden />
        </Button>
        <Form.Select
          size="sm"
          className="payroll-period-select"
          value={month}
          onChange={(e) => payPeriod.setMonth(parseInt(e.target.value, 10))}
          aria-label="Payroll month"
        >
          {MONTHS_FULL.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Form.Select>
        <Form.Select
          size="sm"
          className="payroll-period-select payroll-period-select-year"
          value={year}
          onChange={(e) => payPeriod.setYear(parseInt(e.target.value, 10))}
          aria-label="Payroll year"
        >
          {getCompanyYearOptions().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Form.Select>
        <Button
          variant="outline-secondary"
          size="sm"
          className="payroll-period-chevron"
          onClick={() => shiftPeriod(1)}
          aria-label="Next month"
        >
          <FaChevronRight size={12} aria-hidden />
        </Button>
      </div>

      <div className="payroll-hub-hero card border-0 shadow-sm mb-3">
        <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h2 className="h5 mb-0 text-capitalize">{periodTitle}</h2>
              <StatusChip
                variant={stats.processingVariant || "warning"}
                label={stats.processingLabel || "Not processed"}
              />
            </div>
            <div className="text-muted small d-flex flex-wrap gap-3">
              <span>
                <FaCalendarAlt className="me-1" aria-hidden />
                Pay date: <strong className="text-body">{paymentLabel}</strong>
              </span>
              <span className="d-inline-flex align-items-center">
                <FaUsers className="me-1" aria-hidden />
                {metaLoading || loading ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  <>
                    <strong className="text-body">{employeeCount}</strong>{" "}
                    employees
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="primary" onClick={onRunPayroll}>
              Run payroll
            </Button>
            <Button variant="outline-primary" onClick={onPayrollReports}>
              Payroll reports
            </Button>
          </div>
        </div>
      </div>

      <PayrollKpiRow items={kpiItems} loading={loading} variant="hub" />
    </div>
  );
};

export default PayrollHubDashboard;
