import {
  Accordion,
  Alert,
  Badge,
  Col,
  Row,
  Table,
} from "react-bootstrap";

/**
 * Read-only Simple Payroll accordion — same sections as SimplePayrollTab.
 *
 * @param {object} props
 * @param {object} props.preview - simple preview DTO (live API or mapped from stored preview)
 * @param {(n: number) => string} props.formatCurrency
 */
export default function SimplePayrollPreviewPanels({
  preview,
  formatCurrency,
}) {
  if (!preview?.applicable && preview?.sections == null) {
    return (
      <Alert variant="warning" className="mb-0">
        Simple payroll preview is not available for this employee.
      </Alert>
    );
  }

  const statusBadge = (status) => {
    const map = {
      approved: "success",
      draft: "secondary",
      void: "dark",
    };
    return <Badge bg={map[status] || "secondary"}>{status || "—"}</Badge>;
  };

  return (
    <>
      <Alert variant="light" className="border small mb-3">
        Simple payroll — Monthly Salary ± manual adjustments − Professional Tax = Net.
        Attendance is review-only unless a manual deduction was added.
      </Alert>

      {preview.totals?.rejected && (
        <Alert variant="danger">
          {preview.totals.rejectReason ||
            "Net salary would be negative — fix adjustments."}
        </Alert>
      )}

      <Accordion defaultActiveKey={["0", "5"]} alwaysOpen>
        <Accordion.Item eventKey="0">
          <Accordion.Header>
            Monthly Salary —{" "}
            {formatCurrency(preview.sections?.monthlySalary?.amount)}
          </Accordion.Header>
          <Accordion.Body>
            <div className="small text-muted">
              {preview.sections?.monthlySalary?.detail ||
                `Per day (÷${preview.dayDivisor || 30}): ${formatCurrency(
                  preview.perDaySalary
                )}`}
            </div>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1">
          <Accordion.Header>
            Salary or leave deduction
            {preview.attendanceReport?.suggestedDeduction > 0 && (
              <Badge bg="warning" text="dark" className="ms-2">
                Suggested{" "}
                {formatCurrency(preview.attendanceReport.suggestedDeduction)}
              </Badge>
            )}
          </Accordion.Header>
          <Accordion.Body>
            <Alert variant="light" className="border small py-2">
              Review-only leave impact. Nothing is deducted until HR adds a
              salary or leave deduction on Payroll.
            </Alert>
            <Row className="g-2 small mb-2">
              <Col xs={6} md={3}>
                <div className="text-muted">Unpaid leave (suggested)</div>
                <strong>
                  {preview.attendanceReport?.unpaidLeaveDays ?? 0} day(s)
                </strong>
              </Col>
              <Col xs={6} md={3}>
                <div className="text-muted">Paid leaves</div>
                <strong>
                  {preview.attendanceReport?.paidLeaveDays ?? 0} day(s)
                </strong>
              </Col>
              <Col xs={6} md={3}>
                <div className="text-muted">Per day</div>
                <strong>
                  {formatCurrency(
                    preview.attendanceReport?.perDaySalary ??
                      preview.perDaySalary
                  )}
                </strong>
              </Col>
              <Col xs={6} md={3}>
                <div className="text-muted">Suggested deduct</div>
                <strong>
                  {formatCurrency(
                    preview.attendanceReport?.suggestedDeduction
                  )}
                </strong>
              </Col>
            </Row>
            <p className="small text-muted mb-0">
              {preview.attendanceReport?.detail ||
                "No leave-impact suggestion for this period."}
            </p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="2">
          <Accordion.Header>
            Salary or leave deduction
            {preview.attendanceReport?.earnedLeave?.remaining != null && (
              <Badge bg="success" className="ms-2">
                EL {preview.attendanceReport.earnedLeave.remaining} day(s)
              </Badge>
            )}
          </Accordion.Header>
          <Accordion.Body>
            <Alert variant="light" className="border small py-2">
              HR can deduct from salary (cuts net) or from earned leave (full
              salary paid). Actions are available on the Payroll tab.
            </Alert>
            {preview.attendanceReport?.earnedLeave ? (
              <Row className="g-2 small mb-0">
                <Col xs={6} md={4}>
                  <div className="text-muted">Earned leave remaining</div>
                  <strong>
                    {preview.attendanceReport.earnedLeave.eligible
                      ? `${preview.attendanceReport.earnedLeave.remaining} day(s)`
                      : "Not eligible"}
                  </strong>
                </Col>
                <Col xs={6} md={4}>
                  <div className="text-muted">Suggested unpaid days</div>
                  <strong>
                    {preview.attendanceReport?.unpaidLeaveDays ?? 0} day(s)
                  </strong>
                </Col>
              </Row>
            ) : (
              <p className="small text-muted mb-0">
                Leave balance details are shown when generating from Payroll.
              </p>
            )}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="3">
          <Accordion.Header>
            Manual Adjustments —{" "}
            {formatCurrency(preview.sections?.manualAdjustments?.amount)}
            {preview.sections?.manualAdjustments?.pendingCount > 0 && (
              <Badge bg="secondary" className="ms-2">
                {preview.sections.manualAdjustments.pendingCount} draft
              </Badge>
            )}
          </Accordion.Header>
          <Accordion.Body>
            {preview.sections?.manualAdjustments?.note && (
              <Alert variant="light" className="border py-2 small">
                {preview.sections.manualAdjustments.note}
              </Alert>
            )}
            {(preview.sections?.manualAdjustments?.lines || []).length ===
            0 ? (
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
                          {formatCurrency(line.signedAmount)}
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

        <Accordion.Item eventKey="4">
          <Accordion.Header>
            Professional Tax —{" "}
            {preview.sections?.tds?.enabled
              ? formatCurrency(preview.sections?.tds?.amount)
              : "Off"}
          </Accordion.Header>
          <Accordion.Body className="small text-muted">
            {preview.sections?.tds?.enabled
              ? "Professional Tax is enabled on the active simple structure."
              : preview.sections?.tds?.amount > 0
                ? "Professional Tax amount stored on this preview."
                : "Professional Tax is disabled for this employee."}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="5" className="payroll-final-net-item">
          <Accordion.Header className="payroll-final-net-header">
            Final Net —{" "}
            {preview.totals?.rejected
              ? "Rejected"
              : formatCurrency(
                  preview.sections?.netSalary?.amount ??
                    preview.totals?.netSalary
                )}
          </Accordion.Header>
          <Accordion.Body className="payroll-final-net-body">
            <Row className="small g-1 mb-0">
              <Col xs={6}>Monthly</Col>
              <Col xs={6} className="text-end">
                {formatCurrency(preview.totals?.monthlySalary)}
              </Col>
              <Col xs={6}>± Adjustments</Col>
              <Col xs={6} className="text-end">
                {formatCurrency(preview.totals?.adjustmentsTotal)}
              </Col>
              <Col xs={6}>− Professional Tax</Col>
              <Col xs={6} className="text-end">
                {formatCurrency(preview.totals?.tdsAmount)}
              </Col>
            </Row>
            <Row className="small g-0 mt-2 payroll-final-net-total rounded">
              <Col xs={6} className="fw-semibold py-2 px-3">
                Net
              </Col>
              <Col xs={6} className="text-end fw-semibold py-2 px-3">
                {preview.totals?.rejected
                  ? "—"
                  : formatCurrency(preview.totals?.netSalary)}
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <style>{`
        .payroll-final-net-item {
          border: 1px solid #198754 !important;
          border-radius: 8px;
          overflow: hidden;
        }
        .payroll-final-net-header {
          background: linear-gradient(135deg, #d1e7dd 0%, #e8f5e9 100%) !important;
          font-weight: 600;
        }
        .payroll-final-net-header:not(.collapsed) {
          background: linear-gradient(135deg, #b8dfc8 0%, #d1e7dd 100%) !important;
        }
        .payroll-final-net-body {
          background: #f8fdf9;
        }
        .payroll-final-net-total {
          background: linear-gradient(135deg, #198754 0%, #20c997 100%);
          color: #fff;
        }
      `}</style>
    </>
  );
}
