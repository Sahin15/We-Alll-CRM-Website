import { useCallback, useEffect, useState } from "react";
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
  downloadBlobResponse,
  payrollReportApi,
} from "../../api/payrollReportApi";
import { payrollPeriodApi } from "../../api/payrollPeriodApi";

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

const REGISTER_BUTTONS = [
  { id: "pf", label: "PF register" },
  { id: "esi", label: "ESI register" },
  { id: "pt", label: "PT register" },
  { id: "tds", label: "TDS register" },
];

/**
 * Bank NEFT + compliance register downloads and export history (R4).
 */
const PayrollExports = () => {
  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear =
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [status, setStatus] = useState("approved");
  const [capabilities, setCapabilities] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [gate, setGate] = useState(null);

  const periodParams = { month, year, status };
  const exportBlocked = Boolean(gate?.enabled && !gate?.allowed?.export);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await payrollReportApi.getExportHistory({
        month,
        year,
        limit: 50,
      });
      setHistory(res.data?.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to load export history"
      );
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [month, year]);

  useEffect(() => {
    (async () => {
      try {
        const res = await payrollReportApi.getCapabilities();
        const data = res.data?.data;
        setCapabilities(data || null);
        if (data?.defaultBankExportStatus) {
          setStatus(data.defaultBankExportStatus);
        }
      } catch {
        /* optional — defaults still work */
      }
    })();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await payrollPeriodApi.gatesStatus({ month, year });
        if (!cancelled) setGate(res.data?.data || null);
      } catch {
        if (!cancelled) setGate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const runDownload = async (key, fn, fallbackName) => {
    if (exportBlocked) {
      toast.error(
        "Payroll period gates block export for this month. Period must be open or frozen."
      );
      return;
    }
    try {
      setBusyKey(key);
      const response = await fn();
      if (
        response.data instanceof Blob &&
        response.data.type &&
        response.data.type.includes("application/json")
      ) {
        const text = await response.data.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed.error || parsed.message || "Export failed");
      }
      downloadBlobResponse(response, fallbackName);
      toast.success("Download started");
      await loadHistory();
    } catch (error) {
      let message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Export failed";
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed.error || parsed.message || message;
        } catch {
          /* keep message */
        }
      }
      toast.error(message);
    } finally {
      setBusyKey(null);
    }
  };

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h5 className="mb-1">Payroll exports</h5>
          <small className="text-muted">
            Bank NEFT CSV and statutory registers (PF / ESI / PT / TDS)
          </small>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={loadHistory}>
          Refresh history
        </Button>
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
        <Form.Group>
          <Form.Label className="small mb-0">Month</Form.Label>
          <Form.Select
            size="sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
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
        <Form.Group>
          <Form.Label className="small mb-0">Slip status filter</Form.Label>
          <Form.Select
            size="sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {(
              capabilities?.lifecycleStatuses || [
                "approved",
                "generated",
                "paid",
                "sent",
              ]
            ).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      <Alert variant="light" className="border small">
        Default bank export status is{" "}
        <strong>{capabilities?.defaultBankExportStatus || "approved"}</strong>.
        Change the filter if your slips still use V1 statuses (e.g.{" "}
        <code>generated</code>).
      </Alert>

      {exportBlocked && (
        <Alert variant="warning" className="py-2">
          Period gates are on
          {gate?.status ? ` (status: ${gate.status})` : " (period not opened)"}
          . Exports require an <strong>open</strong> or <strong>frozen</strong>{" "}
          pay period.
        </Alert>
      )}

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button
          variant="primary"
          disabled={busyKey === "neft" || exportBlocked}
          onClick={() =>
            runDownload(
              "neft",
              () => payrollReportApi.downloadBankNeft(periodParams),
              `bank-neft-${year}-${pad(month)}.csv`
            )
          }
        >
          {busyKey === "neft" ? "Exporting…" : "Download bank NEFT CSV"}
        </Button>
        {REGISTER_BUTTONS.map((reg) => (
          <Button
            key={reg.id}
            variant="outline-primary"
            disabled={busyKey === reg.id || exportBlocked}
            onClick={() =>
              runDownload(
                reg.id,
                () =>
                  payrollReportApi.downloadRegister(reg.id, periodParams),
                `${reg.id}-register-${year}-${pad(month)}.csv`
              )
            }
          >
            {busyKey === reg.id ? "Exporting…" : reg.label}
          </Button>
        ))}
      </div>

      <h6>Export history</h6>
      {loadingHistory ? (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" />
        </div>
      ) : history.length === 0 ? (
        <Alert variant="light" className="border">
          No exports recorded for this month/year yet.
        </Alert>
      ) : (
        <Table responsive hover size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Type</th>
              <th>Period</th>
              <th>Status filter</th>
              <th>Employees</th>
              <th>Amount</th>
              <th>By</th>
              <th>When</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row._id || `${row.exportType}-${row.generatedAt}`}>
                <td>
                  <code className="small">{row.exportType}</code>
                </td>
                <td>
                  {row.payrollPeriod?.month && row.payrollPeriod?.year
                    ? `${MONTH_NAMES[row.payrollPeriod.month - 1] || row.payrollPeriod.month} ${row.payrollPeriod.year}`
                    : "—"}
                </td>
                <td>{row.payrollStatusFilter || "—"}</td>
                <td>{row.employeeCount ?? "—"}</td>
                <td>
                  {row.totalAmount != null
                    ? new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(row.totalAmount)
                    : "—"}
                </td>
                <td className="small">
                  {row.generatedBy?.name || row.generatedBy?.email || "—"}
                </td>
                <td className="small text-muted">
                  {row.generatedAt
                    ? new Date(row.generatedAt).toLocaleString()
                    : "—"}
                </td>
                <td>
                  <Badge
                    bg={
                      row.exportStatus === "completed"
                        ? "success"
                        : row.exportStatus === "failed"
                          ? "danger"
                          : "secondary"
                    }
                  >
                    {row.exportStatus || "—"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default PayrollExports;
