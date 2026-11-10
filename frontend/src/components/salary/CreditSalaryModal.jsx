import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Form,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { creditSalaryApi } from "../../api/payrollSimpleApi";

const formatInr = (amount) => {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const formatDisplayDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * HR selects employees to credit salary and generate official payslips.
 *
 * @param {object} props
 * @param {boolean} props.show
 * @param {() => void} props.onHide
 * @param {number} props.month
 * @param {number} props.year
 * @param {string|Date|null} props.paymentDate
 * @param {string} props.periodLabel
 * @param {Array} props.rosterRows
 * @param {boolean} [props.requirePreviewOnly] - SMB default: only rows with preview
 * @param {() => void} [props.onSuccess]
 */
const CreditSalaryModal = ({
  show,
  onHide,
  month,
  year,
  paymentDate,
  periodLabel,
  rosterRows,
  requirePreviewOnly = true,
  onSuccess,
}) => {
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [regenerate, setRegenerate] = useState(false);

  const eligibleRows = useMemo(() => {
    let rows = (rosterRows || []).filter(
      (row) => row.hasStructure && row.employee?._id
    );
    if (requirePreviewOnly) {
      rows = rows.filter((row) => row.hasPreview !== false);
    }
    return rows;
  }, [rosterRows, requirePreviewOnly]);

  useEffect(() => {
    if (!show) {
      setSelected(new Set());
      setResult(null);
      setRegenerate(false);
      return;
    }
    const preselect = eligibleRows
      .filter((row) => !row.hasSlip)
      .map((row) => String(row.employee._id));
    setSelected(new Set(preselect));
  }, [show, eligibleRows]);

  const estimatedNet = useMemo(() => {
    let total = 0;
    for (const row of eligibleRows) {
      const id = String(row.employee?._id);
      if (!selected.has(id)) continue;
      total += Number(row.netSalary) || 0;
    }
    return total;
  }, [eligibleRows, selected]);

  const toggleOne = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(
      new Set(eligibleRows.map((r) => String(r.employee._id)))
    );
  };

  const handleSubmit = async () => {
    if (!paymentDate) {
      toast.error("Set a salary payment date before crediting");
      return;
    }
    const employeeIds = [...selected];
    if (employeeIds.length === 0) {
      toast.error("Select at least one employee");
      return;
    }
    setBusy(true);
    try {
      const res = await creditSalaryApi.credit({
        month,
        year,
        employeeIds,
        paymentDate:
          typeof paymentDate === "string"
            ? paymentDate
            : new Date(paymentDate).toISOString(),
        regenerate,
      });
      const data = res.data?.data;
      setResult(data);
      toast.success(
        `Credited ${data?.summary?.success ?? 0} employee(s); payslips generated`
      );
      onSuccess?.();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to credit salary"
      );
    } finally {
      setBusy(false);
    }
  };

  const allSelected =
    eligibleRows.length > 0 &&
    eligibleRows.every((r) => selected.has(String(r.employee._id)));

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Credit salary &amp; generate slips</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-muted mb-3">
          Pay period <strong>{periodLabel}</strong> · Payment date{" "}
          <strong>{formatDisplayDate(paymentDate)}</strong>
        </p>
        <Alert variant="info" className="small py-2">
          This creates official payslips for selected employees only. Salary
          breakdown / preview alone does not pay employees.
        </Alert>
        {!requirePreviewOnly && (
          <Alert variant="warning" className="small py-2">
            Employees without a saved preview may use live payroll numbers from
            structure and adjustments.
          </Alert>
        )}

        {result ? (
          <div className="mb-3">
            <p className="mb-2">
              <Badge bg="success" className="me-2">
                {result.summary?.success ?? 0} credited
              </Badge>
              <Badge bg="warning" text="dark" className="me-2">
                {result.summary?.skipped ?? 0} skipped
              </Badge>
              <Badge bg="danger">
                {result.summary?.failed ?? 0} failed
              </Badge>
            </p>
            {result.failed?.length > 0 && (
              <ul className="small text-danger mb-0">
                {result.failed.map((f, i) => (
                  <li key={i}>
                    {f.name || f.employeeId}: {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Form.Check
                type="checkbox"
                id="credit-select-all"
                label="Select all with salary structure"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <span className="small text-muted">
                Est. net total: {formatInr(estimatedNet)} ({selected.size}{" "}
                selected)
              </span>
            </div>
            <Table responsive size="sm" className="mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: "2.5rem" }} />
                  <th>Employee</th>
                  <th className="text-end">Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {eligibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted text-center">
                      No employees with an active salary structure for this
                      period.
                    </td>
                  </tr>
                ) : (
                  eligibleRows.map((row) => {
                    const emp = row.employee || {};
                    const id = String(emp._id);
                    return (
                      <tr key={id}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={selected.has(id)}
                            disabled={busy}
                            onChange={(e) => toggleOne(id, e.target.checked)}
                            aria-label={`Select ${emp.name}`}
                          />
                        </td>
                        <td>
                          <div className="fw-medium">{emp.name}</div>
                          <div className="small text-muted">
                            {emp.employeeId}
                          </div>
                        </td>
                        <td className="text-end">{formatInr(row.netSalary)}</td>
                        <td>
                          {row.hasSlip ? (
                            <Badge bg="success">Has slip</Badge>
                          ) : row.hasPreview ? (
                            <Badge bg="info">Preview</Badge>
                          ) : (
                            <Badge bg="warning" text="dark">
                              No preview
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
            {eligibleRows.some((r) => r.hasSlip) && (
              <Form.Check
                type="checkbox"
                className="mt-2"
                id="credit-regenerate"
                label="Replace existing payslips for selected employees (regenerate)"
                checked={regenerate}
                onChange={(e) => setRegenerate(e.target.checked)}
              />
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={busy}>
          {result ? "Close" : "Cancel"}
        </Button>
        {!result && (
          <Button
            variant="success"
            disabled={busy || !paymentDate || selected.size === 0}
            onClick={handleSubmit}
          >
            {busy ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Crediting…
              </>
            ) : (
              `Credit ${selected.size} employee(s)`
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CreditSalaryModal;
