import { useMemo } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Row,
  Table,
} from "react-bootstrap";
import { FaCoins, FaLeaf, FaMinusCircle, FaPlusCircle } from "react-icons/fa";
import { ADJUSTMENT_TYPE_OPTIONS } from "../../api/payrollSimpleApi";
import "../payroll-ui/payroll-ui.css";

const OTHER_ADJUSTMENT_TYPES = ADJUSTMENT_TYPE_OPTIONS.filter(
  (o) =>
    o.value !== "leave_balance_deduction" && o.value !== "absent_deduction"
);

const formatLineType = (type) => {
  if (type === "leave_balance_deduction") return "Earned leave";
  if (type === "absent_deduction") return "Salary deduction";
  return type?.replace(/_/g, " ") || type;
};

/**
 * Simple payroll salary corrections — earned leave, salary (fixed/per day), other lines.
 *
 * @param {object} props
 * @param {object} props.value - simpleCorrections state
 * @param {(patch: object) => void} props.onPatch
 * @param {object|null} props.attendance - dto.attendanceReport
 * @param {(n: number) => string} props.formatCurrency
 * @param {() => number} props.perDayRate
 * @param {() => number} props.effectiveNewAmount
 * @param {() => number} props.signedNewAmount
 * @param {() => number} props.effectiveAdjustmentsTotal
 * @param {() => number} props.previewNet
 */
