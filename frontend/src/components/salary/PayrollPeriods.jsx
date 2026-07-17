import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Form,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";
import { FaCalendarAlt, FaLock, FaUnlock, FaSnowflake, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
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

const STATUS_VARIANT = {
  open: "success",
  frozen: "info",
  locked: "warning",
  paid: "secondary",
};

/**
 * Pay-period calendar / lock controls (Payroll V2 Milestone 1).
 */
const PayrollPeriods = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);
  const [unlockReason, setUnlockReason] = useState("");

  const periodByMonth = useMemo(() => {
    const map = {};
    periods.forEach((p) => {
      map[p.month] = p;
    });
    return map;
  }, [periods]);

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const res = await payrollPeriodApi.list({ year });
      setPeriods(res.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load payroll periods");
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const runAction = async (label, fn) => {
    try {
      setBusyId(label);
      await fn();
      toast.success("Payroll period updated");
      await fetchPeriods();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = (month) =>
    runAction(`open-${month}`, () =>
      payrollPeriodApi.open({ month, year })
    );

  const handleFreeze = (period) =>
    runAction(`freeze-${period._id}`, () => payrollPeriodApi.freeze(period._id));

  const handleUnfreeze = (period) =>
    runAction(`unfreeze-${period._id}`, () =>
      payrollPeriodApi.unfreeze(period._id)
    );

  const handleLock = (period) =>
    runAction(`lock-${period._id}`, () => payrollPeriodApi.lock(period._id));

  const handleMarkPaid = (period) =>
    runAction(`paid-${period._id}`, () => payrollPeriodApi.markPaid(period._id));

  const confirmUnlock = async () => {
    if (!unlockTarget) return;
    if (!unlockReason.trim()) {
      toast.error("Unlock reason is required");
      return;
    }
    await runAction(`unlock-${unlockTarget._id}`, () =>
      payrollPeriodApi.unlock(unlockTarget._id, {
        unlockReason: unlockReason.trim(),
      })
    );
    setUnlockTarget(null);
    setUnlockReason("");
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="mb-1">
            <FaCalendarAlt className="me-2" />
            Payroll Periods
          </h5>
          <small className="text-muted">
            Open, freeze, lock, and mark paid for each calendar month. Locked
            periods require a reason to unlock.
          </small>
        </div>
        <Form.Select
          style={{ width: 120 }}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Select year"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Form.Select>
      </div>

      <Alert variant="light" className="border mb-3">
        Flow: <strong>open</strong> → <strong>frozen</strong> →{" "}
        <strong>locked</strong> → <strong>paid</strong>. Unlock returns a locked
        period to frozen.
      </Alert>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <Table responsive hover bordered className="align-middle bg-white">
          <thead className="table-light">
            <tr>
              <th>Month</th>
              <th>Status</th>
              <th>Cutoff</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MONTH_NAMES.map((name, idx) => {
              const month = idx + 1;
              const period = periodByMonth[month];
              const status = period?.status || "not_opened";

              return (
                <tr key={month}>
                  <td>
                    <strong>
                      {name} {year}
                    </strong>
                  </td>
                  <td>
                    {period ? (
                      <Badge bg={STATUS_VARIANT[status] || "secondary"}>
                        {status}
                      </Badge>
                    ) : (
                      <Badge bg="light" text="dark">
                        not opened
                      </Badge>
                    )}
                  </td>
                  <td>
                    {period?.cutoffDate
                      ? new Date(period.cutoffDate).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {!period && (
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={!!busyId}
                          onClick={() => handleOpen(month)}
                        >
                          Open
                        </Button>
                      )}
                      {status === "open" && (
                        <Button
                          size="sm"
                          variant="outline-info"
                          disabled={!!busyId}
                          onClick={() => handleFreeze(period)}
                        >
                          <FaSnowflake className="me-1" />
                          Freeze
                        </Button>
                      )}
                      {status === "frozen" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={!!busyId}
                            onClick={() => handleUnfreeze(period)}
                          >
                            Unfreeze
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-warning"
                            disabled={!!busyId}
                            onClick={() => handleLock(period)}
                          >
                            <FaLock className="me-1" />
                            Lock
                          </Button>
                        </>
                      )}
                      {status === "locked" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            disabled={!!busyId}
                            onClick={() => {
                              setUnlockTarget(period);
                              setUnlockReason("");
                            }}
                          >
                            <FaUnlock className="me-1" />
                            Unlock
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-dark"
                            disabled={!!busyId}
                            onClick={() => handleMarkPaid(period)}
                          >
                            <FaCheckCircle className="me-1" />
                            Mark Paid
                          </Button>
                        </>
                      )}
                      {status === "paid" && (
                        <span className="text-muted small">Closed</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <Modal show={!!unlockTarget} onHide={() => setUnlockTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Unlock payroll period</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            Unlock{" "}
            <strong>
              {unlockTarget
                ? `${MONTH_NAMES[unlockTarget.month - 1]} ${unlockTarget.year}`
                : ""}
            </strong>{" "}
            back to <Badge bg="info">frozen</Badge>?
          </p>
          <Form.Group>
            <Form.Label>Reason (required)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="e.g. Correct LOP for two employees"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setUnlockTarget(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmUnlock} disabled={!!busyId}>
            Unlock
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PayrollPeriods;
