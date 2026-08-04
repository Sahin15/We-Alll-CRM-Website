import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Form,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import {
  downloadDualRunCsv,
  payrollRunApi,
} from "../../api/payrollRunApi";

const MONTH_NAMES = [
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

/**
 * PH-10 / R3 — month dual-run triage (V1 vs V2 nets). Does not flip PAYROLL_V2_ENGINE.
 */
const PayrollDualRun = () => {
  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear =
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [mismatchesOnly, setMismatchesOnly] = useState(true);
  const [busy, setBusy] = useState(null);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);

  const runMonth = async () => {
    try {
      setBusy("json");
      const res = await payrollRunApi.dualRunMonth(
        { month, year, mismatchesOnly },
        { mismatchesOnly }
      );
      const data = res.data?.data || {};
      setSummary(data.summary || null);
      setResults(Array.isArray(data.results) ? data.results : []);
      toast.success(res.data?.message || "Dual-run complete");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Month dual-run failed"
      );
      setSummary(null);
      setResults([]);
    } finally {
      setBusy(null);
    }
  };

  const downloadCsv = async () => {
    try {
      setBusy("csv");
      const res = await payrollRunApi.dualRunMonthCsv(
        { month, year, mismatchesOnly },
        { mismatchesOnly }
      );
      downloadDualRunCsv(res, { month, year });
      toast.success("CSV downloaded — attach to DUAL_RUN_DECISION_LOG");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "CSV export failed"
      );
    } finally {
      setBusy(null);
    }
  };

  const formatMoney = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  };

  return (
    <div className="py-2">
      <div className="mb-3">
        <h5 className="mb-1">Dual-run validation (PH-10)</h5>
        <small className="text-muted">
          Compare V1 vs V2 nets for all employees with an active salary structure.
          Keep <code>PAYROLL_V2_ENGINE=false</code> until Finance/CTO sign-off.
        </small>
      </div>

      <Alert variant="warning" className="small">
        Staging / clone only. Zero mismatched + zero failed (or every mismatch
        dispositioned in the decision log) is required before enabling the engine.
      </Alert>

      <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
        <Form.Group>
          <Form.Label className="small mb-0">Month</Form.Label>
          <Form.Select
            size="sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{ width: 140 }}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label className="small mb-0">Year</Form.Label>
          <Form.Control
            size="sm"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </Form.Group>
        <Form.Check
          type="switch"
          id="dual-run-mismatches-only"
          label="Mismatches only"
          checked={mismatchesOnly}
          onChange={(e) => setMismatchesOnly(e.target.checked)}
          className="mb-1"
        />
        <Button
          size="sm"
          variant="primary"
          disabled={Boolean(busy)}
          onClick={runMonth}
        >
          {busy === "json" ? (
            <>
              <Spinner size="sm" className="me-1" /> Running…
            </>
          ) : (
            "Run month dual-run"
          )}
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={Boolean(busy)}
          onClick={downloadCsv}
        >
          {busy === "csv" ? (
            <>
              <Spinner size="sm" className="me-1" /> Exporting…
            </>
          ) : (
            "Download CSV"
          )}
        </Button>
      </div>

      {summary && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          <Badge bg="secondary">Total {summary.total}</Badge>
          <Badge bg="success">Matched {summary.matched}</Badge>
          <Badge bg={summary.mismatched ? "danger" : "success"}>
            Mismatched {summary.mismatched}
          </Badge>
          <Badge bg={summary.failed ? "warning" : "success"}>
            Failed {summary.failed}
          </Badge>
        </div>
      )}

      {results.length === 0 && summary ? (
        <Alert variant="success" className="py-2">
          No mismatch or error rows in this view
          {mismatchesOnly ? " (mismatches-only filter on)" : ""}.
        </Alert>
      ) : results.length > 0 ? (
        <Table responsive hover size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Within ₹1</th>
              <th className="text-end">V1 net</th>
              <th className="text-end">V2 net</th>
              <th className="text-end">Diff</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.employeeId}>
                <td>
                  <code className="small">{row.employeeId}</code>
                </td>
                <td>
                  {row.error ? (
                    <Badge bg="warning">error</Badge>
                  ) : row.withinTolerance ? (
                    <Badge bg="success">yes</Badge>
                  ) : (
                    <Badge bg="danger">no</Badge>
                  )}
                </td>
                <td className="text-end">{formatMoney(row.v1Net)}</td>
                <td className="text-end">{formatMoney(row.v2Net)}</td>
                <td className="text-end">{formatMoney(row.netDiff)}</td>
                <td className="small text-danger">{row.error || "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="light" className="border small">
          Choose a closed payroll month with real structures + attendance, then
          run dual-run. Attach the CSV to{" "}
          <code>docs/.../DUAL_RUN_DECISION_LOG.md</code> for PH-11 sign-off.
        </Alert>
      )}
    </div>
  );
};

export default PayrollDualRun;