const SimpleSalaryCorrectionsForm = ({
  value,
  onPatch,
  attendance,
  formatCurrency,
  perDayRate,
  effectiveNewAmount,
  signedNewAmount,
  effectiveAdjustmentsTotal,
  previewNet,
}) => {
  const earnedLeave = attendance?.earnedLeave;
  const earnedEligible = Boolean(earnedLeave?.eligible);
  const earnedRemaining = Number(earnedLeave?.remaining ?? 0);

  const hasLeaveLine = useMemo(
    () =>
      (value.adjustmentLines || []).some(
        (l) =>
          l.type === "leave_balance_deduction" &&
          l.status !== "void"
      ),
    [value.adjustmentLines]
  );

  const addKind = value.addKind || "none";

  const setKind = (kind) => {
    const patch = { addKind: kind };
    if (kind === "salary_deduction") {
      patch.newCorrectionType = "absent_deduction";
      patch.amountMode = value.amountMode || "per_day";
    }
    if (kind === "other" && value.newCorrectionType === "absent_deduction") {
      patch.newCorrectionType = "manual_salary_deduction";
    }
    onPatch(patch);
  };

  const absentHint =
    attendance?.absentDaysOnly > 0 || attendance?.unpaidLeaveDays > 0
      ? `${attendance.absentDaysOnly || attendance.unpaidLeaveDays || 0} unpaid/absent day(s) in attendance`
      : null;

  return (
    <div className="payroll-correction-form">
      <Alert variant="light" className="border small py-2 mb-3">
        Same rules as <strong>Build salary breakdown</strong>: reduce net with a{" "}
        <strong>salary deduction</strong> (fixed or per day), or use{" "}
        <strong>earned leave</strong> (days from balance — pay unchanged). Edit
        monthly pay or TDS below; optional new line before Save.
      </Alert>

      <Row className="g-3">
        <Col lg={7}>
          <Row className="g-2 mb-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Monthly salary (₹)
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={value.monthlySalary}
                  onChange={(e) =>
                    onPatch({ monthlySalary: Number(e.target.value) })
                  }
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">TDS (₹)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={value.tdsAmount}
                  onChange={(e) =>
                    onPatch({ tdsAmount: Number(e.target.value) })
                  }
                />
              </Form.Group>
            </Col>
          </Row>

          {absentHint && (
            <Alert variant="warning" className="small py-2">
              {absentHint}. Suggested: cover with leave and/or salary deduction.
            </Alert>
          )}

          <div className="small text-muted text-uppercase fw-semibold mb-2">
            Add adjustment (optional)
          </div>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Button
              size="sm"
              variant={addKind === "none" ? "secondary" : "outline-secondary"}
              onClick={() => setKind("none")}
            >
              None
            </Button>
            <Button
              size="sm"
              variant={addKind === "earned_leave" ? "success" : "outline-success"}
              disabled={!earnedEligible || hasLeaveLine}
              title={
                hasLeaveLine
                  ? "Void existing leave deduction first"
                  : earnedEligible
                    ? `${earnedRemaining} day(s) available`
                    : "Not eligible for earned leave"
              }
              onClick={() => setKind("earned_leave")}
            >
              <FaLeaf className="me-1" />
              Earned leave
            </Button>
            <Button
              size="sm"
              variant={
                addKind === "salary_deduction" ? "primary" : "outline-primary"
              }
              onClick={() => setKind("salary_deduction")}
            >
              <FaMinusCircle className="me-1" />
              Salary deduction
            </Button>
            <Button
              size="sm"
              variant={addKind === "other" ? "info" : "outline-info"}
              onClick={() => setKind("other")}
            >
              <FaPlusCircle className="me-1" />
              Bonus / other
            </Button>
          </div>

          {addKind === "earned_leave" && (
            <Card className="border-success mb-3">
              <Card.Body className="py-3">
                <div className="fw-semibold text-success mb-2">
                  Deduct from earned leave
                </div>
                <p className="small text-muted mb-2">
                  Reduces leave balance only — net salary unchanged. Employee
                  sees this in My Leaves.
                </p>
                <Form.Group className="mb-2">
                  <Form.Label className="small">Days</Form.Label>
                  <div className="d-flex gap-2 flex-wrap mb-2">
                    {[1, 2, 3].map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant={
                          Number(value.days) === d ? "success" : "outline-success"
                        }
                        onClick={() => onPatch({ days: d })}
                      >
                        {d} day{d > 1 ? "s" : ""}
                      </Button>
                    ))}
                  </div>
                  <Form.Control
                    type="number"
                    min="1"
                    step="1"
                    value={value.days}
                    onChange={(e) =>
                      onPatch({ days: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                  <Form.Text muted>
                    Available: <strong>{earnedRemaining}</strong> day(s)
                    {Number(value.days) > earnedRemaining && (
                      <span className="text-danger ms-2">Exceeds balance</span>
                    )}
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          )}

          {addKind === "salary_deduction" && (
            <Card className="border-primary mb-3">
              <Card.Body className="py-3">
                <div className="fw-semibold text-primary mb-2">
                  Deduct from salary
                </div>
                <p className="small text-muted mb-2">
                  Reduces net pay — fixed ₹ or per-day rate × days (monthly ÷
                  30).
                </p>
                <Form.Group className="mb-2">
                  <Form.Label className="small d-block">Amount mode</Form.Label>
                  <Form.Check
                    inline
                    type="radio"
                    id="corr-mode-fixed"
                    label="Fixed amount (₹)"
                    name="corrSalaryMode"
                    checked={value.amountMode === "fixed"}
                    onChange={() => onPatch({ amountMode: "fixed" })}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    id="corr-mode-perday"
                    label="Per day (÷ 30)"
                    name="corrSalaryMode"
                    checked={value.amountMode === "per_day"}
                    onChange={() => onPatch({ amountMode: "per_day" })}
                  />
                </Form.Group>
                {value.amountMode === "per_day" ? (
                  <Form.Group className="mb-0">
                    <Form.Label className="small">Days to deduct</Form.Label>
                    <div className="d-flex gap-2 flex-wrap mb-2">
                      {[1, 2, 3].map((d) => (
                        <Button
                          key={d}
                          size="sm"
                          variant={
                            Number(value.days) === d ? "primary" : "outline-primary"
                          }
                          onClick={() => onPatch({ days: d })}
                        >
                          {d}d — {formatCurrency(perDayRate() * d)}
                        </Button>
                      ))}
                    </div>
                    <Form.Control
                      type="number"
                      min="0"
                      step="1"
                      value={value.days}
                      onChange={(e) =>
                        onPatch({ days: Number(e.target.value) || 0 })
                      }
                    />
                    <Form.Text muted>
                      Per day {formatCurrency(perDayRate())} → deduction{" "}
                      <strong>{formatCurrency(effectiveNewAmount())}</strong>
                    </Form.Text>
                  </Form.Group>
                ) : (
                  <Form.Group className="mb-0">
                    <Form.Label className="small">Amount (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      placeholder="0"
                      value={value.newCorrectionAmount || ""}
                      onChange={(e) =>
                        onPatch({
                          newCorrectionAmount: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </Form.Group>
                )}
              </Card.Body>
            </Card>
          )}

          {addKind === "other" && (
            <Card className="border-info mb-3">
              <Card.Body className="py-3">
                <h6 className="mb-2">
                  <FaCoins className="me-1 text-info" />
                  Other adjustment
                </h6>
                <Form.Group className="mb-2">
                  <Form.Label className="small">Type</Form.Label>
                  <Form.Select
                    value={value.newCorrectionType}
                    onChange={(e) =>
                      onPatch({ newCorrectionType: e.target.value })
                    }
                  >
                    {OTHER_ADJUSTMENT_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label className="small d-block">Amount mode</Form.Label>
                  <Form.Check
                    inline
                    type="radio"
                    id="corr-other-fixed"
                    label="Fixed (₹)"
                    name="corrOtherMode"
                    checked={value.amountMode === "fixed"}
                    onChange={() => onPatch({ amountMode: "fixed" })}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    id="corr-other-perday"
                    label="Per day (÷ 30)"
                    name="corrOtherMode"
                    checked={value.amountMode === "per_day"}
                    onChange={() => onPatch({ amountMode: "per_day" })}
                  />
                </Form.Group>
                {value.amountMode === "per_day" ? (
                  <Form.Group className="mb-0">
                    <Form.Label className="small">Days</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={value.days}
                      onChange={(e) =>
                        onPatch({ days: Number(e.target.value) || 0 })
                      }
                    />
                    <Form.Text muted>
                      Calculated: {formatCurrency(effectiveNewAmount())}
                    </Form.Text>
                  </Form.Group>
                ) : (
                  <Form.Group className="mb-0">
                    <Form.Label className="small">Amount (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={value.newCorrectionAmount || ""}
                      onChange={(e) =>
                        onPatch({
                          newCorrectionAmount: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </Form.Group>
                )}
              </Card.Body>
            </Card>
          )}

          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small text-muted">Existing adjustments</span>
            <span className="fw-semibold">
              {value.removeAllAdjustments ? (
                <>
                  <span className="text-decoration-line-through text-muted">
                    {formatCurrency(value.adjustmentsTotal)}
                  </span>
                  <span className="text-danger ms-2">→ ₹0</span>
                </>
              ) : (
                formatCurrency(value.adjustmentsTotal)
              )}
            </span>
          </div>

          {(value.adjustmentLines || []).length > 0 ? (
            <>
              <Table
                size="sm"
                responsive
                className={`payroll-correction-adj-table mb-2${
                  value.removeAllAdjustments ? " opacity-50" : ""
                }`}
              >
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount / days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {value.adjustmentLines.map((line, idx) => (
                    <tr key={line.id || idx}>
                      <td className="text-nowrap">{formatLineType(line.type)}</td>
                      <td>
                        {line.type === "leave_balance_deduction" ? (
                          <span className="text-success">
                            {line.leaveDays ?? line.payrollMeta?.daysDeducted ?? "—"}{" "}
                            day(s)
                          </span>
                        ) : (
                          <span className="text-end d-block">
                            {line.signedAmount >= 0 ? "+" : ""}
                            {formatCurrency(line.signedAmount)}
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge
                          bg={
                            line.status === "approved"
                              ? "success"
                              : line.status === "draft"
                              ? "secondary"
                              : "light"
                          }
                          text={
                            line.status === "void" ? "dark" : undefined
                          }
                        >
                          {line.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Form.Check
                type="checkbox"
                id="remove-all-adjustments"
                className="mb-2"
                checked={Boolean(value.removeAllAdjustments)}
                onChange={(e) =>
                  onPatch({ removeAllAdjustments: e.target.checked })
                }
                label="Remove all existing adjustments on save"
              />
              {value.removeAllAdjustments && (
                <Alert variant="warning" className="small py-2">
                  All non-void adjustments for this month will be voided before
                  applying changes.
                </Alert>
              )}
            </>
          ) : (
            <p className="small text-muted mb-2">No adjustments this month yet.</p>
          )}

          <Form.Group className="mt-3">
            <Form.Label className="fw-semibold">
              Correction note <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={value.note}
              onChange={(e) => onPatch({ note: e.target.value })}
              placeholder="Why HR is making this change…"
            />
          </Form.Group>
        </Col>

        <Col lg={5}>
          <Card className="payroll-correction-net-card border-0 shadow-sm sticky-top">
            <Card.Body className="text-center py-4">
              <div className="small text-muted mb-1">Net after corrections</div>
              <div className="payroll-correction-net-value">
                {formatCurrency(previewNet())}
              </div>
              <div className="small text-muted mt-3 text-start payroll-correction-net-formula">
                <span>{formatCurrency(value.monthlySalary)} monthly</span>
                <br />
                ± {formatCurrency(effectiveAdjustmentsTotal() + signedNewAmount())}{" "}
                adjustments
                {addKind === "earned_leave" &&
                  Number(value.days) > 0 && (
                    <>
                      <br />
                      <span className="text-success">
                        + {value.days} earned leave day(s) (no pay change)
                      </span>
                    </>
                  )}
                <br />− {formatCurrency(value.tdsAmount)} TDS
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SimpleSalaryCorrectionsForm;
